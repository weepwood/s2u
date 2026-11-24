import { ref, watch } from 'vue'

export const DARK_MODE_STORAGE_KEY = 'dark_mode'

export function useDarkMode() {
  const STORAGE_KEY = DARK_MODE_STORAGE_KEY

  function loadDarkMode() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) return JSON.parse(saved)
    } catch {
      /* ignore */
    }
    return false
  }

  const darkMode = ref(loadDarkMode())

  watch(darkMode, (val) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch { /* 不让主题存储异常中断业务 */ }
  })

  function toggle() {
    darkMode.value = !darkMode.value
  }

  return { darkMode, toggle }
}
