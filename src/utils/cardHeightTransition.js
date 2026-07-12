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
  card.dataset.autoHeightTransition = 'true'

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let stableHeight = card.getBoundingClientRect().height
  let firstFrame = null
  let secondFrame = null
  let finishTimer = null
  let resizeTimer = null
  let isAnimating = false
  let isDestroyed = false

  const clearFrames = () => {
    if (firstFrame) window.cancelAnimationFrame(firstFrame)
    if (secondFrame) window.cancelAnimationFrame(secondFrame)
    firstFrame = null
    secondFrame = null
  }

  const clearFinishTimer = () => {
    if (finishTimer) window.clearTimeout(finishTimer)
    finishTimer = null
  }

  const hasRenderedPanel = () =>
    Array.from(card.children).some((child) => child.nodeType === Node.ELEMENT_NODE)

  const lockHeight = (height) => {
    card.style.transition = 'none'
    card.style.height = `${Math.max(0, height)}px`
    card.style.overflow = 'hidden'
    card.style.willChange = 'height'
    void card.offsetHeight
  }

  const finish = () => {
    clearFinishTimer()
    card.style.removeProperty('height')
    card.style.removeProperty('overflow')
    card.style.removeProperty('will-change')
    card.style.removeProperty('transition')
    isAnimating = false
    stableHeight = card.getBoundingClientRect().height
  }

  const measureNaturalHeight = () => {
    const previousHeight = card.style.height
    const previousTransition = card.style.transition
    card.style.transition = 'none'
    card.style.height = 'auto'
    const height = card.getBoundingClientRect().height
    card.style.height = previousHeight
    card.style.transition = previousTransition
    return height
  }

  const animateToContent = () => {
    if (isDestroyed || !hasRenderedPanel()) return

    if (reducedMotion.matches) {
      finish()
      return
    }

    const currentHeight = isAnimating ? card.getBoundingClientRect().height : stableHeight
    lockHeight(currentHeight)
    const targetHeight = measureNaturalHeight()
    lockHeight(currentHeight)

    if (Math.abs(targetHeight - currentHeight) < 1) {
      finish()
      return
    }

    isAnimating = true
    stableHeight = targetHeight
    card.style.transition = `height ${TRANSITION_DURATION}ms ${TRANSITION_EASING}`
    card.style.height = `${targetHeight}px`
    finishTimer = window.setTimeout(finish, TRANSITION_DURATION + 80)
  }

  const scheduleAnimation = () => {
    clearFrames()
    clearFinishTimer()

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(animateToContent)
    })
  }

  const observer = new MutationObserver(() => {
    if (!hasRenderedPanel()) {
      const currentHeight = isAnimating ? card.getBoundingClientRect().height : stableHeight
      lockHeight(currentHeight)
      isAnimating = false
      return
    }
    scheduleAnimation()
  })

  observer.observe(card, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  const handleTransitionEnd = (event) => {
    if (event.target === card && event.propertyName === 'height') finish()
  }

  const handleResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      clearFrames()
      finish()
    }, 120)
  }

  card.addEventListener('transitionend', handleTransitionEnd)
  window.addEventListener('resize', handleResize, { passive: true })

  return () => {
    isDestroyed = true
    observer.disconnect()
    clearFrames()
    clearFinishTimer()
    window.clearTimeout(resizeTimer)
    card.removeEventListener('transitionend', handleTransitionEnd)
    window.removeEventListener('resize', handleResize)
    finish()
    delete card.dataset.autoHeightTransition
  }
}
