<template>
  <div class="box" :class="{ dark: darkMode }" @keydown="handleKeydown" tabindex="-1">
    <ThemeToggle :dark-mode="darkMode" @toggle="toggleDark" />

    <div class="tool-card">
      <!-- Header -->
      <div class="tool-card-header">
        <div class="title-group">
          <h1 class="tool-title" @click="isShowHistory = !isShowHistory">
            {{ isShowHistory ? 'HISTORY' : title }}
          </h1>
          <p class="tool-subtitle" v-if="!isShowHistory && !showCloseMsg">
            将链接或 URL Scheme（如 <strong><a href="https://s2u2.netlify.app/#weixin://open">weixin://open</a></strong> / <strong><a href="https://s2u2.netlify.app/#baidu.com">baidu.com</a></strong>）转换为可分享的跳转链接
          </p>
        </div>
        <button
          class="mode-toggle"
          :class="{ active: isShowHistory }"
          @click="isShowHistory = !isShowHistory"
          :aria-label="isShowHistory ? '返回创建链接' : '查看历史记录'"
        >
          {{ isShowHistory ? 'Create' : 'History' }}
        </button>
      </div>

      <!-- Auto-redirect message -->
      <Transition name="fade" mode="out-in">
        <ClosePanel
          v-if="showCloseMsg"
          :count-down="countDown"
          :origin="origin"
          @goto-origin="changeUrl(origin)"
          @cancel="cancelClose"
        />

        <!-- History mode -->
        <div v-else-if="isShowHistory" key="history" role="region" aria-label="历史记录">
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
            @sync="syncToGist(history)"
          />
        </div>

        <!-- Normal input mode -->
        <UrlInput
          v-else
          key="input"
          :url="url"
          :url-list="urlList"
          :copy-text="copyText"
          :url-error="urlError"
          :origin="origin"
          @update:url="url = $event"
          @update:url-error="urlError = $event"
          @copy="copy"
          @goto="gotoUrl"
        />
      </Transition>
    </div>

    <Toast :message="toast.message" :type="toast.type" :duration="toast.duration" :key="toast.key" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
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

// ─── Dark Mode ───
const { darkMode, toggle: toggleDark } = useDarkMode()

// ─── History ───
const { history, searchQuery, load: loadHistory, add: addHistory, remove: removeHistory,
  clear: clearHistory, merge: mergeHistory, mergeImport: mergeImportHistory,
  exportJSON: exportHistory } = useHistory()

// ─── Clipboard ───
const { copyText, copyToClipboard, cleanup: cleanupClipboard } = useClipboard()

// ─── Cloud Sync ───
const { cloudToken, cloudGistId, syncStatus, syncError, lastSyncTime,
  loadConfig, connect, disconnect, pushToGist, pullFromGist,
  scheduleAutoSync, cleanup: cleanupSync } = useCloudSync()

// ─── Reactive State ───
const url = ref('')
const urlList = ref([])
const urlError = ref('')
const isShowHistory = ref(false)
const showSettings = ref(false)
const showCloseMsg = ref(false)
const countDown = ref(5)
const title = ref('HELLO')
const origin = window.location.origin
let countdownTimer = null
let targetScheme = window.location.hash.substring(1)

// ─── Toast ───
const toast = ref({ message: '', type: 'info', duration: 2500, key: 0 })
let toastKey = 0

function showToast(message, type = 'info', duration = 2500) {
  toastKey++
  toast.value = { message, type, duration, key: toastKey }
}

// ─── URL utilities ───
function normalizeUrl(input) {
  if (!input) return input
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input)) return input
  return 'https://' + input
}

function validateUrl(val) {
  if (!val.trim()) return ''
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(val)) return ''
  if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/|$|:)/.test(val)) return ''
  if (/^localhost(:\d+)?(\/|$)/.test(val)) return ''
  return '请输入有效的 URL、域名或 URL Scheme'
}

const toUrl = computed(() => {
  return encodeURI(origin + '/#' + url.value)
})

const filteredHistory = computed(() => {
  if (!searchQuery.value.trim()) return history.value
  const q = searchQuery.value.toLowerCase()
  return history.value.filter((item) => item.scheme.toLowerCase().includes(q))
})

// ─── Redirect logic ───
function changeUrl(inputUrl) {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  const normalizedUrl = normalizeUrl(inputUrl)
  if (normalizedUrl) {
    window.location.replace(normalizedUrl)
    addHistory(inputUrl)
  }
  if (window.location.hash.substring(1)) {
    showCloseMsg.value = true
    title.value = 'GOTO'
    countDown.value = 5
    countdownTimer = setInterval(() => {
      countDown.value--
      if (countDown.value <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
        try { window.close() } catch { /* 非脚本打开的窗口无法关闭 */ }
      }
    }, 1000)
  }
}

function cancelClose() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  showCloseMsg.value = false
  title.value = 'HELLO'
}

function gotoUrl(fullUrl) {
  navigator.clipboard.writeText(fullUrl).catch(() => {})
  window.open(fullUrl)
}

function toHistoryUrl(scheme) {
  navigator.clipboard.writeText(origin + '/#' + scheme).catch(() => {})
  window.open(normalizeUrl(scheme))
}

// ─── History actions ───
function deleteHistoryItem(scheme) {
  removeHistory(scheme)
  autoSync()
  showToast('已删除', 'info')
}

function invalidHistory() {
  if (!confirm('确定清空所有历史记录？此操作不可撤销。')) return
  clearHistory()
  autoSync()
  showToast('历史记录已清空', 'info')
}

function importHistory() {
  // trigger via HistoryFooter ref — actually we'll handle it differently
}

function onImportFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result)
      if (!Array.isArray(imported)) throw new Error('格式错误')
      const count = imported.length
      if (!confirm(`将合并 ${count} 条记录，是否继续？`)) return
      const added = mergeImportHistory(imported)
      autoSync()
      showToast(`成功导入，新增 ${added} 条记录`, 'success')
    } catch {
      showToast('导入失败：文件格式不正确', 'error')
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

// ─── Copy ───
function copy() {
  const scheme = url.value
  if (!scheme.trim()) return

  const error = validateUrl(scheme)
  if (error) {
    urlError.value = error
    return
  }

  copyToClipboard(toUrl.value, () => {
    const fullUrl = origin + '/#' + scheme
    urlList.value = urlList.value.filter((u) => u !== fullUrl)
    urlList.value.unshift(fullUrl)
    if (urlList.value.length > 20) urlList.value.pop()
    localStorage.setItem('url_list', JSON.stringify(urlList.value))
    addHistory(scheme)
    url.value = ''
    autoSync()
  })
}

// ─── Cloud Sync ───
function autoSync() {
  scheduleAutoSync(history.value)
}

async function connectGist() {
  try {
    await connect(history.value)
    // 如果已有 gistId，先拉取合并再推送
    if (cloudGistId.value) {
      if (history.value.length === 0) {
        const remote = await pullFromGist()
        if (remote && Array.isArray(remote)) {
          mergeHistory(remote)
          await pushToGist(history.value)
        }
      } else {
        await pushToGist(history.value)
      }
    }
    showToast('已连接 GitHub Gist', 'success')
  } catch {
    // error handled in composable
  }
}

async function disconnectGist() {
  disconnect()
  showToast('已断开 GitHub Gist', 'info')
}

// ─── Keyboard ───
function handleKeydown(e) {
  const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
  const isContentEditable = e.target.isContentEditable

  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    copy()
  }
  if (e.key === 'Escape' && isInput && !isShowHistory.value) {
    url.value = ''
    urlError.value = ''
  }
  if ((e.key === 'h' || e.key === 'H') && !isInput && !isContentEditable) {
    isShowHistory.value = !isShowHistory.value
  }
}

// ─── Lifecycle ───
onMounted(() => {
  loadHistory()

  // 加载 urlList
  try {
    const saved = JSON.parse(localStorage.getItem('url_list'))
    if (Array.isArray(saved)) urlList.value = saved
  } catch { /* ignore */ }

  // 加载云端配置
  const connected = loadConfig()
  if (connected) {
    pullFromGist().then((remote) => {
      if (remote && Array.isArray(remote)) {
        mergeHistory(remote)
        pushToGist(history.value)
      }
    })
  }

  // 处理 hash 跳转
  if (targetScheme) {
    changeUrl(targetScheme)
  }
})

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  cleanupClipboard()
  cleanupSync()
})
</script>

<style scoped>
/* ─── CSS Custom Properties (Light — default) ─── */
.box {
  --card-bg: #efe9de;
  --card-text: #141413;
  --card-text-soft: #3d3d3a;
  --card-text-muted: #8e8b82;
  --surface-soft: #f5f0e8;
  --surface-elevated: #faf9f5;
  --hairline: #e6dfd8;
  --hairline-strong: #c4bfb6;
  --accent: #5b7fab;
}

/* ─── Dark Mode ─── */
.box.dark {
  --card-bg: #181715;
  --card-text: #faf9f5;
  --card-text-soft: #a09d96;
  --card-text-muted: #6c6a64;
  --surface-soft: #1f1e1b;
  --surface-elevated: #252320;
  --hairline: #3d3d3a;
  --hairline-strong: #6c6a64;
  --accent: #5b7fab;
}

/* ─── Layout ─── */
.box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 16px;
  position: relative;
  outline: none;
  transition: background 0.3s ease;
  background: #faf9f5;
}

.box.dark {
  background: #131210;
}

/* ─── Tool Card ─── */
.tool-card {
  width: 100%;
  max-width: 560px;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  color: var(--card-text);
  transition: background 0.3s ease, color 0.3s ease;
}

/* ─── Header ─── */
.tool-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 12px;
}

.title-group {
  flex: 1;
  min-width: 0;
}

.tool-title {
  font-family: 'Cormorant Garamond', 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: var(--card-text);
  margin: 0;
  cursor: pointer;
  position: relative;
}

.tool-title::after {
  content: '';
  display: block;
  width: 48px;
  height: 3px;
  background: var(--accent);
  margin-top: 6px;
}

.tool-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--card-text-muted);
  margin: 8px 0 0;
}

.tool-subtitle strong {
  font-weight: 500;
  color: var(--accent);
}

/* ─── Mode Toggle ─── */
.mode-toggle {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--card-text-muted);
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: 9999px;
  padding: 4px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-top: 4px;
  flex-shrink: 0;
}

.mode-toggle:hover {
  color: var(--card-text);
  border-color: var(--hairline-strong);
}

.mode-toggle.active {
  color: var(--accent);
  border-color: var(--accent);
}

/* ─── Transition ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ─── Responsive ─── */
@media (max-width: 600px) {
  .box {
    padding: 16px 12px;
    justify-content: flex-start;
    padding-top: 48px;
  }

  .tool-card {
    padding: 24px 20px;
  }

  .tool-title {
    font-size: 24px;
  }
}
</style>
