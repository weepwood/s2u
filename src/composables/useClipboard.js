import { ref } from 'vue'

// 即使浏览器没有 Clipboard API，也统一以 Promise 拒绝报告失败。
export async function writeClipboardText(value, clipboard = globalThis.navigator?.clipboard) {
  if (typeof clipboard?.writeText !== 'function') throw new Error('Clipboard API unavailable')
  await clipboard.writeText(value)
}

export function useClipboard() {
  const copyText = ref('Copy')
  let copyTimer = null

  async function copyToClipboard(url, onSuccess) {
    try {
      await writeClipboardText(url)
      copyText.value = 'Copied!'
      if (onSuccess) onSuccess()
      scheduleReset(1200)
    } catch {
      copyText.value = 'Failed'
      scheduleReset(1500)
    }
  }

  function scheduleReset(delay) {
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copyText.value = 'Copy'
    }, delay)
  }

  function cleanup() {
    if (copyTimer) {
      clearTimeout(copyTimer)
      copyTimer = null
    }
  }

  return { copyText, copyToClipboard, cleanup }
}
