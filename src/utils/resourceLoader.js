// 单个动态资源只共享当前请求和成功缓存；失败允许下一次重试。
export function createResourceLoader(importer, { timeout = 15000, isOnline = () => globalThis.navigator?.onLine !== false } = {}) {
  let pending = null
  return function load() {
    if (pending) return pending
    // 已知断网时不触发 import，避免浏览器将共享依赖的网络失败缓存到本次文档。
    if (!isOnline()) return Promise.reject(new Error('当前处于离线状态'))
    let timer
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('资源加载超时')), timeout)
    })
    const request = Promise.race([Promise.resolve().then(importer), deadline])
      .finally(() => clearTimeout(timer))
    pending = request
    request.catch(() => { if (pending === request) pending = null })
    return request
  }
}
