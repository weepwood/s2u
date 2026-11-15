import { ref, watch, getCurrentInstance, onBeforeUnmount } from 'vue'

const STORAGE_KEY = 'dark_mode'
const THEME_COLORS = { light: '#f3f5f9', dark: '#0d111a' }

function loadDarkMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) return false
    const parsed = JSON.parse(saved)
    return typeof parsed === 'boolean' ? parsed : false
  } catch {
    // 站点数据被禁用或旧值损坏时，仍以浅色主题启动。
    return false
  }
}

// 同步 color-scheme（原生控件/滚动条）与 theme-color（浏览器 UI）。
// CSS 通过 :has() 读取 meta，因此页面底色也会一起切换。
function applyTheme(dark) {
  if (typeof document === 'undefined') return
  const scheme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', scheme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[scheme])
}

export function useDarkMode() {
  const darkMode = ref(loadDarkMode())

  applyTheme(darkMode.value)

  watch(darkMode, (val) => {
    applyTheme(val)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch {
      // 存储不可用时保留当前会话主题，不阻断切换。
    }
  })

  function toggle() {
    darkMode.value = !darkMode.value
  }

  function onStorage(event) {
    if (event.key !== STORAGE_KEY || typeof event.newValue !== 'string') return
    try {
      const next = JSON.parse(event.newValue)
      if (typeof next === 'boolean') darkMode.value = next
    } catch {
      // 忽略其他标签写入的损坏值。
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
    if (getCurrentInstance()) {
      onBeforeUnmount(() => window.removeEventListener('storage', onStorage))
    }
  }

  return { darkMode, toggle }
}
