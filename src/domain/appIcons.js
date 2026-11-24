// 统一本地图标解析；不请求第三方 favicon，也不接受远程 URL/SVG。
const BUILTIN_SCHEMES = new Set(['obsidian', 'weixin', 'orpheus'])
const SAFE_ICON = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/

export function appIcon({ target = '', icon = '' } = {}, base = import.meta.env?.BASE_URL || '/') {
  if (typeof icon === 'string' && icon.length <= 32768 && SAFE_ICON.test(icon)) return icon
  const scheme = typeof target === 'string' ? target.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase() : ''
  return BUILTIN_SCHEMES.has(scheme) ? base + 'icons/common-' + scheme + '.png' : ''
}

export function appInitials(value = '', target = '') {
  if (value === 'Visual Studio Code' || /^vscode:/i.test(target)) return 'VS'
  const scheme = target.match(/^([a-z][a-z\d+.-]*):/i)?.[1]
  if (value === target && scheme && !/^https?$/i.test(scheme)) return scheme.slice(0, 2).toUpperCase()
  return Array.from(value.trim()).slice(0, 2).join('').toUpperCase() || '↗'
}
