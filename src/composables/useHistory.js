import { ref } from 'vue'

const STORAGE_KEY = 'scheme_history'

export function useHistory() {
  const history = ref([])
  const searchQuery = ref('')

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
      if (Array.isArray(stored)) {
        history.value = sortByTime(stored)
      }
    } catch {
      history.value = []
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
  }

  function add(scheme) {
    const time = Date.now()
    const idx = history.value.findIndex((item) => item.scheme === scheme)
    if (idx === -1) {
      history.value.push({ scheme, count: 1, recently: time })
    } else {
      history.value[idx].count++
      history.value[idx].recently = time
    }
    history.value = sortByTime(history.value)
    save()
  }

  function remove(scheme) {
    history.value = history.value.filter((item) => item.scheme !== scheme)
    save()
  }

  function clear() {
    history.value = []
    save()
  }

  function merge(remoteItems) {
    if (!Array.isArray(remoteItems) || remoteItems.length === 0) return
    const map = new Map()
    for (const item of history.value) {
      map.set(item.scheme, item)
    }
    for (const item of remoteItems) {
      if (!item.scheme) continue
      const existing = map.get(item.scheme)
      if (!existing) {
        map.set(item.scheme, { ...item })
      } else {
        existing.count = Math.max(existing.count, item.count || 1)
        existing.recently = Math.max(existing.recently, item.recently || 0)
      }
    }
    history.value = sortByTime([...map.values()])
    save()
  }

  function mergeImport(imported) {
    if (!Array.isArray(imported)) return 0
    let addedCount = 0
    for (const item of imported) {
      if (!item.scheme) continue
      const idx = history.value.findIndex((m) => m.scheme === item.scheme)
      if (idx === -1) {
        history.value.push({ scheme: item.scheme, count: item.count || 1, recently: item.recently || Date.now() })
        addedCount++
      } else {
        history.value[idx].count = Math.max(history.value[idx].count, item.count || 1)
        history.value[idx].recently = Math.max(history.value[idx].recently, item.recently || 0)
      }
    }
    history.value = sortByTime(history.value)
    save()
    return addedCount
  }

  function exportJSON() {
    const data = JSON.stringify(history.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scheme-history-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function filtered() {
    if (!searchQuery.value.trim()) return history.value
    const q = searchQuery.value.toLowerCase()
    return history.value.filter((item) => item.scheme.toLowerCase().includes(q))
  }

  return { history, searchQuery, load, save, add, remove, clear, merge, mergeImport, exportJSON, filtered }
}

function sortByTime(items) {
  return items ? [...items].sort((a, b) => b.recently - a.recently) : []
}
