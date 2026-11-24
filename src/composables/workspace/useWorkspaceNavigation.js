import { ref, nextTick } from 'vue'

export function useWorkspaceNavigation({ url, urlError, copy }) {
  const commandPaletteOpen = ref(false)
  const helpOpen = ref(false)
  const helpTrigger = ref(null)
  const activePanel = ref('create')
  const switchDirection = ref('forward')
  const TAB_ORDER = ['create', 'history', 'common']

  function prepareLeavingPanel(element) {
    // 视觉上允许短暂重叠，但旧面板不能抢占焦点或被辅助技术当成有效页面。
    element.inert = true
    element.setAttribute('aria-hidden', 'true')
  }

  function activateEnteringPanel(element) {
    // 连续快速切换时，Vue 可能复用中途退场的节点。
    element.inert = false
    element.removeAttribute('aria-hidden')
  }

  function switchPanel(panel) {
    const nextIndex = TAB_ORDER.indexOf(panel)
    const previousIndex = TAB_ORDER.indexOf(activePanel.value)
    if (nextIndex < 0 || nextIndex === previousIndex) return
    // 在 Vue 更改面板前同步设置方向，保证首次过渡也沿正确方向滑入。
    switchDirection.value = nextIndex > previousIndex ? 'forward' : 'backward'
    activePanel.value = panel
  }

  function handleTabNavigation(event) {
    const tab = event.target instanceof Element ? event.target.closest('[role="tab"]') : null
    if (!tab || !event.currentTarget.contains(tab)) return
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return

    const activeIndex = TAB_ORDER.indexOf(activePanel.value)
    let nextIndex
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (activeIndex + 1) % TAB_ORDER.length
        break
      case 'ArrowLeft':
        nextIndex = (activeIndex + TAB_ORDER.length - 1) % TAB_ORDER.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = TAB_ORDER.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const next = TAB_ORDER[nextIndex]
    switchPanel(next)
    nextTick(() => document.getElementById(`${next}-tab`)?.focus())
  }
  function closeHelp() {
    helpOpen.value = false
    nextTick(() => helpTrigger.value?.focus())
  }

  function handleKeydown(event) {
    if (event.isComposing) return
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      if (!document.querySelector('dialog[open]')) commandPaletteOpen.value = true
      return
    }
    // 原生 modal dialog 的键盘交互优先于页面快捷键，Esc 由浏览器关闭弹窗。
    if (document.querySelector('dialog[open]')) return

    const target = event.target
    const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    const isContentEditable = target instanceof HTMLElement && target.isContentEditable

    if (event.key === '?' && !isInput && !isContentEditable && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      helpOpen.value = true
      return
    }

    if (activePanel.value === 'create' && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      copy()
      return
    }

    if (event.key === 'Escape' && isInput && activePanel.value === 'create') {
      url.value = ''
      urlError.value = ''
      return
    }

    if (
      event.key.toLowerCase() === 'h' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !isInput &&
      !isContentEditable
    ) {
      event.preventDefault()
      switchPanel(activePanel.value === 'history' ? 'create' : 'history')
    }
  }

  return { commandPaletteOpen, helpOpen, helpTrigger, activePanel, switchDirection, prepareLeavingPanel, activateEnteringPanel, switchPanel, handleTabNavigation, closeHelp, handleKeydown }
}
