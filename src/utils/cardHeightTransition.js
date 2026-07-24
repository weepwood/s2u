const CARD_SELECTOR = '.content-card'
const TRANSITION_DURATION = 420
const TRANSITION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

export function installCardHeightTransition() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  let disposeCard = null
  let mountFrame = null

  const attach = () => {
    const card = document.querySelector(CARD_SELECTOR)
    if (!card) {
      mountFrame = window.requestAnimationFrame(attach)
      return
    }
    disposeCard = setupAutoHeight(card)
  }

  mountFrame = window.requestAnimationFrame(attach)

  return () => {
    if (mountFrame) window.cancelAnimationFrame(mountFrame)
    disposeCard?.()
  }
}

function setupAutoHeight(card) {
  if (card.dataset.autoHeightTransition === 'true') return () => {}

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let animationFrame = null
  let resizeTimer = null
  let activeAnimation = null
  let observedPanel = null
  let isDestroyed = false

  // 卡片从初始化开始就保持明确高度。这样新面板挂载时不会先以 auto 高度
  // 完整展开，再被脚本锁回旧高度。
  card.style.height = `${card.offsetHeight}px`
  card.dataset.autoHeightTransition = 'true'

  const getRenderedPanel = () =>
    Array.from(card.children).find((child) => child.nodeType === Node.ELEMENT_NODE) ?? null

  const readCurrentHeight = () => {
    const height = Number.parseFloat(window.getComputedStyle(card).height)
    return Number.isFinite(height) ? height : card.offsetHeight
  }

  const measurePanelHeight = (panel) => {
    if (!panel) return readCurrentHeight()

    const cardStyle = window.getComputedStyle(card)
    const panelStyle = window.getComputedStyle(panel)
    const verticalChrome =
      toPixels(cardStyle.paddingTop) +
      toPixels(cardStyle.paddingBottom) +
      toPixels(cardStyle.borderTopWidth) +
      toPixels(cardStyle.borderBottomWidth)
    const panelMargins = toPixels(panelStyle.marginTop) + toPixels(panelStyle.marginBottom)
    const minHeight = toPixels(cardStyle.minHeight)
    const panelHeight = Math.max(panel.scrollHeight, panel.offsetHeight)

    return Math.max(minHeight, Math.ceil(panelHeight + panelMargins + verticalChrome))
  }

  const finishAnimation = () => {
    card.style.removeProperty('overflow')
    card.style.removeProperty('will-change')
  }

  const cancelActiveAnimation = () => {
    if (!activeAnimation) return

    const currentHeight = readCurrentHeight()
    activeAnimation.cancel()
    activeAnimation = null
    card.style.height = `${currentHeight}px`
  }

  const animateToPanel = () => {
    animationFrame = null
    if (isDestroyed) return

    const panel = getRenderedPanel()
    if (!panel) return

    cancelActiveAnimation()

    const currentHeight = readCurrentHeight()
    const targetHeight = measurePanelHeight(panel)

    if (Math.abs(targetHeight - currentHeight) < 1) {
      card.style.height = `${targetHeight}px`
      finishAnimation()
      return
    }

    card.style.overflow = 'hidden'
    card.style.willChange = 'height'
    card.style.height = `${targetHeight}px`

    if (reducedMotion.matches || typeof card.animate !== 'function') {
      finishAnimation()
      return
    }

    const animation = card.animate(
      [{ height: `${currentHeight}px` }, { height: `${targetHeight}px` }],
      {
        duration: TRANSITION_DURATION,
        easing: TRANSITION_EASING,
      },
    )

    activeAnimation = animation
    animation.onfinish = () => {
      if (activeAnimation !== animation) return
      activeAnimation = null
      finishAnimation()
    }
    animation.oncancel = () => {
      if (activeAnimation === animation) activeAnimation = null
    }
  }

  const scheduleAnimation = () => {
    if (isDestroyed) return
    if (animationFrame) window.cancelAnimationFrame(animationFrame)

    // 在下一帧统一读取新面板的完整布局高度。此时外层卡片仍保持旧高度，
    // 因而不会把新内容的自然高度提前暴露到页面中。
    card.style.overflow = 'hidden'
    animationFrame = window.requestAnimationFrame(animateToPanel)
  }

  const panelResizeObserver =
    'ResizeObserver' in window ? new ResizeObserver(scheduleAnimation) : null

  const observeCurrentPanel = () => {
    const panel = getRenderedPanel()
    if (panel === observedPanel) return panel

    if (observedPanel) panelResizeObserver?.unobserve(observedPanel)
    observedPanel = panel
    if (observedPanel) panelResizeObserver?.observe(observedPanel)
    return panel
  }

  const mutationObserver = new MutationObserver(() => {
    const panel = observeCurrentPanel()
    if (panel) scheduleAnimation()
  })

  mutationObserver.observe(card, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  observeCurrentPanel()

  const handleResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(scheduleAnimation, 80)
  }

  window.addEventListener('resize', handleResize, { passive: true })
  document.fonts?.ready.then(() => {
    if (!isDestroyed) scheduleAnimation()
  })

  return () => {
    isDestroyed = true
    mutationObserver.disconnect()
    panelResizeObserver?.disconnect()
    if (animationFrame) window.cancelAnimationFrame(animationFrame)
    window.clearTimeout(resizeTimer)
    activeAnimation?.cancel()
    window.removeEventListener('resize', handleResize)
    card.style.removeProperty('height')
    card.style.removeProperty('overflow')
    card.style.removeProperty('will-change')
    delete card.dataset.autoHeightTransition
  }
}

function toPixels(value) {
  const pixels = Number.parseFloat(value)
  return Number.isFinite(pixels) ? pixels : 0
}
