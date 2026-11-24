import { sampleSpring, SPRING_DURATION } from './springMotion.js'
const CARD_SELECTOR = '.content-card'

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
  let activeTarget = null
  let activeSpring = null
  let observedPanel = null
  let isDestroyed = false

  // 卡片从初始化开始就保持明确高度。这样新面板挂载时不会先以 auto 高度
  // 完整展开，再被脚本锁回旧高度。
  if (!reducedMotion.matches) card.style.height = `${card.offsetHeight}px`
  card.dataset.autoHeightTransition = 'true'

  const getRenderedPanel = () =>
    Array.from(card.children).find((child) =>
      child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('panel-leave-active')) ?? null

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
  }

  const cancelActiveAnimation = (currentHeight) => {
    if (!activeAnimation) return 0
    const velocity = activeSpring ? sampleSpring(...activeSpring, Number(activeAnimation.currentTime) || 0).velocity : 0
    activeAnimation.cancel()
    activeAnimation = null
    activeTarget = null
    card.style.height = `${currentHeight}px`
    activeSpring = null
    return velocity
  }

  const animateToPanel = () => {
    animationFrame = null
    if (isDestroyed) return

    const panel = getRenderedPanel()
    if (!panel) {
      if (!activeAnimation) finishAnimation()
      return
    }

    // 减少动态效果时使用自然高度，列表切换不等待下一帧解除裁切。
    if (reducedMotion.matches) {
      cancelActiveAnimation(readCurrentHeight())
      card.style.removeProperty('height')
      finishAnimation()
      return
    }
    const targetHeight = measurePanelHeight(panel)
    // 文案、toast 或观察器反复通知但高度不变时，不重启动画。
    if (activeAnimation && !reducedMotion.matches && Math.abs(targetHeight - activeTarget) < 1) return

    const currentHeight = readCurrentHeight()
    const velocity = cancelActiveAnimation(currentHeight)

    if (Math.abs(targetHeight - currentHeight) < 1) {
      card.style.height = `${targetHeight}px`
      finishAnimation()
      return
    }

    card.style.overflow = 'hidden'
    card.style.height = `${targetHeight}px`

    if (reducedMotion.matches || typeof card.animate !== 'function') {
      finishAnimation()
      return
    }

    activeSpring = [currentHeight, targetHeight, velocity]
    const frames = Array.from({length:31}, (_, i) => ({
      height: `${Math.max(0, i === 30 ? targetHeight : sampleSpring(...activeSpring, i * 16).value)}px`,
    }))
    const animation = card.animate(frames, { duration: SPRING_DURATION, easing: 'linear' })

    activeAnimation = animation
    activeTarget = targetHeight
    animation.onfinish = () => {
      if (activeAnimation !== animation) return
      activeAnimation = null
      activeTarget = null
      activeSpring = null
      finishAnimation()
    }
    animation.oncancel = () => {
      if (activeAnimation === animation) {
        activeAnimation = null
        activeTarget = null
        activeSpring = null
      }
    }
  }

  const scheduleAnimation = () => {
    if (isDestroyed) return
    if (animationFrame !== null) return

    // 在下一帧统一读取新面板的完整布局高度。此时外层卡片仍保持旧高度，
    // 因而不会把新内容的自然高度提前暴露到页面中。
    if (!reducedMotion.matches) card.style.overflow = 'hidden'
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

  // ResizeObserver covers changes in the active panel; mutation handles replacement.
  const mutationObserver = new MutationObserver(() => {
    const previous = observedPanel
    const panel = observeCurrentPanel()
    if (panel !== previous || !panelResizeObserver) scheduleAnimation()
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
  reducedMotion.addEventListener?.('change', scheduleAnimation)
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
    reducedMotion.removeEventListener?.('change', scheduleAnimation)
    card.style.removeProperty('height')
    card.style.removeProperty('overflow')
    delete card.dataset.autoHeightTransition
  }
}

function toPixels(value) {
  const pixels = Number.parseFloat(value)
  return Number.isFinite(pixels) ? pixels : 0
}
