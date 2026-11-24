import { ref, watch, nextTick } from 'vue'
import { DARK_MODE_STORAGE_KEY } from '../useDarkMode.js'
import { HISTORY_STORAGE_KEY } from '../useHistory.js'
import { COMMON_LINKS_STORAGE_KEY } from '../useCommonLinks.js'
import { makeWorkspaceBackup, parseWorkspaceBackup, planWorkspaceRestore, runWorkspaceRestore, RECOVERY_KEY, MAX_WORKSPACE_BACKUP_BYTES } from '../../domain/sync/workspaceBackup.js'
import { listWorkspaces, createWorkspace, activateWorkspace } from '../../domain/storage/workspaceScope.js'
import { COMMON_FILE, SETTINGS_FILE } from '../../domain/sync/gistClient.js'

export function useWorkspaceSync({ workspace, cloud, historyStore, commonStore, darkMode, showCloseMsg, showToast, notifyStorageError }) {
  const workspaceProfiles = ref([])
  const { cloudToken, cloudGistId, syncStatus, syncError, lastSyncTime, preferences, pending, connect, disconnect, pushToGist, pullFromGist, scheduleAutoSync, cleanup: cleanupSync, getLatestRecovery } = cloud
  const { storageError, load:loadHistory, inspectImport, snapshot:historySnapshot, merge:mergeHistory } = historyStore
  const { links:commonLinks, storageError:commonStorageError, load:loadCommonLinks, validateSync:validateCommonSync, syncSnapshot:commonSyncSnapshot, applySync:applyCommonSync } = commonStore

  function autoSync() {
    if (!showCloseMsg.value) scheduleAutoSync(() => syncGist({ silent: true }))
  }

  let syncPromise = null
  let syncRequested = false
  let activeContext = null
  let applyingRemote = false
  const workspacePreview = ref(null)
  let workspaceIncoming = null
  let previewGeneration = 0
  function clearWorkspacePreview() { previewGeneration++; workspaceIncoming = null; workspacePreview.value = null }
  function currentWorkspace() {
    return makeWorkspaceBackup({ history: historySnapshot(), commonLinks: commonSyncSnapshot(true), darkMode: darkMode.value })
  }
  function downloadWorkspace(data, name) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})
    if (blob.size > MAX_WORKSPACE_BACKUP_BYTES) throw new Error('备份超过 8 MiB，请分别导出历史与收藏')
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href; link.download = name
    document.body.appendChild(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  }
  function exportWorkspace() {
    try {
      if (storageError.value || commonStorageError.value) throw new Error('本机存在存储异常，请先处理再导出')
      downloadWorkspace(currentWorkspace(), 's2u-workspace-backup.json')
    } catch (error) { showToast(error.message, 'error') }
  }
  function exportBeforeConflict() {
    try {
      const raw = workspace.storage.getItem('s2u_workspace_before_conflict_v1')
      if (!raw) { showToast('暂无冲突处理前快照', 'info'); return }
      downloadWorkspace(JSON.parse(raw), 's2u-before-conflict.json')
    } catch (error) { showToast(error.message, 'error') }
  }
  function exportBeforeRestore() {
    try {
      const raw = workspace.storage.getItem(RECOVERY_KEY)
      if (!raw) { showToast('暂无恢复前快照', 'info'); return }
      downloadWorkspace(JSON.parse(raw), 's2u-before-restore.json')
    } catch (error) { showToast(error.message, 'error') }
  }
  async function previewWorkspace(file) {
    clearWorkspacePreview()
    const generation = previewGeneration
    try {
      if (!file || file.size > MAX_WORKSPACE_BACKUP_BYTES) throw new Error('请选择不超过 8 MiB 的 JSON 备份')
      const raw = await file.text()
      if (generation !== previewGeneration || !showSettings.value) return
      const incoming = parseWorkspaceBackup(raw, {inspectHistory:inspectImport, validateCommon:validateCommonSync})
      const plan = planWorkspaceRestore(currentWorkspace(), incoming, validateCommonSync)
      workspaceIncoming = incoming
      workspacePreview.value = { ...plan.summary, name:file.name }
    } catch (error) {
      if (generation === previewGeneration) workspacePreview.value = {error:error.message}
    }
  }
  function restoreWorkspace({ theme = false } = {}) {
    if (!workspaceIncoming || syncPromise || ['connecting','syncing'].includes(syncStatus.value)) return
    if (storageError.value || commonStorageError.value) { workspacePreview.value = {error:'本机存在存储异常，已停止恢复'}; return }
    try {
      const before = currentWorkspace()
      const plan = planWorkspaceRestore(before, workspaceIncoming, validateCommonSync)
      if (!confirm('合并 ' + plan.summary.history + ' 条历史、' + plan.summary.tombstones + ' 个删除标记，新增 ' + plan.summary.added + ' 条收藏？已有同地址收藏保持不变，历史删除标记仍有效。恢复前保存快照，并暂停自动同步。')) return
      cloud.setPreferences({auto:false})
      applyingRemote = true
      try {
        runWorkspaceRestore(workspace.storage, [HISTORY_STORAGE_KEY, COMMON_LINKS_STORAGE_KEY, DARK_MODE_STORAGE_KEY], before, () => {
          mergeHistory(plan.history)
          if (plan.commonLinks) applyCommonSync(plan.commonLinks, true)
          if (theme && plan.settings) {
            workspace.storage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(plan.settings.darkMode))
            darkMode.value = plan.settings.darkMode
          }
        }, () => { loadHistory(); loadCommonLinks(); darkMode.value = before.settings.darkMode })
      } finally { applyingRemote = false }
      cloud.markPending()
      clearWorkspacePreview()
      showToast('工作区已合并恢复，自动同步已暂停', 'success', 4000)
    } catch (error) {
      cloud.markPending()
      workspacePreview.value = {error:error.message}
    }
  }

  function validateSettings(value) {
    if (value?.version !== 1 || typeof value.darkMode !== 'boolean') throw new Error('云端主题格式错误')
    return { version: 1, darkMode: value.darkMode }
  }
  watch(commonLinks, () => { if (!applyingRemote && preferences.value.common) autoSync() }, { deep: true, flush: 'sync' })
  watch(darkMode, () => { if (!applyingRemote && preferences.value.theme) autoSync() }, { flush: 'sync' })

  function syncGist({ silent = false, resolve = [] } = {}) {
    if (!cloudToken.value || !cloudGistId.value || showCloseMsg.value || syncStatus.value === 'connecting') return Promise.resolve(false)
    const ctx = cloud.context()
    if (syncPromise && activeContext && cloud.isCurrent(activeContext)) {
      if (Array.isArray(resolve) && resolve.length) return Promise.resolve(false)
      syncRequested = true
      return syncPromise
    }
    activeContext = ctx
    cloud.markPending()
    const task = (async () => {
      do {
        syncRequested = false
        cloud.beginConflictCheck()
        const remote = await pullFromGist()
        if (!cloud.isCurrent(ctx) || remote === null) return false
        const summary = inspectImport(remote)
        if (summary.invalid || (Array.isArray(remote?.tombstones) && summary.tombstones !== remote.tombstones.length)) throw new Error('云端历史包含无效记录或删除标记，已停止同步')
        const extras = {}
        const prefs = { ...preferences.value }
        if (prefs.common) {
          const validate = data => {
            const value = validateCommonSync(data)
            if (!prefs.icons && value.items.some(item => item.icon)) throw new Error('云端收藏包含图标，请开启图标同步或关闭收藏同步；不会覆盖云端图标')
            return value
          }
          extras[COMMON_FILE] = cloud.prepareOptional(COMMON_FILE, commonSyncSnapshot(prefs.icons), validate, resolve)
        }
        if (prefs.theme) extras[SETTINGS_FILE] = cloud.prepareOptional(SETTINGS_FILE, { version: 1, darkMode: darkMode.value }, validateSettings, resolve)
        if (!cloud.isCurrent(ctx)) return false
        cloud.assertConflictsResolved(resolve)
        // 只在所有冲突均有有效选择且当前连接仍有效时才应用本地修改。
        if (Array.isArray(resolve) && resolve.length) {
          workspace.storage.setItem('s2u_workspace_before_conflict_v1', JSON.stringify(currentWorkspace()))
        }
        applyingRemote = true
        try {
          mergeHistory(remote)
          if (extras[COMMON_FILE]) applyCommonSync(extras[COMMON_FILE], prefs.icons)
          if (extras[SETTINGS_FILE]) darkMode.value = extras[SETTINGS_FILE].darkMode
        } finally { applyingRemote = false }
        notifyStorageError()
        if (!await pushToGist(historySnapshot(), extras)) return false
        cloud.clearConflicts()
        resolve = []
      } while (syncRequested && cloud.isCurrent(ctx))
      if (!silent) showToast('云端同步完成', 'success')
      return true
    })().catch(error => {
      if (cloud.isCurrent(ctx)) { syncStatus.value = 'error'; syncError.value = error.message || '同步失败' }
      return false
    })
    const wrapped = task.finally(() => {
      if (syncPromise === wrapped) { syncPromise = null; activeContext = null; syncRequested = false }
    })
    syncPromise = wrapped
    return wrapped
  }

  async function connectGist(options) {
    try {
      await connect(historySnapshot(), { ...options, validate: data => {
        const summary = inspectImport(data)
        if (summary.invalid || (Array.isArray(data?.tombstones) && summary.tombstones !== data.tombstones.length)) throw new Error('Gist 包含无效历史记录或删除标记')
      } })
      if (await syncGist({ silent: true })) showToast('已连接 GitHub Gist', 'success')
    } catch { /* 连接错误由 composable 维护 */ }
  }

  async function testGistConnection() {
    try {
      const payload = await cloud.testConnection()
      const summary = inspectImport(payload)
      if (summary.invalid || (Array.isArray(payload?.tombstones) && summary.tombstones !== payload.tombstones.length)) throw new Error('历史文件包含无效数据')
      showToast('读取验证通过，写入权限须实际同步确认', 'success')
    } catch (error) { syncError.value = error.message || '连接检查失败' }
  }

  async function restoreGistRecovery({ index, version }) {
    const ctx = cloud.context()
    if (['connecting','syncing'].includes(syncStatus.value)) return
    try {
      const snapshot = version ? await cloud.readRevision(version) : getLatestRecovery(index)
      if (!cloud.isCurrent(ctx) || !snapshot) return
      const summary = inspectImport(snapshot)
      if (summary.invalid || (Array.isArray(snapshot?.tombstones) && summary.tombstones !== snapshot.tombstones.length)) throw new Error('备份包含无效记录或删除标记')
      if (!confirm('备份包含 ' + summary.valid + ' 条记录及 ' + summary.tombstones + ' 个删除标记。将合并到本机历史，是否继续？')) return
      if (!cloud.isCurrent(ctx) || ['connecting','syncing'].includes(syncStatus.value)) throw new Error('连接已变化，请重新选择备份')
      workspace.storage.setItem('s2u_history_before_recovery', JSON.stringify(historySnapshot()))
      mergeHistory(snapshot)
      cloud.markPending()
      showToast('已合并恢复至本机，确认后可手动同步', 'success')
    } catch (error) { if (cloud.isCurrent(ctx)) { syncError.value = error.message; syncStatus.value = 'error' } }
  }

  function exportGistBundle(index) {
    try {
      const backup = cloud.getBackupBundle(index)
      if (!backup) return
      const href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = href
      link.download = 's2u-gist-workspace-backup.json'
      link.click()
      setTimeout(() => URL.revokeObjectURL(href), 1000)
    } catch (error) { showToast(error.message || '导出备份失败', 'error', 4000) }
  }

  function exportGistRecovery(index = -1) {
    try {
      const snapshot = getLatestRecovery(index)
      if (!snapshot) {
        showToast('目前没有同步前备份，首次成功推送后会自动保留', 'info', 4000)
        return
      }
      // 导出标准 s2u-history JSON，可用历史记录“导入”功能尝试恢复。
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = 's2u-gist-backup-' + new Date().toISOString().slice(0, 10) + '.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(href), 1000)
      showToast('同步前备份已导出，请妥善保管历史数据', 'success')
    } catch (error) {
      showToast(error?.message || '无法导出同步备份', 'error', 4000)
    }
  }

  function disconnectGist() {
    disconnect()
    syncPromise = null; activeContext = null; syncRequested = false
    showToast('已断开 GitHub Gist', 'info')
  }

  const showSettings = ref(false)
  let syncTrigger = null
  function openSyncSettings() {
    syncTrigger = document.activeElement
    try { workspaceProfiles.value = listWorkspaces() } catch (error) { showToast(error.message || '无法读取工作区列表', 'error') }
    showSettings.value = true
  }
  function switchWorkspace(id) {
    if (id === workspace.id || syncPromise || ['connecting','syncing'].includes(syncStatus.value)) return
    try {
      if (!confirm('切换工作区？当前数据保留，仅重新加载当前标签页；切换后需重新输入 Token。')) return
      if (!activateWorkspace(id)) return
      cleanupSync()
      window.location.reload()
    } catch (error) { showToast(error.message, 'error', 4000) }
  }
  function addWorkspace(login) {
    if (syncPromise || ['connecting','syncing'].includes(syncStatus.value)) return
    try {
      const id = createWorkspace(login)
      workspaceProfiles.value = listWorkspaces()
      switchWorkspace(id)
    } catch (error) { showToast(error.message, 'error', 4000) }
  }
  function closeSyncSettings() { showSettings.value = false; clearWorkspacePreview(); nextTick(() => syncTrigger?.isConnected && syncTrigger.focus()) }
  let initialSyncIdle = null
  let initialSyncFallback = null
  function onSyncFocus(event) {
    const transientError = /超时|请求失败（5\d\d）|fetch|network/i.test(syncError.value)
    const retryOnline = event?.type === 'online' && syncStatus.value === 'error' && transientError
    if (!showCloseMsg.value && cloudToken.value && preferences.value.auto &&
        !['connecting','syncing'].includes(syncStatus.value) && (syncStatus.value !== 'error' || retryOnline) &&
        (pending.value || Date.now() - (lastSyncTime.value || 0) > 60000)) {
      syncGist({ silent: true })
    }
  }
  function scheduleInitialSync() {
    if (!preferences.value.auto) return
    if ('requestIdleCallback' in window) {
      initialSyncIdle = window.requestIdleCallback(() => {
        initialSyncIdle = null
        if (preferences.value.auto) syncGist({ silent: true }).catch(() => {})
      }, { timeout: 2000 })
    } else {
      initialSyncFallback = window.setTimeout(() => {
        initialSyncFallback = null
        if (preferences.value.auto) syncGist({ silent: true }).catch(() => {})
      }, 800)
    }
  }

  function stopSyncLifecycle() {
    clearWorkspacePreview()
    if (initialSyncIdle !== null) window.cancelIdleCallback(initialSyncIdle)
    if (initialSyncFallback !== null) window.clearTimeout(initialSyncFallback)
    window.removeEventListener('online', onSyncFocus)
    window.removeEventListener('focus', onSyncFocus)
    cleanupSync()
  }
  function startSyncLifecycle() {
    window.addEventListener('online', onSyncFocus)
    window.addEventListener('focus', onSyncFocus)
  }

  return { workspaceProfiles, showSettings, openSyncSettings, closeSyncSettings, switchWorkspace, addWorkspace, autoSync, workspacePreview, clearWorkspacePreview, exportWorkspace, exportBeforeConflict, exportBeforeRestore, previewWorkspace, restoreWorkspace, syncGist, connectGist, testGistConnection, restoreGistRecovery, exportGistBundle, exportGistRecovery, disconnectGist, scheduleInitialSync, startSyncLifecycle, stopSyncLifecycle }
}
