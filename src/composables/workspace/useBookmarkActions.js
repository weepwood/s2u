import { encodeShareLink, normalizeTarget } from '../../domain/linkCodec.js'
import { writeClipboardText } from '../useClipboard.js'

export function useBookmarkActions({ commonStore, commonPanel, origin, addHistory, autoSync, notifyStorageError, showToast }) {
  const { storageError:commonStorageError, save:persistCommonLink, remove:deleteCommonLink, restoreDefaults:restoreCommonLinks, renameTag:renameCommonTagStore, exportJSON:exportCommonJSON, inspectImport:inspectCommonImport, importJSON:importCommonJSON } = commonStore

  function renameCommonTag(previous,next) {
    try {
      if (renameCommonTagStore(previous,next)) {
        commonPanel.value?.finishTagEdit(next)
        showToast(next ? '标签已更新' : '标签已移除','success')
      } else if (commonStorageError.value) {
        commonPanel.value?.showTagError(commonStorageError.value)
      }
    } catch (error) { commonPanel.value?.showTagError(error.message || '标签无效') }
  }

  function exportCommonLinks() {
    try {
      const blob = new Blob([exportCommonJSON()], { type: 'application/json;charset=utf-8' })
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = 's2u-common-links-' + new Date().toISOString().slice(0, 10) + '.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(href), 1000)
      showToast('常用链接备份已导出', 'success')
    } catch {
      showToast('导出常用链接失败', 'error', 4000)
    }
  }

  async function importCommonLinks(file) {
    if (file.size > 2 * 1024 * 1024) {
      showToast('导入文件不能超过 2 MB', 'error', 4000)
      return
    }
    try {
      const imported = JSON.parse(await file.text())
      const summary = inspectCommonImport(imported)
      if (!summary.added) {
        showToast('备份中的链接已全部存在，无需重复导入')
        return
      }
      if (!confirm(`备份包含 ${summary.count} 条，预计新增 ${summary.added} 条，跳过重复 ${summary.duplicates} 条。确认追加导入？`)) return
      const added = importCommonJSON(imported)
      if (added < 0) {
        showToast(commonStorageError.value, 'error', 4000)
        return
      }
      showToast(`已导入 ${added} 条常用链接`, 'success')
    } catch (error) {
      showToast(error?.message || '备份导入失败', 'error', 4000)
    }
  }

  async function copyCommonRaw(target) {
    const normalized = normalizeTarget(target)
    if (!normalized.ok) {
      showToast(normalized.error, 'error', 4000)
      return
    }
    try {
      await writeClipboardText(normalized.target)
      showToast('原始链接已复制', 'success')
    } catch {
      showToast('复制原始链接失败，请检查剪贴板权限', 'error', 4000)
    }
  }

  function openCommonLink(target) {
    // 用户点击时直接导航到经过统一校验的原始地址，而非 s2u 分享 URL。
    // 保持同步调用，以保留浏览器启动自定义应用 Scheme 所需的用户操作上下文。
    const normalized = normalizeTarget(target)
    if (!normalized.ok) {
      showToast(normalized.error, 'error', 4000)
      return
    }
    try {
      window.location.assign(normalized.target)
    } catch {
      showToast('无法打开此链接，请确认目标应用或浏览器支持该协议', 'error', 4000)
    }
  }

  function saveHistoryBookmark(item) {
    // 使用同一收藏校验及工作区存储入口，不增加历史使用次数或触发外部跳转。
    const persisted=persistCommonLink(item)
    if(persisted)showToast('已添加到常用链接','success')
    else if(commonStorageError.value)throw new Error(commonStorageError.value)
    return persisted
  }

  function saveCommonLink(item) {
    try {
      const persisted = persistCommonLink(item)
      if (persisted) {
        commonPanel.value?.cancelEdit()
        showToast('常用链接已保存', 'success')
      } else {
        showToast(commonStorageError.value, 'error', 4000)
      }
    } catch (error) {
      commonPanel.value?.showError(error.message || '链接无效')
    }
  }

  function removeCommonLink(id) {
    if (deleteCommonLink(id)) showToast('常用链接已删除')
    else if (commonStorageError.value) showToast(commonStorageError.value, 'error', 4000)
  }

  function resetCommonLinks() {
    if (restoreCommonLinks()) showToast('已恢复默认应用', 'success')
    else showToast(commonStorageError.value, 'error', 4000)
  }

  async function copyCommonLink(item) {
    const normalized = normalizeTarget(item.target)
    if (!normalized.ok) {
      showToast(normalized.error, 'error', 4000)
      return
    }
    try {
      const shareLink = encodeShareLink(origin, normalized.target)
      await writeClipboardText(shareLink)
      const saved = addHistory(normalized.target)
      if (!saved) notifyStorageError()
      autoSync()
      showToast('已复制 ' + item.name + ' 的分享链接', 'success')
    } catch {
      showToast('复制失败，请检查浏览器剪贴板权限', 'error', 4000)
    }
  }

  return { renameCommonTag, exportCommonLinks, importCommonLinks, copyCommonRaw, openCommonLink, saveHistoryBookmark, saveCommonLink, removeCommonLink, resetCommonLinks, copyCommonLink }
}
