const MAX_TARGET_LENGTH = 4096
const PROTOCOL_PATTERN = /^([a-zA-Z][a-zA-Z0-9+.-]*):/
const HOST_WITHOUT_PROTOCOL_PATTERN = /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|\[[0-9a-f:]+\])(?::\d+)?(?:[/?#]|$)/i
const DOMAIN_WITH_PORT_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+:\d+(?:[/?#]|$)/i
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'file:', 'blob:'])

export function normalizeTarget(input) {
  if (typeof input !== 'string') return invalid('请输入有效的 URL、域名或 URL Scheme')

  const target = input.trim()
  if (!target) return invalid('请输入目标地址')
  if (target.length > MAX_TARGET_LENGTH) return invalid('目标地址过长，请缩短后重试')
  if (hasControlCharacters(target)) return invalid('目标地址包含无效控制字符')

  if (HOST_WITHOUT_PROTOCOL_PATTERN.test(target) || DOMAIN_WITH_PORT_PATTERN.test(target)) {
    return normalizeHttpUrl(`https://${target}`)
  }

  const protocolMatch = target.match(PROTOCOL_PATTERN)
  if (protocolMatch) {
    const protocol = `${protocolMatch[1].toLowerCase()}:`
    if (BLOCKED_PROTOCOLS.has(protocol)) {
      return invalid(`出于安全原因，不支持 ${protocol} 协议`)
    }

    if (protocol === 'http:' || protocol === 'https:') {
      return normalizeHttpUrl(target)
    }

    if (/\s/.test(target)) return invalid('URL Scheme 中不能包含空格')
    return { ok: true, target, protocol }
  }

  return normalizeHttpUrl(`https://${target}`)
}

export function validateTarget(input) {
  const result = normalizeTarget(input)
  return result.ok ? '' : result.error
}

export function encodeShareLink(baseUrl, target) {
  const normalized = normalizeTarget(target)
  if (!normalized.ok) throw new TypeError(normalized.error)

  const base = normalizeBaseUrl(baseUrl)
  return `${base}/#target=${encodeURIComponent(normalized.target)}`
}

export function decodeShareTarget(hash) {
  if (typeof hash !== 'string') return ''

  const raw = hash.replace(/^#/, '')
  if (!raw) return ''

  if (raw.startsWith('target=')) {
    try {
      return new URLSearchParams(raw).get('target') ?? ''
    } catch {
      return ''
    }
  }

  try {
    return decodeURI(raw)
  } catch {
    return raw
  }
}

export function getAppBaseUrl(currentHref = globalThis.location?.href ?? 'http://localhost/') {
  const configuredBase = import.meta.env?.VITE_PUBLIC_BASE_URL || import.meta.env?.BASE_URL || '/'
  const url = new URL(configuredBase, currentHref)
  url.search = ''
  url.hash = ''
  return normalizeBaseUrl(url.toString())
}

function normalizeHttpUrl(value) {
  try {
    const url = new URL(value)
    if (!url.hostname) return invalid('请输入包含有效域名或主机名的网址')
    return { ok: true, target: url.toString(), protocol: url.protocol }
  } catch {
    return invalid('请输入有效的 URL、域名或 URL Scheme')
  }
}

function normalizeBaseUrl(value) {
  const url = new URL(value, globalThis.location?.href ?? 'http://localhost/')
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/+$/, '')
}

function hasControlCharacters(value) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code <= 31 || code === 127) return true
  }
  return false
}

function invalid(error) {
  return { ok: false, target: '', protocol: '', error }
}

export const linkCodecConstants = Object.freeze({
  maxTargetLength: MAX_TARGET_LENGTH,
  blockedProtocols: [...BLOCKED_PROTOCOLS],
})
