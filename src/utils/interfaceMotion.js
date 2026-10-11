const ROOT_SELECTOR = '.app-shell'
const TAB_SELECTOR = '.mode-tabs'

export function installInterfaceMotion() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  let mountFrame = null
  let waitingObserver = null
  let disposeMotion = null

  const attachToTabs = (root) => {
    const tabs = root.querySelector(TAB_SELECTOR)
    if (!tabs) return false

    waitingObserver?.disconnect()
    waitingObserver = null
    disposeMotion = setupMotion(root, tabs)
    return true
  }

  const attach = () => {
    const root = document.querySelector(ROOT_SELECTOR)

    if (!root) {
      mountFrame = window.requestAnimationFrame(attach)
      return
    }

    if (attachToTabs(root)) return

    waitingObserver = new MutationObserver(() => attachToTabs(root))
    waitingObserver.observe(root, { childList: true, subtree: true })
  }

  mountFrame = window.requestAnimationFrame(attach)

  return () => {
    if (mountFrame) window.cancelAnimationFrame(mountFrame)
    waitingObserver?.disconnect()
    disposeMotion?.()
  }
}

function setupMotion(root, tabs) {
  let indicatorFrame = null
  let readyFrame = null
  let resizeObserver = null
  let destroyed = false

  const updateIndicator = ({ initial = false } = {}) => {
    if (indicatorFrame !== null) window.cancelAnimationFrame(indicatorFrame)

    indicatorFrame = window.requestAnimationFrame(() => {
      indicatorFrame = null
      if (destroyed) return
      const activeButton = tabs.querySelector('button[aria-selected="true"]')
      if (!activeButton) return

      tabs.style.setProperty('--tab-indicator-x', `${activeButton.offsetLeft}px`)
      tabs.style.setProperty('--tab-indicator-width', `${activeButton.offsetWidth}px`)
      // 首屏先把滑块定位到选中标签，再显示，避免从 x=0 闪入。
      if (initial) {
        readyFrame = window.requestAnimationFrame(() => {
          if (!destroyed) tabs.classList.add('tabs-ready')
        })
      } else {
        tabs.classList.add('tabs-ready')
      }
    })
  }

  // 监听 aria-selected / 数量徽章增减，按钮长度变化也能重新对齐指示器。
  const observer = new MutationObserver(() => updateIndicator())
  observer.observe(tabs, {
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-selected'],
    childList: true,
    characterData: true,
  })

  const resize = () => updateIndicator()
  window.addEventListener('resize', resize, { passive: true })
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(tabs)
    tabs.querySelectorAll('button[role="tab"]').forEach((button) => resizeObserver.observe(button))
  }

  root.dataset.motionReady = 'true'
  updateIndicator({ initial: true })
  document.fonts?.ready.then(() => {
    if (!destroyed) updateIndicator()
  })

  return () => {
    destroyed = true
    observer.disconnect()
    resizeObserver?.disconnect()
    window.removeEventListener('resize', resize)
    if (indicatorFrame !== null) window.cancelAnimationFrame(indicatorFrame)
    if (readyFrame !== null) window.cancelAnimationFrame(readyFrame)
    tabs.classList.remove('tabs-ready')
    tabs.style.removeProperty('--tab-indicator-x')
    tabs.style.removeProperty('--tab-indicator-width')
    delete root.dataset.motionReady
  }
}
