import { computed, watch } from 'vue'
import { encodeShareLink, normalizeTarget } from '../../domain/linkCodec.js'
import { useClipboard, writeClipboardText } from '../useClipboard.js'

export function useCreateLinkActions({ url, urlError, qrShareUrl, history, origin, addHistory, autoSync, notifyStorageError, showToast, write = writeClipboardText }) {
  const { copyText, copyToClipboard, cleanup: cleanupClipboard } = useClipboard({ write })
  let revision = 0
  const stop = watch(url, () => { revision++ }, { flush: 'sync' })

  const toUrl = computed(() => {
    if (!url.value.trim()) return ''
    try {
      return encodeShareLink(origin, url.value)
    } catch {
      return ''
    }
  })

  const recentLinks = computed(() =>
    history.value.slice(0, 20).flatMap((item) => {
      try {
        const normalized = normalizeTarget(item.scheme)
        if (!normalized.ok) return []
        // 展示真实目标，分享地址仅用于原有复制及打开操作。
        return [{ target: normalized.target, shareUrl: encodeShareLink(origin, normalized.target) }]
      } catch {
        return []
      }
    }),
  )

  function gotoUrl(fullUrl) {
    if (!fullUrl) return
    // 剪贴板不可用不能阻断打开；保持 window.open 在用户点击的同步调用栈内。
    write(fullUrl).catch(() => showToast('未能复制分享链接，请检查剪贴板权限', 'error', 4000))
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  }

  function toHistoryUrl(scheme) {
    const normalized = normalizeTarget(scheme)
    if (!normalized.ok) {
      showToast(normalized.error, 'error', 4000)
      return
    }

    write(encodeShareLink(origin, normalized.target)).catch(() => showToast('未能复制分享链接，请检查剪贴板权限', 'error', 4000))
    window.open(normalized.target, '_blank', 'noopener,noreferrer')
  }

  function openQrShare(shareUrl) {
    // 避免外部事件注入二维码内容。
    if (shareUrl && shareUrl === toUrl.value) qrShareUrl.value = shareUrl
  }

  function copy() {
    const submittedUrl = url.value
    const submittedRevision = revision
    const normalized = normalizeTarget(submittedUrl)
    if (!normalized.ok) {
      urlError.value = normalized.error
      return
    }

    const shareLink = encodeShareLink(origin, normalized.target)
    return copyToClipboard(shareLink, () => {
      const saved = addHistory(normalized.target)
      if (!saved) notifyStorageError()
      // 剪贴板写入可能等待权限；不能清除等待期间用户编辑的新地址。
      if (revision === submittedRevision && url.value === submittedUrl) {
        url.value = ''
        urlError.value = ''
      }
      autoSync()
    })
  }

  function cleanup() { stop(); cleanupClipboard() }
  return { toUrl, recentLinks, copyText, copy, gotoUrl, toHistoryUrl, openQrShare, cleanup }
}
