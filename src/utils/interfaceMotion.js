import { sampleSpring, SPRING_DURATION } from './springMotion.js'
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
    rootObserver = new MutationObserver(reconcile)
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
  let frame = null, readyFrame = null, motionFrame = null, destroyed = false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let state = null, trajectory = null, started = 0
  function paint(x, width) {
    tabs.style.setProperty('--tab-indicator-x', x + 'px')
    tabs.style.setProperty('--tab-indicator-width', Math.max(0, width) + 'px')
  }
  function sample(now) {
    if (!trajectory) return state
    const elapsed = now - started
    if (elapsed >= SPRING_DURATION) return { x:trajectory.x[1], width:trajectory.width[1], vx:0, vw:0 }
    const x = sampleSpring(...trajectory.x, elapsed), width = sampleSpring(...trajectory.width, elapsed)
    return { x:x.value, width:width.value, vx:x.velocity, vw:width.velocity }
  }
  function tick(now) {
    motionFrame = null
    if (destroyed || !trajectory) return
    state = sample(now)
    paint(state.x,state.width)
    if (now - started < SPRING_DURATION) motionFrame = requestAnimationFrame(tick)
    else trajectory = null
  }
  function retarget(x,width) {
    if (reduced.matches || !state) {
      if (motionFrame !== null) cancelAnimationFrame(motionFrame)
      motionFrame = null; trajectory = null
      state = {x,width,vx:0,vw:0}; paint(x,width); return
    }
    if (trajectory && trajectory.x[1] === x && trajectory.width[1] === width) return
    if (!trajectory && state.x === x && state.width === width) return
    const now = performance.now()
    state = sample(now)
    trajectory = {x:[state.x,x,state.vx],width:[state.width,width,state.vw]}
    started = now
    if (motionFrame === null) motionFrame = requestAnimationFrame(tick)
  }
  function update() {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = null
      if (destroyed) return
      const active = tabs.querySelector('button[aria-selected="true"],button[aria-pressed="true"]')
      if (!active || !tabs.offsetWidth) return
      retarget(active.offsetLeft,active.offsetWidth)
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
  reduced.addEventListener?.('change',update)
  update()
  document.fonts?.ready.then(()=>{if(!destroyed)update()})
  return () => {
    destroyed=true
    observer.disconnect()
    resizeObserver?.disconnect()
    window.removeEventListener('resize',update)
    reduced.removeEventListener?.('change',update)
    if(motionFrame!==null)cancelAnimationFrame(motionFrame)
    if(frame!==null)cancelAnimationFrame(frame)
    if(readyFrame!==null)cancelAnimationFrame(readyFrame)
    tabs.classList.remove('tabs-ready')
    tabs.style.removeProperty('--tab-indicator-x')
    tabs.style.removeProperty('--tab-indicator-width')
  }
}
