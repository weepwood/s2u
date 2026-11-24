import { ref } from 'vue'

// 即使浏览器没有 Clipboard API，也统一以 Promise 拒绝报告失败。
export async function writeClipboardText(value, clipboard = globalThis.navigator?.clipboard) {
  if (typeof clipboard?.writeText !== 'function') throw new Error('Clipboard API unavailable')
  await clipboard.writeText(value)
}

export function useClipboard({ write = writeClipboardText } = {}) {
  const copyText = ref('Copy')
  let copyTimer = null
  let sequence = 0
  let disposed = false

  async function copyToClipboard(url, onSuccess) {
    if (disposed) return false
    const attempt = ++sequence
    clearTimeout(copyTimer)
    copyText.value = 'Copy'
    try {
      await write(url)
      if (disposed) return false
      if (onSuccess) onSuccess()
      if (attempt === sequence) {
        copyText.value = 'Copied!'
        scheduleReset(1200)
      }
      return true
    } catch {
      if (!disposed && attempt === sequence) {
        copyText.value = 'Failed'
        scheduleReset(1500)
      }
      return false
    }
  }

  function scheduleReset(delay) {
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copyText.value = 'Copy'; copyTimer = null }, delay)
  }

  function cleanup() {
    disposed = true
    clearTimeout(copyTimer)
    copyTimer = null
  }

  return { copyText, copyToClipboard, cleanup }
}
