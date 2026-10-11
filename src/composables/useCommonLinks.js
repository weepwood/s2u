import { ref } from 'vue'
import { normalizeTarget } from '../domain/linkCodec.js'

const STORAGE_KEY = 's2u_common_links_v1'
const VERSION = 1
const MAX_LINKS = 50
const MAX_NAME_LENGTH = 36

export const DEFAULT_COMMON_LINKS = Object.freeze([
  { id: 'obsidian', name: 'Obsidian', target: 'obsidian://' },
  { id: 'vscode', name: 'Visual Studio Code', target: 'vscode://' },
  { id: 'weixin', name: '微信', target: 'weixin://' },
  { id: 'orpheus', name: '网易云音乐', target: 'orpheus://' },
])

function defaultItems() {
  return DEFAULT_COMMON_LINKS.map((item) => ({ ...item }))
}

function normalizeItem(input) {
  if (!input || typeof input !== 'object') return null
  if (typeof input.id !== 'string' || input.id.length > 120 || !input.id) return null
  if (typeof input.name !== 'string') return null

  const name = input.name.trim()
  if (!name || name.length > MAX_NAME_LENGTH) return null

  const normalized = normalizeTarget(input.target)
  if (!normalized.ok) return null
  return { id: input.id, name, target: normalized.target }
}

export function useCommonLinks() {
  const links = ref(defaultItems())
  const storageError = ref('')

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) {
        links.value = defaultItems()
        storageError.value = ''
        return
      }

      const payload = JSON.parse(raw)
      if (payload?.version !== VERSION || !Array.isArray(payload.items) || payload.items.length > MAX_LINKS) {
        throw new TypeError('常用链接存储格式不正确')
      }

      const seenIds = new Set()
      const seenTargets = new Set()
      const items = []
      for (const entry of payload.items) {
        const item = normalizeItem(entry)
        if (!item || seenIds.has(item.id) || seenTargets.has(item.target)) continue
        seenIds.add(item.id)
        seenTargets.add(item.target)
        items.push(item)
      }
      links.value = items
      storageError.value = items.length !== payload.items.length ? '部分无效常用链接已忽略' : ''
    } catch {
      links.value = defaultItems()
      storageError.value = '常用链接读取失败，已暂时显示默认应用；原本地数据未被覆盖'
    }
  }

  function persist(items) {
    links.value = items
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, items }))
      storageError.value = ''
      return true
    } catch {
      storageError.value = '无法保存常用链接，请检查浏览器存储权限或剩余空间'
      return false
    }
  }

  function save({ id = null, name, target }) {
    const normalized = normalizeTarget(target)
    if (!normalized.ok) throw new TypeError(normalized.error)
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName || trimmedName.length > MAX_NAME_LENGTH) {
      throw new TypeError('名称需为 1–36 个字符')
    }
    if (links.value.some((item) => item.target === normalized.target && item.id !== id)) {
      throw new TypeError('该链接已存在于常用链接中')
    }

    if (id) {
      if (!links.value.some((item) => item.id === id)) throw new TypeError('要编辑的链接不存在')
      return persist(links.value.map((item) => item.id === id
        ? { id, name: trimmedName, target: normalized.target }
        : item))
    }

    if (links.value.length >= MAX_LINKS) throw new TypeError('常用链接最多保存 50 条')
    const newId = 'custom-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2))
    return persist([...links.value, { id: newId, name: trimmedName, target: normalized.target }])
  }

  function remove(id) {
    if (!links.value.some((item) => item.id === id)) return false
    return persist(links.value.filter((item) => item.id !== id))
  }

  function restoreDefaults() {
    return persist(defaultItems())
  }

  return { links, storageError, load, save, remove, restoreDefaults }
}
