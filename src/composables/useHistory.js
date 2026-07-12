import { ref } from 'vue'

const STORAGE_KEY = 'scheme_history'
const MAX_HISTORY_ITEMS = 500
const MAX_SCHEME_LENGTH = 4096

export function useHistory() {
  const history = ref([])
  const searchQuery = ref('')

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      history.value = normalizeHistory(stored)
    } catch {
      history.value = []
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
      return true
    } catch {
      return false
    }
  }

  function add(scheme) {
    const normalizedScheme = normalizeScheme(scheme)
    if (!normalizedScheme) return false

    const time = Date.now()
    const idx = history.value.findIndex((item) => item.scheme === normalizedScheme)

    if (idx === -1) {
      history.value.push({ scheme: normalizedScheme, count: 1, recently: time })
    } else {
      history.value[idx].count += 1
      history.value[idx].recently = time
    }

    history.value = sortByTime(history.value).slice(0, MAX_HISTORY_ITEMS)
    save()
    return true
  }

  function remove(scheme) {
    const normalizedScheme = normalizeScheme(scheme)
    if (!normalizedScheme) return false

    const previousLength = history.value.length
    history.value = history.value.filter((item) => item.scheme !== normalizedScheme)

    if (history.value.length === previousLength) return false
    save()
    return true
  }

  function clear() {
    history.value = []
    save()
  }

  function merge(remoteItems) {
    const normalizedRemote = normalizeHistory(remoteItems)
    if (normalizedRemote.length === 0) return 0

    const before = new Set(history.value.map((item) => item.scheme))
    history.value = mergeHistoryItems(history.value, normalizedRemote)
    save()

    return history.value.reduce(
      (count, item) => count + (before.has(item.scheme) ? 0 : 1),
      0,
    )
  }

  function mergeImport(imported) {
    const normalizedImport = normalizeHistory(imported)
    if (normalizedImport.length === 0) return 0

    const before = new Set(history.value.map((item) => item.scheme))
    history.value = mergeHistoryItems(history.value, normalizedImport)
    save()

    return history.value.reduce(
      (count, item) => count + (before.has(item.scheme) ? 0 : 1),
      0,
    )
  }

  function exportJSON() {
    const data = JSON.stringify(history.value, null, 2)
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `scheme-history-${new Date().toISOString().slice(0, 10)}.json`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()

    // Safari may still be reading the blob immediately after click.
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function filtered() {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return history.value

    return history.value.filter((item) => item.scheme.toLowerCase().includes(query))
  }

  return {
    history,
    searchQuery,
    load,
    save,
    add,
    remove,
    clear,
    merge,
    mergeImport,
    exportJSON,
    filtered,
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

    existing.count = Math.max(existing.count, normalized.count)
    existing.recently = Math.max(existing.recently, normalized.recently)
  }

  return sortByTime([...map.values()]).slice(0, MAX_HISTORY_ITEMS)
}

function normalizeHistoryItem(item) {
  if (!item || typeof item !== 'object') return null

  const scheme = normalizeScheme(item.scheme)
  if (!scheme) return null

  const count = Number(item.count)
  const recently = Number(item.recently)

  return {
    scheme,
    count: Number.isFinite(count) ? Math.max(1, Math.trunc(count)) : 1,
    recently: Number.isFinite(recently) && recently > 0 ? recently : Date.now(),
  }
}

function normalizeScheme(value) {
  if (typeof value !== 'string') return ''

  const scheme = value.trim()
  if (!scheme || scheme.length > MAX_SCHEME_LENGTH) return ''

  return scheme
}

function mergeHistoryItems(localItems, incomingItems) {
  const map = new Map(normalizeHistory(localItems).map((item) => [item.scheme, item]))

  for (const item of incomingItems) {
    const existing = map.get(item.scheme)
    if (!existing) {
      map.set(item.scheme, { ...item })
      continue
    }

    existing.count = Math.max(existing.count, item.count)
    existing.recently = Math.max(existing.recently, item.recently)
  }

  return sortByTime([...map.values()]).slice(0, MAX_HISTORY_ITEMS)
}

function sortByTime(items) {
  return [...items].sort((a, b) => b.recently - a.recently)
}
