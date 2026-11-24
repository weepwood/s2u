import { ref } from 'vue'
import { DARK_MODE_STORAGE_KEY } from '../useDarkMode.js'
import { HISTORY_STORAGE_KEY } from '../useHistory.js'
import { COMMON_LINKS_STORAGE_KEY } from '../useCommonLinks.js'
import { makeWorkspaceBackup, parseWorkspaceBackup, planWorkspaceRestore, runWorkspaceRestore, RECOVERY_KEY, MAX_WORKSPACE_BACKUP_BYTES } from '../../domain/sync/workspaceBackup.js'

export function useWorkspaceRecovery({ workspace, cloud, historyStore, commonStore, darkMode, isBusy, isPreviewOpen, applyRemote, showToast }) {
  const { syncStatus, syncError, getLatestRecovery } = cloud
  const { storageError, load:loadHistory, inspectImport, snapshot:historySnapshot, merge:mergeHistory } = historyStore
  const { storageError:commonStorageError, load:loadCommonLinks, validateSync:validateCommonSync, syncSnapshot:commonSyncSnapshot, applySync:applyCommonSync } = commonStore
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
      if (generation !== previewGeneration || !isPreviewOpen()) return
      const incoming = parseWorkspaceBackup(raw, {inspectHistory:inspectImport, validateCommon:validateCommonSync})
      const plan = planWorkspaceRestore(currentWorkspace(), incoming, validateCommonSync)
      workspaceIncoming = incoming
      workspacePreview.value = { ...plan.summary, name:file.name }
    } catch (error) {
      if (generation === previewGeneration) workspacePreview.value = {error:error.message}
    }
  }
  function restoreWorkspace({ theme = false } = {}) {
    if (!workspaceIncoming || isBusy()) return
    if (storageError.value || commonStorageError.value) { workspacePreview.value = {error:'本机存在存储异常，已停止恢复'}; return }
    try {
      const before = currentWorkspace()
      const plan = planWorkspaceRestore(before, workspaceIncoming, validateCommonSync)
      if (!confirm('合并 ' + plan.summary.history + ' 条历史、' + plan.summary.tombstones + ' 个删除标记，新增 ' + plan.summary.added + ' 条收藏？已有同地址收藏保持不变，历史删除标记仍有效。恢复前保存快照，并暂停自动同步。')) return
      cloud.setPreferences({auto:false})
      applyRemote(() => {
        runWorkspaceRestore(workspace.storage, [HISTORY_STORAGE_KEY, COMMON_LINKS_STORAGE_KEY, DARK_MODE_STORAGE_KEY], before, () => {
          mergeHistory(plan.history)
          if (plan.commonLinks) applyCommonSync(plan.commonLinks, true)
          if (theme && plan.settings) {
            workspace.storage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(plan.settings.darkMode))
            darkMode.value = plan.settings.darkMode
          }
        }, () => { loadHistory(); loadCommonLinks(); darkMode.value = before.settings.darkMode })
      })
      cloud.markPending()
      clearWorkspacePreview()
      showToast('工作区已合并恢复，自动同步已暂停', 'success', 4000)
    } catch (error) {
      cloud.markPending()
      workspacePreview.value = {error:error.message}
    }
  }

  async function restoreGistRecovery({ index, version }) {
    const ctx = cloud.context()
    if (isBusy()) return
    try {
      const snapshot = version ? await cloud.readRevision(version) : getLatestRecovery(index)
      if (!cloud.isCurrent(ctx) || !snapshot) return
      const summary = inspectImport(snapshot)
      if (summary.invalid || (Array.isArray(snapshot?.tombstones) && summary.tombstones !== snapshot.tombstones.length)) throw new Error('备份包含无效记录或删除标记')
      if (!confirm('备份包含 ' + summary.valid + ' 条记录及 ' + summary.tombstones + ' 个删除标记。将合并到本机历史，是否继续？')) return
      if (!cloud.isCurrent(ctx) || isBusy()) throw new Error('连接已变化，请重新选择备份')
      workspace.storage.setItem('s2u_history_before_recovery', JSON.stringify(historySnapshot()))
      cloud.setPreferences({auto:false})
      applyRemote(() => mergeHistory(snapshot))
      cloud.markPending()
      showToast('已合并恢复至本机，自动同步已暂停', 'success')
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

  function saveBeforeConflict() {
    workspace.storage.setItem('s2u_workspace_before_conflict_v1', JSON.stringify(currentWorkspace()))
  }

  return { workspacePreview, clearWorkspacePreview, exportWorkspace, exportBeforeConflict, exportBeforeRestore, previewWorkspace, restoreWorkspace, restoreGistRecovery, exportGistBundle, exportGistRecovery, saveBeforeConflict }
}
