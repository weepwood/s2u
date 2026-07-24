const ROOT_SELECTOR = '.app-shell'
const TAB_SELECTOR = '.mode-tabs'
const ACTIVE_TAB_SELECTOR = 'button.active'
const NARRATIVE_SELECTOR = '#page-title, .hero-description'
const SWITCH_CLASS_DURATION = 520

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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let activeIndex = getActiveIndex(tabs)
  let indicatorFrame = null
  let readyFrame = null
  let switchingTimer = null
  let resizeObserver = null
  let destroyed = false

  const setDirection = (nextIndex) => {
    if (nextIndex < 0 || nextIndex === activeIndex) return
    root.dataset.switchDirection = nextIndex > activeIndex ? 'forward' : 'backward'
  }

  const markSwitching = () => {
    window.clearTimeout(switchingTimer)
    root.classList.remove('is-mode-switching')
    void root.offsetWidth
    root.classList.add('is-mode-switching')
    switchingTimer = window.setTimeout(() => {
      root.classList.remove('is-mode-switching')
    }, SWITCH_CLASS_DURATION)
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

  const animateNarrative = () => {
    if (reducedMotion.matches) return

    const direction = root.dataset.switchDirection === 'backward' ? -1 : 1
    root.querySelectorAll(NARRATIVE_SELECTOR).forEach((element, index) => {
      element.getAnimations().forEach((animation) => animation.cancel())
      element.animate(
        [
          {
            opacity: 0.25,
            transform: `translate3d(${direction * 10}px, 4px, 0)`,
            filter: 'blur(3px)',
          },
          {
            opacity: 1,
            transform: 'translate3d(0, 0, 0)',
            filter: 'blur(0)',
          },
        ],
        {
          duration: index === 0 ? 360 : 420,
          delay: index * 28,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      )
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
    markSwitching()
    updateIndicator()
    animateNarrative()
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
    window.clearTimeout(switchingTimer)
    tabs.classList.remove('tabs-ready')
    tabs.style.removeProperty('--tab-indicator-x')
    tabs.style.removeProperty('--tab-indicator-width')
    root.classList.remove('is-mode-switching')
    delete root.dataset.motionReady
    delete root.dataset.switchDirection
  }
}

function getActiveIndex(tabs) {
  const buttons = Array.from(tabs.querySelectorAll('button'))
  return buttons.findIndex((button) => button.classList.contains('active'))
}
