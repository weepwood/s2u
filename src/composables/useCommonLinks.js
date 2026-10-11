import { ref } from 'vue'
import { normalizeTarget } from '../domain/linkCodec.js'

const STORAGE_KEY = 's2u_common_links_v1'
const CORRUPT_BACKUP_PREFIX = 's2u_common_links_corrupt_backup_'
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
  let needsRecovery = false
  let damagedRaw = null

  function load() {
    let raw = null
    try {
      raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) {
        needsRecovery = false
        damagedRaw = null
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
      needsRecovery = false
      damagedRaw = null
      links.value = items
      storageError.value = items.length !== payload.items.length ? '部分无效常用链接已忽略' : ''
    } catch {
      needsRecovery = true
      damagedRaw = raw
      links.value = defaultItems()
      storageError.value = '常用链接读取失败，原始数据已保留；请确认恢复默认后再修改'
    }
  }

  function persist(items, { recover = false } = {}) {
    if (needsRecovery && !recover) {
      storageError.value = '原有收藏数据无法读取，请先选择“恢复默认应用”进行安全恢复'
      return false
    }

    try {
      // 损坏存储必须先成功备份原始字节，才能由用户主动执行恢复。
      if (needsRecovery) {
        if (damagedRaw === null) throw new Error('原始数据无法备份')
        const backupKey = CORRUPT_BACKUP_PREFIX + Date.now()
        localStorage.setItem(backupKey, damagedRaw)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, items }))
      links.value = items
      needsRecovery = false
      damagedRaw = null
      storageError.value = ''
      return true
    } catch {
      storageError.value = '保存失败，列表未改变。请检查浏览器存储空间与权限'
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
    return persist(defaultItems(), { recover: true })
  }

  return { links, storageError, load, save, remove, restoreDefaults }
}
