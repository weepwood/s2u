import { ref } from 'vue'
import { decodeShareTarget, getTargetOpenPolicy } from '../../domain/linkCodec.js'

export function useShareRedirect({ showCloseMsg, urlError, addHistory, autoSync, showToast, notifyStorageError }) {
  const redirectPolicy = ref(null)
  const redirectAttempted = ref(false)
  let autoRedirectTimer = null

  function changeUrl(inputUrl) {
    cancelAutoRedirect()
    const policy = getTargetOpenPolicy(inputUrl)
    redirectPolicy.value = null
    redirectAttempted.value = false
    showCloseMsg.value = false

    if (!policy.ok) {
      urlError.value = policy.error
      showToast(policy.error, 'error', 4000)
      return
    }

    // 未知应用协议在明确确认前不导航，也不写入历史。
    if (policy.needsConfirmation) {
      redirectPolicy.value = policy
      showCloseMsg.value = true
      return
    }

    redirectPolicy.value = policy
    showCloseMsg.value = true
    if (policy.protocol === 'http:' || policy.protocol === 'https:') {
      attemptRedirect()
    } else {
      // 外部协议可能中断首屏 load；先让回退面板完成渲染，再自动尝试。
      // 若页面资源迟迟未完成，短超时保证不会永久等待。
      if (document.readyState === 'complete') {
        scheduleAutoRedirect()
      } else {
        window.addEventListener('load', scheduleAutoRedirect, { once: true })
        autoRedirectTimer = window.setTimeout(attemptRedirect, 1200)
      }
    }
  }

  function cancelAutoRedirect() {
    window.removeEventListener('load', scheduleAutoRedirect)
    if (autoRedirectTimer !== null) window.clearTimeout(autoRedirectTimer)
    autoRedirectTimer = null
  }

  function scheduleAutoRedirect() {
    cancelAutoRedirect()
    autoRedirectTimer = window.setTimeout(attemptRedirect, 0)
  }

  function attemptRedirect() {
    cancelAutoRedirect()
    const policy = redirectPolicy.value
    if (!policy?.ok) return

    // 手动点击时保持同步导航，不能在用户操作与 Scheme 调用之间等待网络。
    if (!redirectAttempted.value) {
      const saved = addHistory(policy.target)
      if (!saved) notifyStorageError()
      autoSync()
    }
    redirectAttempted.value = true
    try {
      window.location.replace(policy.target)
    } catch {
      showToast('无法打开此链接，请确认浏览器与目标应用支持该协议', 'error', 4000)
    }
    // 外部应用是否真正启动无法可靠检测；始终保留手动重试及复制入口。
  }

  function readShareHash() {
    cancelAutoRedirect()
    const target = decodeShareTarget(window.location.hash)
    if (target) {
      changeUrl(target)
    } else {
      showCloseMsg.value = false
      redirectPolicy.value = null
      redirectAttempted.value = false
    }
  }

  function cancelClose() {
    // 不依赖配置的公开域名，避免预览站点上的跨域 replaceState 异常。
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    readShareHash()
  }

  function startRedirectLifecycle() { window.addEventListener('hashchange', readShareHash) }
  function stopRedirectLifecycle() {
    window.removeEventListener('hashchange', readShareHash)
    cancelAutoRedirect()
  }

  return { redirectPolicy, redirectAttempted, attemptRedirect, readShareHash, cancelClose, startRedirectLifecycle, stopRedirectLifecycle }
}
