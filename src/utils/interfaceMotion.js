const ROOT_SELECTOR = '.app-shell'
const TAB_SELECTOR = '.segmented-tabs'

// 主页面与懒加载弹窗共享定位机制，每个页签组独立清理。
export function installInterfaceMotion() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}
  let frame = null, rootObserver = null
  const groups = new Map()
  const attach = () => {
    const root = document.querySelector(ROOT_SELECTOR)
    if (!root) { frame = requestAnimationFrame(attach); return }
    const reconcile = () => {
      const next = new Set(root.querySelectorAll(TAB_SELECTOR))
      for (const [tabs, dispose] of groups) if (!next.has(tabs)) { dispose(); groups.delete(tabs) }
      for (const tabs of next) if (!groups.has(tabs)) groups.set(tabs, setupMotion(tabs))
      if (groups.size) root.dataset.motionReady = 'true'
      else delete root.dataset.motionReady
    }
    reconcile()
    // 只在新增或移除页签容器时扫描，忽略列表行、搜索结果等普通 DOM 变动。
    rootObserver = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
        node.nodeType === 1 && (node.matches(TAB_SELECTOR) || node.querySelector(TAB_SELECTOR))
      ))) reconcile()
    })
    rootObserver.observe(root, { childList: true, subtree: true })
  }
  frame = requestAnimationFrame(attach)
  return () => {
    if (frame !== null) cancelAnimationFrame(frame)
    rootObserver?.disconnect()
    for (const dispose of groups.values()) dispose()
    groups.clear()
    const root = document.querySelector(ROOT_SELECTOR)
    if (root) delete root.dataset.motionReady
  }
}
function setupMotion(tabs) {
  let frame = null, readyFrame = null, destroyed = false
  function update() {
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      if (destroyed) return
      const active = tabs.querySelector('button[aria-selected="true"],button[aria-pressed="true"]')
      if (!active || !tabs.offsetWidth) return
      tabs.style.setProperty('--tab-indicator-x', active.offsetLeft + 'px')
      tabs.style.setProperty('--tab-indicator-width', active.offsetWidth + 'px')
      if (!tabs.classList.contains('tabs-ready') && readyFrame === null) {
        readyFrame = requestAnimationFrame(() => {
          readyFrame = null
          if (!destroyed) tabs.classList.add('tabs-ready')
        })
      }
    })
  }
  const observer = new MutationObserver(update)
  observer.observe(tabs,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-selected','aria-pressed']})
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
  resizeObserver?.observe(tabs)
  tabs.querySelectorAll('button').forEach(button => resizeObserver?.observe(button))
  window.addEventListener('resize',update,{passive:true})
  update()
  document.fonts?.ready.then(()=>{if(!destroyed)update()})
  return () => {
    destroyed=true
    observer.disconnect()
    resizeObserver?.disconnect()
    window.removeEventListener('resize',update)
    if(frame!==null)cancelAnimationFrame(frame)
    if(readyFrame!==null)cancelAnimationFrame(readyFrame)
    tabs.classList.remove('tabs-ready')
    tabs.style.removeProperty('--tab-indicator-x')
    tabs.style.removeProperty('--tab-indicator-width')
  }
}
