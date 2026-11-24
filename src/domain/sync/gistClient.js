// 所有认证请求只发送到固定的 GitHub API origin。
export function createGistClient() {
  const controllers = new Set()
  const cancelled = new WeakSet()
  async function request(path, { token, method = 'GET', body } = {}) {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('无效 API 路径')
    const controller = new AbortController()
    let timedOut = false
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 12000)
    controllers.add(controller)
    try {
      const response = await fetch('https://api.github.com' + path, {
        method, signal: controller.signal, redirect: 'error',
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!response.ok) {
        // 不回显不可信的服务端消息或认证信息。
        const hint = response.status === 401 ? '：Token 无效或已过期，请重新创建或更换' :
          response.status === 403 ? '：请检查 Gists 读写权限（Classic 仅需 gist），或稍后重试 API 限流；无需扩大仓库权限' :
          response.status === 404 && path.startsWith('/gists/') ? '：请检查 Gist ID、归属及 Token 的 Gist 权限' : ''
        const error = new Error('GitHub API 请求失败（' + response.status + '）' + hint)
        error.status = response.status
        throw error
      }
      return response.status === 204 ? null : await response.json()
    } catch (error) {
      if (cancelled.has(controller)) throw Object.assign(new Error('请求已取消'), { name: 'AbortError' })
      if (timedOut) throw new Error('GitHub API 请求超时')
      throw error
    } finally {
      clearTimeout(timeout)
      controllers.delete(controller)
    }
  }
  function cancel() {
    for (const controller of controllers) { cancelled.add(controller); controller.abort() }
    controllers.clear()
  }
  return { request, cancel }
}

export function parseGistId(value) {
  const input = String(value || '').trim()
  if (/^[a-f\d]{5,64}$/i.test(input)) return input.toLowerCase()
  try {
    const url = new URL(input)
    if (url.origin !== 'https://gist.github.com' || url.username || url.password || url.search || url.hash) throw new Error()
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 1 || parts.length > 2 || !/^[a-f\d]{5,64}$/i.test(parts.at(-1))) throw new Error()
    return parts.at(-1).toLowerCase()
  } catch { throw new Error('请输入有效的 Gist ID 或 gist.github.com 地址') }
}
export const HISTORY_FILE = 'scheme-history.json'
export const COMMON_FILE = 's2u-common-links.json'
export const SETTINGS_FILE = 's2u-settings.json'
export function readFile(gist, name, required = true) {
  const file = gist?.files?.[name]
  if (!file && !required) return null
  if (!file || file.truncated || typeof file.content !== 'string' || !file.content) throw new Error('同步文件缺失或被截断，已停止写入：' + name)
  if (new TextEncoder().encode(file.content).length > 900000) throw new Error('同步文件超过安全大小限制：' + name)
  return file.content
}
export function encodeFile(data) {
  const content = JSON.stringify(data, null, 2)
  if (new TextEncoder().encode(content).length > 900000) throw new Error('同步文件超过 900 KB，请减少记录或图标后重试')
  return content
}
