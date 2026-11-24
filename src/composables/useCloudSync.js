import { ref } from 'vue'
import { createGistClient, parseGistId, readFile, encodeFile, HISTORY_FILE, COMMON_FILE, SETTINGS_FILE } from '../domain/sync/gistClient.js'
import { samePayload, mergeWorkspace } from '../domain/sync/syncEngine.js'
import { listBackups, saveBackup } from '../domain/sync/backupManager.js'

const LEGACY_CONFIG_KEY = 'cloud_config'
const GIST_ID_KEY = 'cloud_gist_id'
const TOKEN_SESSION_KEY = 'cloud_token_session'
const PREF_KEY = 's2u_gist_preferences_v1'
const PENDING_PREFIX = 's2u_gist_pending_'
const BASE_PREFIX = 's2u_gist_baseline_'
const OWNER_KEY = 's2u_gist_owner'
const defaults = { auto: true, delay: 3000, common: false, icons: false, theme: false }

export function useCloudSync() {
  const cloudToken = ref(''), cloudGistId = ref(''), account = ref('')
  const syncStatus = ref(''), syncError = ref(''), lastSyncTime = ref(null)
  const preferences = ref({ ...defaults }), pending = ref(false)
  const candidates = ref([]), backups = ref([]), revisions = ref([])
  const client = createGistClient()
  let generation = 0, syncTimer = null, pushPromise = null, pendingPayload = null
  let lastObservedContent = null, lastObservedFiles = {}, retryCount = 0
  let retryTask = null
  const connectionKey = () => cloudGistId.value
  const context = () => ({ generation, token: cloudToken.value, id: cloudGistId.value, account: account.value })
  const isCurrent = ctx => ctx.generation === generation && ctx.token === cloudToken.value && ctx.id === cloudGistId.value
  function assertCurrent(ctx) { if (!isCurrent(ctx)) throw Object.assign(new Error('请求已取消'), { name: 'AbortError' }) }
  function report(error) {
    if (error.name !== 'AbortError') { syncStatus.value = 'error'; syncError.value = error.message || '同步失败' }
  }
  function loadConfig() {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_CONFIG_KEY) || 'null')
      if (legacy?.token) sessionStorage.setItem(TOKEN_SESSION_KEY, legacy.token)
      if (legacy?.gistId) localStorage.setItem(GIST_ID_KEY, legacy.gistId)
      localStorage.removeItem(LEGACY_CONFIG_KEY)
      cloudToken.value = sessionStorage.getItem(TOKEN_SESSION_KEY) || ''
      cloudGistId.value = localStorage.getItem(GIST_ID_KEY) || ''
      account.value = localStorage.getItem(OWNER_KEY) || ''
      const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}')
      preferences.value = { auto: p.auto !== false, delay: [3000,5000,10000].includes(p.delay) ? p.delay : 3000, common: p.common === true, icons: p.icons === true, theme: p.theme === true }
      pending.value = localStorage.getItem(PENDING_PREFIX + connectionKey()) === '1'
    } catch { cloudToken.value = ''; syncError.value = '同步配置无法读取，请重新连接' }
    if (cloudToken.value && cloudGistId.value) { syncStatus.value = 'ready'; return true }
    return false
  }
  function setPreferences(next) {
    const p = { ...preferences.value, ...next }
    if (![3000,5000,10000].includes(p.delay)) return
    localStorage.setItem(PREF_KEY, JSON.stringify(p))
    preferences.value = p
    if (!p.auto && syncTimer) { clearTimeout(syncTimer); syncTimer = null }
  }
  function markPending(value = true) {
    pending.value = value
    if (connectionKey()) {
      try { if (value) localStorage.setItem(PENDING_PREFIX + connectionKey(), '1')
        else localStorage.removeItem(PENDING_PREFIX + connectionKey()) } catch { /* 本地业务数据仍保留 */ }
    }
  }
  function saveConfig() {
    sessionStorage.setItem(TOKEN_SESSION_KEY, cloudToken.value)
    localStorage.setItem(GIST_ID_KEY, cloudGistId.value)
    localStorage.setItem(OWNER_KEY, account.value)
  }
  async function discover(token) {
    const ctx = context()
    const user = await client.request('/user', { token })
    const result = []
    // 分页上限防止过度消耗 API 配额；也可手动指定 ID。
    for (let page = 1; page <= 10; page++) {
      const list = await client.request('/gists?per_page=100&page=' + page, { token })
      if (!Array.isArray(list)) throw new Error('Gist 列表格式异常')
      result.push(...list.filter(g => g.public === false && g.owner?.login === user.login && g.files?.[HISTORY_FILE]).map(g => ({ id: parseGistId(g.id), description: String(g.description || 'S2U 同步'), updatedAt: g.updated_at })))
      if (list.length < 100) break
    }
    assertCurrent(ctx)
    candidates.value = result
    return result
  }
  async function connect(historyData, { token = cloudToken.value, id = cloudGistId.value, create = false, validate = () => {} } = {}) {
    token = token.trim()
    if (!token) throw new Error('请输入 GitHub Token')
    cleanup()
    const attempt = generation
    syncStatus.value = 'connecting'; syncError.value = ''
    try {
      const user = await client.request('/user', { token })
      let gist
      if (create) {
        gist = await client.request('/gists', { token, method: 'POST', body: { description: 'Scheme to URL - History Sync', public: false, files: { [HISTORY_FILE]: { content: encodeFile(historyData) } } } })
        id = gist.id
      } else {
        id = parseGistId(id)
        gist = await client.request('/gists/' + encodeURIComponent(id), { token })
        if (gist.public !== false || gist.owner?.login !== user.login) throw new Error('只允许连接当前账号拥有的 Secret Gist')
        validate(JSON.parse(readFile(gist, HISTORY_FILE)))
      }
      if (generation !== attempt) throw Object.assign(new Error('请求已取消'), { name: 'AbortError' })
      cloudToken.value = token; cloudGistId.value = id; account.value = user.login
      lastObservedContent = null; lastObservedFiles = {}; lastSyncTime.value = null
      saveConfig(); markPending()
      syncStatus.value = 'ready'; return id
    } catch (error) { if (generation === attempt) report(error); throw error }
  }
  function disconnect() {
    cleanup()
    cloudToken.value = ''; syncStatus.value = ''; syncError.value = ''; lastSyncTime.value = null
    lastObservedContent = null; lastObservedFiles = {}; candidates.value = []; revisions.value = []
    try { sessionStorage.removeItem(TOKEN_SESSION_KEY); localStorage.removeItem(LEGACY_CONFIG_KEY) } catch { /* ignore */ }
    // 保留最近 Gist ID、账户与备份，方便重连，不保留 Token。
  }
  async function fetchGist(ctx, suffix = '') {
    const gist = await client.request('/gists/' + encodeURIComponent(ctx.id) + suffix, { token: ctx.token })
    assertCurrent(ctx)
    // 已认证的连接须持续验证归属及可见性；旧版已保存的会话将在首次读取时校验。
    if (gist?.public !== false || !gist.owner?.login) throw new Error('无法验证 Secret Gist 归属')
    if (ctx.account && gist.owner.login !== ctx.account) throw new Error('Gist 不属于当前连接账户')
    if (!ctx.account) {
      const user = await client.request('/user', { token: ctx.token })
      assertCurrent(ctx)
      if (user.login !== gist.owner.login) throw new Error('Gist 不属于当前 GitHub 账号')
      account.value = user.login
      localStorage.setItem(OWNER_KEY, user.login)
    }
    return gist
  }
  async function pullFromGist() {
    if (!cloudToken.value || !cloudGistId.value) return null
    const ctx = context()
    syncStatus.value = 'syncing'
    try {
      const gist = await fetchGist(ctx)
      const text = readFile(gist, HISTORY_FILE)
      const remote = JSON.parse(text)
      const files = {}
      for (const name of [COMMON_FILE, SETTINGS_FILE]) {
        if ((name === COMMON_FILE && preferences.value.common) || (name === SETTINGS_FILE && preferences.value.theme)) files[name] = readFile(gist, name, false)
      }
      lastObservedContent = text; lastObservedFiles = files
      return remote
    } catch (error) { if (isCurrent(ctx)) report(error); return null }
  }
  function prepareOptional(name, local, validate, resolve = '') {
    if (!Object.hasOwn(lastObservedFiles, name)) return null
    const raw = lastObservedFiles[name]
    const remote = raw === null ? null : validate(JSON.parse(raw))
    const key = BASE_PREFIX + connectionKey() + ':' + name
    const stored = localStorage.getItem(key)
    const base = stored ? validate(JSON.parse(stored)) : null
    return resolve === 'local' ? local : resolve === 'remote' && remote !== null ? remote : mergeWorkspace(local, remote, base)
  }
  function pushToGist(data, extras = {}) {
    if (!cloudToken.value || !cloudGistId.value) return Promise.resolve(false)
    pendingPayload = { data: JSON.parse(JSON.stringify(data)), extras: JSON.parse(JSON.stringify(extras)), ctx: context() }
    markPending()
    if (!pushPromise) {
      const task = drainPushQueue()
      pushPromise = task.finally(() => { if (pushPromise === wrapped) pushPromise = null })
      const wrapped = pushPromise
    }
    return pushPromise
  }
  async function drainPushQueue() {
    let pushed = false
    while (pendingPayload) {
      const { data, extras, ctx } = pendingPayload
      pendingPayload = null
      try {
        assertCurrent(ctx)
        const fresh = await fetchGist(ctx)
        const freshContent = readFile(fresh, HISTORY_FILE)
        if (lastObservedContent !== null && freshContent !== lastObservedContent) throw Object.assign(new Error('云端记录已被其它设备修改，本次写入已暂停；请重新同步'), { name: 'GistConflictError' })
        const files = {}, before = {}
        if (!samePayload(JSON.parse(freshContent), data)) files[HISTORY_FILE] = { content: encodeFile(data) }
        for (const [name, value] of Object.entries(extras)) {
          if (![COMMON_FILE, SETTINGS_FILE].includes(name) || !Object.hasOwn(lastObservedFiles, name)) throw new Error('未启用的同步文件')
          const raw = readFile(fresh, name, false)
          if (raw !== lastObservedFiles[name]) throw Object.assign(new Error('云端文件已被其它设备修改，请重新同步'), { name: 'GistConflictError' })
          before[name] = raw
          if (raw === null || !samePayload(JSON.parse(raw), value)) files[name] = { content: encodeFile(value) }
        }
        if (Object.keys(files).length) {
          saveBackup(ctx.id, freshContent, before)
          assertCurrent(ctx)
          await client.request('/gists/' + encodeURIComponent(ctx.id), { token: ctx.token, method: 'PATCH', body: { files } })
          const verified = await fetchGist(ctx)
          for (const [name, file] of Object.entries(files)) {
            if (!samePayload(JSON.parse(readFile(verified, name)), JSON.parse(file.content))) throw new Error('写入后验证失败，请重新同步')
          }
          lastObservedContent = readFile(verified, HISTORY_FILE)
          for (const name of Object.keys(extras)) lastObservedFiles[name] = readFile(verified, name)
        } else lastObservedContent = freshContent
        assertCurrent(ctx)
        for (const [name, value] of Object.entries(extras)) localStorage.setItem(BASE_PREFIX + ctx.id + ':' + name, encodeFile(value))
        pushed = true
        if (!pendingPayload) markPending(false)
        syncStatus.value = 'connected'; syncError.value = ''; lastSyncTime.value = Date.now(); retryCount = 0
      } catch (error) {
        if (!isCurrent(ctx)) throw Object.assign(new Error('请求已取消'), { name: 'AbortError' })
        if (pendingPayload && error.name !== 'GistConflictError') continue
        report(error); throw error
      }
    }
    return pushed
  }
  function refreshBackups() { backups.value = listBackups(connectionKey()).map(({ savedAt, remoteContent, files }) => ({ savedAt, bytes: new TextEncoder().encode(remoteContent + JSON.stringify(files || {})).length })) }
  function getLatestRecovery(index = -1) {
    const items = listBackups(connectionKey())
    const item = index < 0 ? items.at(-1) : items[index]
    return item ? JSON.parse(item.remoteContent) : null
  }
  async function loadRevisions() {
    const ctx = context()
    if (!ctx.token || !ctx.id) throw new Error('请先连接')
    const result = await client.request('/gists/' + encodeURIComponent(ctx.id) + '/commits?per_page=30', { token: ctx.token })
    assertCurrent(ctx)
    if (!Array.isArray(result)) throw new Error('版本列表格式错误')
    revisions.value = result.filter(x => /^[a-f\d]{40,64}$/i.test(x.version)).map(x => ({ version: x.version, committedAt: x.committed_at }))
  }
  async function readRevision(version) {
    if (!/^[a-f\d]{40,64}$/i.test(version)) throw new Error('版本号无效')
    return JSON.parse(readFile(await fetchGist(context(), '/' + version), HISTORY_FILE))
  }
  function scheduleAutoSync(task, delay = preferences.value.delay) {
    if (!cloudToken.value || !cloudGistId.value) return
    markPending()
    retryTask = task
    if (!preferences.value.auto || typeof task !== 'function') return
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(async () => {
      syncTimer = null
      if (globalThis.navigator?.onLine === false) return
      try {
        const ok = await task()
        if (!ok && pending.value && retryCount < 3 && /超时|请求失败（5\d\d）|fetch|network/i.test(syncError.value)) scheduleAutoSync(task, 5000 * 2 ** retryCount++)
      } catch { /* 同步错误由调用方展示 */ }
    }, delay)
  }
  function resumePending() { if (retryTask && pending.value && preferences.value.auto) scheduleAutoSync(retryTask, 0) }
  function cleanup() {
    generation++
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = null; pendingPayload = null; pushPromise = null; retryTask = null; retryCount = 0
    client.cancel()
  }
  return { cloudToken, cloudGistId, account, syncStatus, syncError, lastSyncTime, preferences, pending, candidates, backups, revisions,
    loadConfig, setPreferences, markPending, saveConfig, connect, discover, disconnect, pushToGist, pullFromGist, prepareOptional,
    getLatestRecovery, refreshBackups, loadRevisions, readRevision, scheduleAutoSync, resumePending, cleanup, context, isCurrent }
}
