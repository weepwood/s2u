<template>
  <main class="app-shell" :class="{ dark: darkMode }" tabindex="-1" @keydown="handleKeydown">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>

    <header class="app-header">
      <a class="brand" :href="`${origin}/`" aria-label="Scheme to URL 首页">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M8.5 15.5 15.5 8.5M7 10H5.75A3.75 3.75 0 0 0 2 13.75v2.5A3.75 3.75 0 0 0 5.75 20h2.5A3.75 3.75 0 0 0 12 16.25V15m0-6V7.75A3.75 3.75 0 0 1 15.75 4h2.5A3.75 3.75 0 0 1 22 7.75v2.5A3.75 3.75 0 0 1 18.25 14H17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="brand-copy">
          <strong>Scheme to URL</strong>
          <small>Link bridge</small>
        </span>
      </a>

      <div class="header-actions">
        <a class="github-link" href="https://github.com/weepwood/s2u" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.24c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.74-1.55-2.58-.3-5.29-1.29-5.29-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.93 10.93 0 0 1 5.75 0C17.03 5.03 18 5.34 18 5.34c.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.4-2.72 5.38-5.31 5.67.42.36.79 1.07.79 2.16v3.25c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/>
          </svg>
          <span>GitHub</span>
        </a>
        <ThemeToggle :dark-mode="darkMode" @toggle="toggleDark" />
      </div>
    </header>

    <section class="workspace" aria-label="链接转换工作区">
      <div class="workspace-head">

        <nav v-if="!showCloseMsg" class="mode-tabs" role="tablist" aria-label="页面模式">
          <button
            id="create-tab"
            type="button"
            role="tab"
            :class="{ active: !isShowHistory }"
            :aria-selected="!isShowHistory"
            aria-controls="create-panel"
            @click="isShowHistory = false"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            创建链接
          </button>
          <button
            id="history-tab"
            type="button"
            role="tab"
            :class="{ active: isShowHistory }"
            :aria-selected="isShowHistory"
            aria-controls="history-panel"
            @click="isShowHistory = true"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8v4l2.5 1.5M4.93 5.93A9 9 0 1 1 3 11.5M3 5v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            历史记录
            <span v-if="history.length" class="tab-count">{{ history.length }}</span>
          </button>
        </nav>
      </div>

      <div class="content-card">
        <Transition name="panel" mode="out-in">
          <ClosePanel
            v-if="showCloseMsg"
            key="redirect"
            :count-down="countDown"
            :origin="origin"
            @cancel="cancelClose"
          />

          <div
            v-else-if="isShowHistory"
            id="history-panel"
            key="history"
            class="history-view"
            role="tabpanel"
            aria-labelledby="history-tab"
          >
            <HistoryPanel
              :history="history"
              :search-query="searchQuery"
              :filtered-history="filteredHistory"
              @update:search-query="searchQuery = $event"
              @select="toHistoryUrl"
              @delete="deleteHistoryItem"
            />
            <HistoryFooter
              :show-settings="showSettings"
              @clear="invalidHistory"
              @export="exportHistory"
              @toggle-settings="showSettings = !showSettings"
              @import-file="onImportFile"
            />
            <SettingsPanel
              v-if="showSettings"
              :cloud-token="cloudToken"
              :cloud-gist-id="cloudGistId"
              :sync-status="syncStatus"
              :sync-error="syncError"
              :last-sync-time="lastSyncTime"
              @update:cloud-token="cloudToken = $event"
              @connect="connectGist"
              @disconnect="disconnectGist"
              @sync="syncGist"
            />
          </div>

          <UrlInput
            v-else
            id="create-panel"
            key="input"
            role="tabpanel"
            aria-labelledby="create-tab"
            :url="url"
            :url-list="recentLinks"
            :share-url="toUrl"
            :copy-text="copyText"
            :url-error="urlError"
            @update:url="url = $event"
            @update:url-error="urlError = $event"
            @copy="copy"
            @goto="gotoUrl"
          />
        </Transition>
      </div>
    </section>

    <footer class="workspace-footer" aria-label="快捷键提示">
      <span class="shortcut-label">快捷键</span>
      <span class="shortcut-group">
        <kbd>Ctrl / ⌘</kbd><span>+</span><kbd>Enter</kbd><span>复制</span>
      </span>
      <span class="divider" aria-hidden="true"></span>
      <span class="shortcut-group"><kbd>H</kbd><span>切换历史</span></span>
    </footer>

    <Toast :message="toast.message" :type="toast.type" :duration="toast.duration" :key="toast.key" />
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ThemeToggle from './ThemeToggle.vue'
import UrlInput from './UrlInput.vue'
import HistoryPanel from './HistoryPanel.vue'
import HistoryFooter from './HistoryFooter.vue'
import SettingsPanel from './SettingsPanel.vue'
import ClosePanel from './ClosePanel.vue'
import Toast from './Toast.vue'
import { useDarkMode } from '../composables/useDarkMode.js'
import { useHistory } from '../composables/useHistory.js'
import { useCloudSync } from '../composables/useCloudSync.js'
import { useClipboard } from '../composables/useClipboard.js'
import {
  decodeShareTarget,
  encodeShareLink,
  getAppBaseUrl,
  normalizeTarget,
} from '../domain/linkCodec.js'

const MAX_IMPORT_SIZE = 2 * 1024 * 1024
const { darkMode, toggle: toggleDark } = useDarkMode()

const {
  history,
  searchQuery,
  storageError,
  load: loadHistory,
  add: addHistory,
  remove: removeHistory,
  clear: clearHistory,
  merge: mergeHistory,
  mergeImport: mergeImportHistory,
  inspectImport,
  snapshot: historySnapshot,
  exportJSON: exportHistory,
  filtered: filterHistory,
} = useHistory()

const { copyText, copyToClipboard, cleanup: cleanupClipboard } = useClipboard()

const {
  cloudToken,
  cloudGistId,
  syncStatus,
  syncError,
  lastSyncTime,
  loadConfig,
  connect,
  disconnect,
  pushToGist,
  pullFromGist,
  scheduleAutoSync,
  cleanup: cleanupSync,
} = useCloudSync()

const url = ref('')
const urlError = ref('')
const isShowHistory = ref(false)
const showSettings = ref(false)
const showCloseMsg = ref(false)
const countDown = ref(5)
const origin = getAppBaseUrl()
const targetScheme = decodeShareTarget(window.location.hash)
let countdownTimer = null

const toast = ref({ message: '', type: 'info', duration: 2500, key: 0 })
let toastKey = 0

const toUrl = computed(() => {
  if (!url.value.trim()) return ''
  try {
    return encodeShareLink(origin, url.value)
  } catch {
    return ''
  }
})

const recentLinks = computed(() =>
  history.value.slice(0, 20).flatMap((item) => {
    try {
      return [encodeShareLink(origin, item.scheme)]
    } catch {
      return []
    }
  }),
)

const filteredHistory = computed(() => filterHistory())

function showToast(message, type = 'info', duration = 2500) {
  toastKey++
  toast.value = { message, type, duration, key: toastKey }
}

function notifyStorageError() {
  if (!storageError.value) return
  showToast(storageError.value, 'error', 4000)
}

function changeUrl(inputUrl) {
  stopCountdown()

  const normalized = normalizeTarget(inputUrl)
  if (!normalized.ok) {
    urlError.value = normalized.error
    showToast(normalized.error, 'error', 4000)
    return
  }

  const saved = addHistory(normalized.target)
  if (!saved) notifyStorageError()
  autoSync()
  startCountdown()
  window.location.replace(normalized.target)
}

function startCountdown() {
  showCloseMsg.value = true
  countDown.value = 5
  countdownTimer = setInterval(() => {
    countDown.value--
    if (countDown.value > 0) return

    stopCountdown()
    try {
      window.close()
    } catch {
      // 非脚本打开的窗口无法关闭。
    }
  }, 1000)
}

function stopCountdown() {
  if (!countdownTimer) return
  clearInterval(countdownTimer)
  countdownTimer = null
}

function cancelClose() {
  stopCountdown()
  showCloseMsg.value = false
  window.history.replaceState(null, '', `${origin}/`)
}

function gotoUrl(fullUrl) {
  if (!fullUrl) return
  navigator.clipboard.writeText(fullUrl).catch(() => {})
  window.open(fullUrl, '_blank', 'noopener,noreferrer')
}

function toHistoryUrl(scheme) {
  const normalized = normalizeTarget(scheme)
  if (!normalized.ok) {
    showToast(normalized.error, 'error', 4000)
    return
  }

  navigator.clipboard.writeText(encodeShareLink(origin, normalized.target)).catch(() => {})
  window.open(normalized.target, '_blank', 'noopener,noreferrer')
}

function deleteHistoryItem(scheme) {
  if (!removeHistory(scheme)) {
    notifyStorageError()
    return
  }
  autoSync()
  showToast('已删除记录', 'info')
}

function invalidHistory() {
  if (!confirm('确定清空所有历史记录？此操作不可撤销。')) return
  if (!clearHistory()) {
    notifyStorageError()
    return
  }
  autoSync()
  showToast('历史记录已清空', 'info')
}

function onImportFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  if (file.size > MAX_IMPORT_SIZE) {
    showToast('导入失败：文件不能超过 2 MB', 'error')
    return
  }

  const reader = new FileReader()
  reader.onload = (loadEvent) => {
    try {
      const imported = JSON.parse(String(loadEvent.target?.result ?? ''))
      const summary = inspectImport(imported)
      if (summary.valid === 0) throw new Error('文件中没有有效记录')

      const invalidHint = summary.invalid ? `，忽略 ${summary.invalid} 条无效记录` : ''
      if (!confirm(`将合并 ${summary.valid} 条有效记录${invalidHint}，是否继续？`)) return

      const added = mergeImportHistory(imported)
      notifyStorageError()
      autoSync()
      showToast(`导入完成，新增 ${added} 条记录`, 'success')
    } catch (error) {
      showToast(`导入失败：${error.message || '文件格式不正确'}`, 'error', 4000)
    }
  }
  reader.onerror = () => showToast('导入失败：无法读取文件', 'error')
  reader.readAsText(file)
}

function copy() {
  const normalized = normalizeTarget(url.value)
  if (!normalized.ok) {
    urlError.value = normalized.error
    return
  }

  const shareLink = encodeShareLink(origin, normalized.target)
  copyToClipboard(shareLink, () => {
    const saved = addHistory(normalized.target)
    if (!saved) notifyStorageError()
    url.value = ''
    urlError.value = ''
    autoSync()
  })
}

function autoSync() {
  scheduleAutoSync(() => syncGist({ silent: true }))
}

async function syncGist({ silent = false } = {}) {
  if (!cloudToken.value || !cloudGistId.value) return false

  try {
    const remote = await pullFromGist()
    if (remote === null) {
      if (!silent) showToast(syncError.value || '同步失败', 'error', 4000)
      return false
    }

    mergeHistory(remote)
    notifyStorageError()
    await pushToGist(historySnapshot())

    if (!silent) showToast('历史记录已同步', 'success')
    return true
  } catch (error) {
    if (!silent) showToast(syncError.value || error.message || '同步失败', 'error', 4000)
    return false
  }
}

async function connectGist() {
  try {
    await connect(historySnapshot())
    const synced = await syncGist({ silent: true })
    if (synced) showToast('已连接 GitHub Gist', 'success')
  } catch {
    // 错误状态由 composable 维护。
  }
}

function disconnectGist() {
  disconnect()
  showToast('已断开 GitHub Gist', 'info')
}

function handleKeydown(event) {
  if (event.isComposing) return

  const target = event.target
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  const isContentEditable = target instanceof HTMLElement && target.isContentEditable

  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    copy()
    return
  }

  if (event.key === 'Escape' && isInput && !isShowHistory.value) {
    url.value = ''
    urlError.value = ''
    return
  }

  if (
    event.key.toLowerCase() === 'h' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !isInput &&
    !isContentEditable
  ) {
    event.preventDefault()
    isShowHistory.value = !isShowHistory.value
  }
}

onMounted(() => {
  loadHistory()
  notifyStorageError()

  try {
    localStorage.removeItem('url_list')
  } catch {
    // 忽略无法清理的旧缓存。
  }

  if (loadConfig()) {
    syncGist({ silent: true }).catch(() => {})
  }

  if (targetScheme) changeUrl(targetScheme)
})

onBeforeUnmount(() => {
  stopCountdown()
  cleanupClipboard()
  cleanupSync()
})
</script>

<style scoped src="../styles/change.css"></style>
