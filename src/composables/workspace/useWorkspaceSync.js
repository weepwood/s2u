import { ref, watch, nextTick } from 'vue'
import { useWorkspaceRecovery } from './useWorkspaceRecovery.js'
import { listWorkspaces, createWorkspace, activateWorkspace } from '../../domain/storage/workspaceScope.js'
import { COMMON_FILE, SETTINGS_FILE } from '../../domain/sync/gistClient.js'

export function useWorkspaceSync({ workspace, cloud, historyStore, commonStore, darkMode, showCloseMsg, showToast, notifyStorageError }) {
  const workspaceProfiles = ref([])
  const { cloudToken, cloudGistId, syncStatus, syncError, lastSyncTime, preferences, pending, connect, disconnect, pushToGist, pullFromGist, scheduleAutoSync, cleanup: cleanupSync } = cloud
  const { inspectImport, snapshot:historySnapshot, merge:mergeHistory } = historyStore
  const { links:commonLinks, validateSync:validateCommonSync, syncSnapshot:commonSyncSnapshot, applySync:applyCommonSync } = commonStore

  function autoSync() {
    if (!showCloseMsg.value) scheduleAutoSync(() => syncGist({ silent: true }))
  }

  let syncPromise = null
  let syncRequested = false
  let activeContext = null
  let applyingRemote = false
  const showSettings = ref(false)
  const isBusy = () => !!syncPromise || ['connecting','syncing'].includes(syncStatus.value)
  function applyRemote(task) {
    const previous = applyingRemote
    applyingRemote = true
    try { return task() } finally { applyingRemote = previous }
  }
  const {
    workspacePreview, clearWorkspacePreview, exportWorkspace, exportBeforeConflict, exportBeforeRestore,
    previewWorkspace, restoreWorkspace, restoreGistRecovery, exportGistBundle, exportGistRecovery, saveBeforeConflict,
  } = useWorkspaceRecovery({workspace, cloud, historyStore, commonStore, darkMode, isBusy, isPreviewOpen:()=>showSettings.value, applyRemote, showToast})

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
          saveBeforeConflict()
        }
        applyRemote(() => {
          mergeHistory(remote)
          if (extras[COMMON_FILE]) applyCommonSync(extras[COMMON_FILE], prefs.icons)
          if (extras[SETTINGS_FILE]) darkMode.value = extras[SETTINGS_FILE].darkMode
        })
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

  function disconnectGist() {
    disconnect()
    syncPromise = null; activeContext = null; syncRequested = false
    showToast('已断开 GitHub Gist', 'info')
  }

  let syncTrigger = null
  function openSyncSettings() {
    syncTrigger = document.activeElement
    try { workspaceProfiles.value = listWorkspaces() } catch (error) { showToast(error.message || '无法读取工作区列表', 'error') }
    showSettings.value = true
  }
  function switchWorkspace(id) {
    if (id === workspace.id || isBusy()) return
    try {
      if (!confirm('切换工作区？当前数据保留，仅重新加载当前标签页；切换后需重新输入 Token。')) return
      if (!activateWorkspace(id)) return
      cleanupSync()
      window.location.reload()
    } catch (error) { showToast(error.message, 'error', 4000) }
  }
  function addWorkspace(login) {
    if (isBusy()) return
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
