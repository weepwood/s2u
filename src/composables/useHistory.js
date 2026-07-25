import { ref } from 'vue'

const STORAGE_KEY = 'scheme_history'
const HISTORY_FORMAT = 's2u-history'
const HISTORY_VERSION = 2
const MAX_HISTORY_ITEMS = 500
const MAX_TOMBSTONES = 1000
const MAX_SCHEME_LENGTH = 4096
const TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

export function useHistory() {
  const history = ref([])
  const tombstones = ref([])
  const searchQuery = ref('')
  const storageError = ref('')

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      const normalized = normalizePayload(stored)
      history.value = normalized.records
      tombstones.value = normalized.tombstones
      applyMergedState(normalized.records, normalized.tombstones)
      storageError.value = ''
    } catch {
      history.value = []
      tombstones.value = []
      storageError.value = '本地历史记录已损坏，已使用空数据启动'
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()))
      storageError.value = ''
      return true
    } catch {
      storageError.value = '本地存储空间不足或不可用，最新修改可能没有保存'
      return false
    }
  }

  function add(scheme) {
    const normalizedScheme = normalizeScheme(scheme)
    if (!normalizedScheme) return false

    const time = Date.now()
    const idx = history.value.findIndex((item) => item.scheme === normalizedScheme)

    if (idx === -1) {
      history.value.push({
        scheme: normalizedScheme,
        count: 1,
        recently: time,
        updatedAt: time,
      })
    } else {
      const current = history.value[idx]
      history.value[idx] = {
        ...current,
        count: current.count + 1,
        recently: time,
        updatedAt: time,
      }
    }

    tombstones.value = tombstones.value.filter((item) => item.scheme !== normalizedScheme)
    history.value = sortByTime(history.value).slice(0, MAX_HISTORY_ITEMS)
    return save()
  }

  function remove(scheme) {
    const normalizedScheme = normalizeScheme(scheme)
    if (!normalizedScheme) return false

    const previousLength = history.value.length
    history.value = history.value.filter((item) => item.scheme !== normalizedScheme)
    if (history.value.length === previousLength) return false

    upsertTombstone(normalizedScheme, Date.now())
    return save()
  }

  function clear() {
    const deletedAt = Date.now()
    for (const item of history.value) upsertTombstone(item.scheme, deletedAt)
    history.value = []
    return save()
  }

  function merge(remoteData) {
    const before = new Set(history.value.map((item) => item.scheme))
    const incoming = normalizePayload(remoteData)
    applyMergedState(
      [...history.value, ...incoming.records],
      [...tombstones.value, ...incoming.tombstones],
    )
    save()

    return history.value.reduce(
      (count, item) => count + (before.has(item.scheme) ? 0 : 1),
      0,
    )
  }

  function mergeImport(imported) {
    return merge(imported)
  }

  function inspectImport(imported) {
    const rawRecords = Array.isArray(imported) ? imported : imported?.records
    if (!Array.isArray(rawRecords)) {
      throw new TypeError('不支持的历史记录文件格式')
    }

    if (!Array.isArray(imported) && imported.format && imported.format !== HISTORY_FORMAT) {
      throw new TypeError('不是 Scheme to URL 的历史记录文件')
    }

    if (!Array.isArray(imported) && Number(imported.version) > HISTORY_VERSION) {
      throw new TypeError('历史记录文件版本过新，请升级应用后重试')
    }

    const normalized = normalizePayload(imported)
    return {
      total: rawRecords.length,
      valid: normalized.records.length,
      invalid: Math.max(0, rawRecords.length - normalized.records.length),
      tombstones: normalized.tombstones.length,
    }
  }

  function snapshot() {
    return {
      format: HISTORY_FORMAT,
      version: HISTORY_VERSION,
      updatedAt: Date.now(),
      records: history.value.map((item) => ({ ...item })),
      tombstones: tombstones.value.map((item) => ({ ...item })),
    }
  }

  function exportJSON() {
    const data = JSON.stringify(snapshot(), null, 2)
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `scheme-history-${new Date().toISOString().slice(0, 10)}.json`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()

    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function filtered() {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return history.value
    return history.value.filter((item) => item.scheme.toLowerCase().includes(query))
  }

  function applyMergedState(records, deletedRecords) {
    const recordMap = new Map()
    const tombstoneMap = new Map()

    for (const record of normalizeHistory(records)) {
      const existing = recordMap.get(record.scheme)
      if (!existing) {
        recordMap.set(record.scheme, record)
        continue
      }

      recordMap.set(record.scheme, {
        scheme: record.scheme,
        count: Math.max(existing.count, record.count),
        recently: Math.max(existing.recently, record.recently),
        updatedAt: Math.max(existing.updatedAt, record.updatedAt),
      })
    }

    for (const tombstone of normalizeTombstones(deletedRecords)) {
      const existing = tombstoneMap.get(tombstone.scheme)
      if (!existing || tombstone.deletedAt > existing.deletedAt) {
        tombstoneMap.set(tombstone.scheme, tombstone)
      }
    }

    for (const [scheme, record] of recordMap) {
      const tombstone = tombstoneMap.get(scheme)
      if (!tombstone) continue

      if (tombstone.deletedAt >= record.updatedAt) {
        recordMap.delete(scheme)
      } else {
        tombstoneMap.delete(scheme)
      }
    }

    const cutoff = Date.now() - TOMBSTONE_RETENTION_MS
    history.value = sortByTime([...recordMap.values()]).slice(0, MAX_HISTORY_ITEMS)
    tombstones.value = [...tombstoneMap.values()]
      .filter((item) => item.deletedAt >= cutoff)
      .sort((a, b) => b.deletedAt - a.deletedAt)
      .slice(0, MAX_TOMBSTONES)
  }

  function upsertTombstone(scheme, deletedAt) {
    const existing = tombstones.value.find((item) => item.scheme === scheme)
    if (existing) {
      existing.deletedAt = Math.max(existing.deletedAt, deletedAt)
    } else {
      tombstones.value.push({ scheme, deletedAt })
    }

    tombstones.value = tombstones.value
      .sort((a, b) => b.deletedAt - a.deletedAt)
      .slice(0, MAX_TOMBSTONES)
  }

  return {
    history,
    tombstones,
    searchQuery,
    storageError,
    load,
    save,
    add,
    remove,
    clear,
    merge,
    mergeImport,
    inspectImport,
    snapshot,
    exportJSON,
    filtered,
  }
}

function normalizePayload(input) {
  if (Array.isArray(input)) {
    return { records: normalizeHistory(input), tombstones: [] }
  }

  if (!input || typeof input !== 'object') {
    return { records: [], tombstones: [] }
  }

  const records = Array.isArray(input.records)
    ? input.records
    : Array.isArray(input.items)
      ? input.items
      : []

  return {
    records: normalizeHistory(records),
    tombstones: normalizeTombstones(input.tombstones),
  }
}

function normalizeHistory(items) {
  if (!Array.isArray(items)) return []

  const map = new Map()
  for (const item of items) {
    const normalized = normalizeHistoryItem(item)
    if (!normalized) continue

    const existing = map.get(normalized.scheme)
    if (!existing) {
      map.set(normalized.scheme, normalized)
      continue
    }

    map.set(normalized.scheme, {
      scheme: normalized.scheme,
      count: Math.max(existing.count, normalized.count),
      recently: Math.max(existing.recently, normalized.recently),
      updatedAt: Math.max(existing.updatedAt, normalized.updatedAt),
    })
  }

  return sortByTime([...map.values()]).slice(0, MAX_HISTORY_ITEMS)
}

function normalizeHistoryItem(item) {
  if (!item || typeof item !== 'object') return null

  const scheme = normalizeScheme(item.scheme)
  if (!scheme) return null

  const count = Number(item.count)
  const recently = Number(item.recently)
  const safeRecently = Number.isFinite(recently) && recently > 0 ? recently : Date.now()
  const updatedAt = Number(item.updatedAt)

  return {
    scheme,
    count: Number.isFinite(count) ? Math.max(1, Math.trunc(count)) : 1,
    recently: safeRecently,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : safeRecently,
  }
}

function normalizeTombstones(items) {
  if (!Array.isArray(items)) return []

  const map = new Map()
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const scheme = normalizeScheme(item.scheme)
    const deletedAt = Number(item.deletedAt)
    if (!scheme || !Number.isFinite(deletedAt) || deletedAt <= 0) continue

    const existing = map.get(scheme)
    if (!existing || deletedAt > existing.deletedAt) {
      map.set(scheme, { scheme, deletedAt })
    }
  }

  return [...map.values()]
}

function normalizeScheme(value) {
  if (typeof value !== 'string') return ''
  const scheme = value.trim()
  if (!scheme || scheme.length > MAX_SCHEME_LENGTH) return ''
  return scheme
}

function sortByTime(items) {
  return [...items].sort((a, b) => b.recently - a.recently)
}
