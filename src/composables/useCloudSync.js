import { ref } from 'vue'

const LEGACY_CONFIG_KEY = 'cloud_config'
const GIST_ID_KEY = 'cloud_gist_id'
const TOKEN_SESSION_KEY = 'cloud_token_session'
const GIST_FILENAME = 'scheme-history.json'
const API_BASE = 'https://api.github.com'
const REQUEST_TIMEOUT = 12000
const BACKUP_PREFIX = 's2u_gist_backup_v1_'
const MAX_BACKUPS = 3

export function useCloudSync() {
  const cloudToken = ref('')
  const cloudGistId = ref('')
  const syncStatus = ref('') // '' | 'connecting' | 'connected' | 'error'
  const syncError = ref('')
  const lastSyncTime = ref(null)

  let syncTimer = null
  let pushPromise = null
  let pendingPayload = null
  // 每次成功拉取时记住源文件的确切文本，写入前据此校验远端是否被其它设备修改。
  let lastObservedContent = null
  const activeControllers = new Set()
  const intentionallyCancelledControllers = new WeakSet()

  function loadConfig() {
    migrateLegacyConfig()

    try {
      cloudToken.value = sessionStorage.getItem(TOKEN_SESSION_KEY) || ''
      cloudGistId.value = localStorage.getItem(GIST_ID_KEY) || ''
    } catch {
      cloudToken.value = ''
      cloudGistId.value = ''
    }

    if (cloudToken.value && cloudGistId.value) {
      syncStatus.value = 'connected'
      return true
    }

    syncStatus.value = ''
    return false
  }

  function saveConfig() {
    try {
      sessionStorage.setItem(TOKEN_SESSION_KEY, cloudToken.value)
      localStorage.setItem(GIST_ID_KEY, cloudGistId.value)
      localStorage.removeItem(LEGACY_CONFIG_KEY)
      return true
    } catch {
      syncStatus.value = 'error'
      syncError.value = '浏览器无法保存同步配置'
      return false
    }
  }

  async function connect(historyData) {
    const token = cloudToken.value.trim()
    if (!token) throw new Error('请输入 GitHub Token')

    syncStatus.value = 'connecting'
    syncError.value = ''

    try {
      await githubRequest('/user', { token })

      let gistId = cloudGistId.value.trim()
      if (!gistId) {
        const gist = await githubRequest('/gists', {
          token,
          method: 'POST',
          body: {
            description: 'Scheme to URL - History Sync',
            public: false,
            files: {
              [GIST_FILENAME]: { content: JSON.stringify(historyData, null, 2) },
            },
          },
        })
        gistId = gist.id
      }

      cloudToken.value = token
      cloudGistId.value = gistId
      if (!saveConfig()) throw new Error(syncError.value)

      syncStatus.value = 'connected'
      syncError.value = ''
      lastSyncTime.value = Date.now()
      return gistId
    } catch (error) {
      setSyncError(error, '连接失败')
      throw error
    }
  }

  function disconnect() {
    cleanup()
    cloudToken.value = ''
    cloudGistId.value = ''
    syncStatus.value = ''
    syncError.value = ''
    lastSyncTime.value = null
    lastObservedContent = null

    try {
      sessionStorage.removeItem(TOKEN_SESSION_KEY)
      localStorage.removeItem(GIST_ID_KEY)
      localStorage.removeItem(LEGACY_CONFIG_KEY)
    } catch {
      // 存储不可用时，内存状态仍然已经清除。
    }
  }

  function pushToGist(data) {
    if (!cloudToken.value || !cloudGistId.value) return Promise.resolve(false)

    pendingPayload = clonePayload(data)
    if (!pushPromise) {
      pushPromise = drainPushQueue().finally(() => {
        pushPromise = null
      })
    }

    return pushPromise
  }

  async function drainPushQueue() {
    let pushed = false

    while (pendingPayload) {
      const payload = pendingPayload
      pendingPayload = null

      try {
        const gistPath = `/gists/${encodeURIComponent(cloudGistId.value)}`
        // GitHub Gist PATCH 不支持 If-Match / CAS：此检查仅缩小竞态窗口。
        const fresh = await githubRequest(gistPath, { token: cloudToken.value })
        const freshContent = fresh?.files?.[GIST_FILENAME]?.content
        if (typeof freshContent !== 'string') {
          throw new Error('Gist 历史文件缺失，已停止写入，避免覆盖现有数据')
        }
        if (lastObservedContent !== null && freshContent !== lastObservedContent) {
          const conflict = new Error('云端记录已被其它设备修改，本次写入已暂停；请重新同步以合并最新记录')
          conflict.name = 'GistConflictError'
          throw conflict
        }

        // 在覆盖远端内容之前，将远端原始快照写到本地；备份失败则中止 PATCH。
        saveRecoveryBackup(freshContent)
        const writtenContent = JSON.stringify(payload, null, 2)
        await githubRequest(gistPath, {
          token: cloudToken.value,
          method: 'PATCH',
          body: {
            files: {
              [GIST_FILENAME]: { content: writtenContent },
            },
          },
        })
        lastObservedContent = writtenContent
        pushed = true
        syncStatus.value = 'connected'
        syncError.value = ''
        lastSyncTime.value = Date.now()
      } catch (error) {
        // 请求失败时保留更新期间排入的最新快照，并优先尝试写入它。
        // 只有没有更新快照可继续时才把失败交给调用方。
        if (pendingPayload && error?.name !== 'GistConflictError') continue
        setSyncError(error, '同步失败')
        throw error
      }
    }

    return pushed
  }

  async function pullFromGist() {
    if (!cloudToken.value || !cloudGistId.value) return null

    try {
      const gist = await githubRequest(`/gists/${encodeURIComponent(cloudGistId.value)}`, {
        token: cloudToken.value,
      })
      const remoteContent = gist.files?.[GIST_FILENAME]?.content
      if (!remoteContent) throw new Error(`Gist 中缺少 ${GIST_FILENAME}`)

      const remote = JSON.parse(remoteContent)
      lastObservedContent = remoteContent
      syncStatus.value = 'connected'
      syncError.value = ''
      lastSyncTime.value = Date.now()
      return remote
    } catch (error) {
      if (!isIntentionalCancellation(error)) setSyncError(error, '拉取失败')
      return null
    }
  }

  function recoveryKey() {
    if (!cloudGistId.value) throw new Error('尚未选择 Gist')
    return BACKUP_PREFIX + cloudGistId.value
  }

  function saveRecoveryBackup(remoteContent) {
    let previous
    try {
      previous = JSON.parse(localStorage.getItem(recoveryKey()) || '[]')
      if (!Array.isArray(previous)) throw new TypeError('同步备份格式不正确')
    } catch {
      throw new Error('本地同步备份不可读取，为保护历史记录已中止云端写入')
    }
    try {
      const items = [...previous, { savedAt: Date.now(), remoteContent }].slice(-MAX_BACKUPS)
      localStorage.setItem(recoveryKey(), JSON.stringify(items))
    } catch {
      throw new Error('无法保存同步前备份，为保护远端数据已中止写入')
    }
  }

  // 返回标准历史文件，可通过现有“历史记录 → 导入”功能恢复。
  function getLatestRecovery() {
    const items = JSON.parse(localStorage.getItem(recoveryKey()) || '[]')
    if (!Array.isArray(items) || !items.length) return null
    const latest = items[items.length - 1]
    return JSON.parse(latest.remoteContent)
  }

  function scheduleAutoSync(task, delay = 2000) {
    if (!cloudToken.value || !cloudGistId.value || typeof task !== 'function') return
    if (syncTimer) clearTimeout(syncTimer)

    syncTimer = setTimeout(async () => {
      syncTimer = null
      try {
        await task()
      } catch {
        // 同步状态和错误信息由 composable 维护。
      }
    }, delay)
  }

  function cleanup() {
    if (syncTimer) {
      clearTimeout(syncTimer)
      syncTimer = null
    }

    pendingPayload = null
    for (const controller of activeControllers) {
      intentionallyCancelledControllers.add(controller)
      controller.abort()
    }
    activeControllers.clear()
  }

  async function githubRequest(path, { token, method = 'GET', body } = {}) {
    const controller = new AbortController()
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, REQUEST_TIMEOUT)
    activeControllers.add(controller)

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })

      if (!response.ok) {
        let detail = ''
        try {
          const errorBody = await response.json()
          detail = errorBody.message ? `：${errorBody.message}` : ''
        } catch {
          // 非 JSON 错误响应使用状态码信息。
        }
        throw new Error(`GitHub API 请求失败（${response.status}）${detail}`)
      }

      if (response.status === 204) return null
      return response.json()
    } catch (error) {
      if (controller.signal.aborted && intentionallyCancelledControllers.has(controller)) {
        const cancelled = new Error('请求已取消')
        cancelled.name = 'AbortError'
        throw cancelled
      }
      if (timedOut || error.name === 'AbortError') throw new Error('GitHub API 请求超时')
      throw error
    } finally {
      clearTimeout(timeout)
      activeControllers.delete(controller)
    }
  }

  function migrateLegacyConfig() {
    try {
      const raw = localStorage.getItem(LEGACY_CONFIG_KEY)
      if (!raw) return

      const config = JSON.parse(raw)
      if (config?.token) sessionStorage.setItem(TOKEN_SESSION_KEY, config.token)
      if (config?.gistId) localStorage.setItem(GIST_ID_KEY, config.gistId)
      localStorage.removeItem(LEGACY_CONFIG_KEY)
    } catch {
      try {
        localStorage.removeItem(LEGACY_CONFIG_KEY)
      } catch {
        // 忽略不可用的浏览器存储。
      }
    }
  }

  function setSyncError(error, fallback) {
    if (isIntentionalCancellation(error)) return
    syncStatus.value = 'error'
    syncError.value = error?.message || fallback
  }

  return {
    cloudToken,
    cloudGistId,
    syncStatus,
    syncError,
    lastSyncTime,
    loadConfig,
    saveConfig,
    connect,
    disconnect,
    pushToGist,
    pullFromGist,
    getLatestRecovery,
    scheduleAutoSync,
    cleanup,
  }
}

function isIntentionalCancellation(error) {
  return error?.name === 'AbortError' && error?.message === '请求已取消'
}

function clonePayload(data) {
  const clone = globalThis.structuredClone
  if (typeof clone === 'function') return clone(data)
  return JSON.parse(JSON.stringify(data))
}
