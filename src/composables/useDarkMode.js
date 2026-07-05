import { ref, watch } from 'vue'

export function useDarkMode() {
  const STORAGE_KEY = 'dark_mode'

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  })

  function toggle() {
    darkMode.value = !darkMode.value
  }

  return { darkMode, toggle }
}
