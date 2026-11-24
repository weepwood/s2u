

export function useHistoryActions({ historyStore, showToast, notifyStorageError, autoSync }) {
  const { remove:removeHistory, clear:clearHistory, inspectImport, mergeImport:mergeImportHistory } = historyStore
  const MAX_IMPORT_SIZE = 2 * 1024 * 1024

  function deleteHistoryItem(scheme) {
    if (!removeHistory(scheme)) {
      notifyStorageError()
      return
    }
    autoSync()
    showToast('已删除记录', 'info')
  }

  function invalidHistory() {
    if (!confirm('确定清空所有历史记录？此操作不可撤销。')) return
    if (!clearHistory()) {
      notifyStorageError()
      return
    }
    autoSync()
    showToast('历史记录已清空', 'info')
  }

  function onImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.size > MAX_IMPORT_SIZE) {
      showToast('导入失败：文件不能超过 2 MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      try {
        const imported = JSON.parse(String(loadEvent.target?.result ?? ''))
        const summary = inspectImport(imported)
        if (summary.valid === 0) throw new Error('文件中没有有效记录')

        const invalidHint = summary.invalid ? `，忽略 ${summary.invalid} 条无效记录` : ''
        if (!confirm(`将合并 ${summary.valid} 条有效记录${invalidHint}，是否继续？`)) return

        const added = mergeImportHistory(imported)
        notifyStorageError()
        autoSync()
        showToast(`导入完成，新增 ${added} 条记录`, 'success')
      } catch (error) {
        showToast(`导入失败：${error.message || '文件格式不正确'}`, 'error', 4000)
      }
    }
    reader.onerror = () => showToast('导入失败：无法读取文件', 'error')
    reader.readAsText(file)
  }

  return { deleteHistoryItem, invalidHistory, onImportFile }
}
