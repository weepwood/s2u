const ROOT_SELECTOR = '.app-shell'
const TAB_SELECTOR = '.mode-tabs'
const ACTIVE_TAB_SELECTOR = 'button.active'

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
  let activeIndex = getActiveIndex(tabs)
  let indicatorFrame = null
  let readyFrame = null
  let resizeObserver = null
  let destroyed = false

  const setDirection = (nextIndex) => {
    if (nextIndex < 0 || nextIndex === activeIndex) return
    root.dataset.switchDirection = nextIndex > activeIndex ? 'forward' : 'backward'
  }

  const updateIndicator = ({ initial = false } = {}) => {
    if (indicatorFrame) window.cancelAnimationFrame(indicatorFrame)

    indicatorFrame = window.requestAnimationFrame(() => {
      if (destroyed) return
      const activeButton = tabs.querySelector(ACTIVE_TAB_SELECTOR)
      if (!activeButton) return

      tabs.style.setProperty('--tab-indicator-x', `${activeButton.offsetLeft}px`)
      tabs.style.setProperty('--tab-indicator-width', `${activeButton.offsetWidth}px`)

      if (initial) {
        tabs.classList.remove('tabs-ready')
        readyFrame = window.requestAnimationFrame(() => tabs.classList.add('tabs-ready'))
      } else {
        tabs.classList.add('tabs-ready')
      }
    })
  }

  const handleTabClick = (event) => {
    if (!(event.target instanceof Element)) return

    const button = event.target.closest('button')
    if (!button || !tabs.contains(button)) return

    const buttons = Array.from(tabs.querySelectorAll('button'))
    const nextIndex = buttons.indexOf(button)
    setDirection(nextIndex)
  }

  const observer = new MutationObserver(() => {
    const nextIndex = getActiveIndex(tabs)
    if (nextIndex < 0 || nextIndex === activeIndex) return

    setDirection(nextIndex)
    activeIndex = nextIndex
    updateIndicator()
  })

  observer.observe(tabs, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  })

  tabs.addEventListener('click', handleTabClick)
  window.addEventListener('resize', updateIndicator, { passive: true })

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => updateIndicator())
    resizeObserver.observe(tabs)
  }

  root.dataset.motionReady = 'true'
  if (!root.dataset.switchDirection) root.dataset.switchDirection = 'forward'
  updateIndicator({ initial: true })

  document.fonts?.ready.then(() => {
    if (!destroyed) updateIndicator()
  })

  return () => {
    destroyed = true
    observer.disconnect()
    resizeObserver?.disconnect()
    tabs.removeEventListener('click', handleTabClick)
    window.removeEventListener('resize', updateIndicator)
    if (indicatorFrame) window.cancelAnimationFrame(indicatorFrame)
    if (readyFrame) window.cancelAnimationFrame(readyFrame)
    tabs.classList.remove('tabs-ready')
    tabs.style.removeProperty('--tab-indicator-x')
    tabs.style.removeProperty('--tab-indicator-width')
    delete root.dataset.motionReady
    delete root.dataset.switchDirection
  }
}

function getActiveIndex(tabs) {
  const buttons = Array.from(tabs.querySelectorAll('button'))
  return buttons.findIndex((button) => button.classList.contains('active'))
}
