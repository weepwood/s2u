import { ref } from 'vue'

const CONFIG_KEY = 'cloud_config'
const GIST_FILENAME = 'scheme-history.json'
const API_BASE = 'https://api.github.com'

export function useCloudSync() {
  const cloudToken = ref('')
  const cloudGistId = ref('')
  const syncStatus = ref('') // '' | 'connecting' | 'connected' | 'error'
  const syncError = ref('')
  const lastSyncTime = ref(null)
  let syncTimer = null

  function loadConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY)
      if (raw) {
        const cfg = JSON.parse(raw)
        cloudToken.value = cfg.token || ''
        cloudGistId.value = cfg.gistId || ''
        if (cloudToken.value && cloudGistId.value) {
          syncStatus.value = 'connected'
          return true
        }
      }
    } catch {
      /* ignore */
    }
    return false
  }

  function saveConfig() {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({ token: cloudToken.value, gistId: cloudGistId.value })
    )
  }

  async function connect(historyData) {
    const token = cloudToken.value.trim()
    if (!token) return
    syncStatus.value = 'connecting'
    syncError.value = ''
    try {
      const userRes = await fetch(`${API_BASE}/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!userRes.ok) throw new Error('Token 无效或已过期')

      let gistId = cloudGistId.value
      if (!gistId) {
        const createRes = await fetch(`${API_BASE}/gists`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: 'Scheme to URL - History Sync',
            public: false,
            files: {
              [GIST_FILENAME]: { content: JSON.stringify(historyData, null, 2) },
            },
          }),
        })
        if (!createRes.ok) throw new Error('Gist 创建失败')
        const gist = await createRes.json()
        gistId = gist.id
      }

      cloudGistId.value = gistId
      saveConfig()
      syncStatus.value = 'connected'
      lastSyncTime.value = Date.now()
    } catch (e) {
      syncStatus.value = 'error'
      syncError.value = e.message || '连接失败'
      throw e
    }
  }

  function disconnect() {
    cloudToken.value = ''
    cloudGistId.value = ''
    syncStatus.value = ''
    syncError.value = ''
    lastSyncTime.value = null
    localStorage.removeItem(CONFIG_KEY)
  }

  async function pushToGist(data) {
    if (!cloudToken.value || !cloudGistId.value) return
    try {
      const res = await fetch(`${API_BASE}/gists/${cloudGistId.value}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${cloudToken.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) },
          },
        }),
      })
      if (!res.ok) throw new Error('同步失败')
      syncStatus.value = 'connected'
      lastSyncTime.value = Date.now()
    } catch (e) {
      syncStatus.value = 'error'
      syncError.value = e.message || '同步失败'
    }
  }

  async function pullFromGist() {
    if (!cloudToken.value || !cloudGistId.value) return null
    try {
      const res = await fetch(`${API_BASE}/gists/${cloudGistId.value}`, {
        headers: { Authorization: `Bearer ${cloudToken.value}` },
      })
      if (!res.ok) throw new Error('拉取失败')
      const gist = await res.json()
      const remoteContent = gist.files?.[GIST_FILENAME]?.content
      if (remoteContent) {
        const remote = JSON.parse(remoteContent)
        syncStatus.value = 'connected'
        lastSyncTime.value = Date.now()
        return remote
      }
    } catch (e) {
      syncStatus.value = 'error'
      syncError.value = e.message || '拉取失败'
    }
    return null
  }

  function scheduleAutoSync(data, delay = 2000) {
    if (!cloudToken.value || !cloudGistId.value) return
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      pushToGist(data)
    }, delay)
  }

  function cleanup() {
    if (syncTimer) {
      clearTimeout(syncTimer)
      syncTimer = null
    }
  }

  return {
    cloudToken, cloudGistId, syncStatus, syncError, lastSyncTime,
    loadConfig, saveConfig, connect, disconnect, pushToGist, pullFromGist,
    scheduleAutoSync, cleanup,
  }
}
