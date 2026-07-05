import { ref } from 'vue'

export function useClipboard() {
  const copyText = ref('Copy')
  let copyTimer = null

  async function copyToClipboard(url, onSuccess) {
    try {
      await navigator.clipboard.writeText(url)
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
