// 单个动态资源只共享当前请求和成功缓存；失败允许下一次重试。
export function createResourceLoader(importer, { timeout = 15000 } = {}) {
  let pending = null
  return function load() {
    if (pending) return pending
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
