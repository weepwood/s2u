<template>
  <main class="app-shell" :class="{ dark: darkMode }" @keydown="handleKeydown" tabindex="-1">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>

    <header class="app-header">
      <a class="brand" :href="origin" aria-label="Scheme to URL 首页">
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

    <section class="workspace" aria-labelledby="page-title">
      <div class="workspace-head">
        <div class="eyebrow">
          <span class="status-dot" aria-hidden="true"></span>
          <span>{{ showCloseMsg ? 'Redirecting' : isShowHistory ? `${history.length} saved links` : 'Private · Local first' }}</span>
        </div>

        <h1 id="page-title">
          <template v-if="showCloseMsg">正在打开目标链接</template>
          <template v-else-if="isShowHistory">管理你的跳转历史</template>
          <template v-else>把任意链接变成<br /><span>可分享的跳转入口</span></template>
        </h1>

        <p v-if="!showCloseMsg" class="hero-description">
          <template v-if="isShowHistory">
            搜索、重新打开或同步曾经创建过的链接，所有记录默认只保存在当前浏览器。
          </template>
          <template v-else>
            支持普通网址与 <code>weixin://</code> 等 URL Scheme。生成后即可复制、分享，并在需要时直接唤起对应应用。
          </template>
        </p>

        <nav v-if="!showCloseMsg" class="mode-tabs" aria-label="页面模式">
          <button
            type="button"
            :class="{ active: !isShowHistory }"
            :aria-current="!isShowHistory ? 'page' : undefined"
            @click="isShowHistory = false"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            创建链接
          </button>
          <button
            type="button"
            :class="{ active: isShowHistory }"
            :aria-current="isShowHistory ? 'page' : undefined"
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
            @goto-origin="changeUrl(origin)"
            @cancel="cancelClose"
          />

          <div v-else-if="isShowHistory" key="history" class="history-view" role="region" aria-label="历史记录">
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

      <footer class="workspace-footer">
        <span>快捷键</span>
        <kbd>Ctrl / ⌘</kbd><span>+</span><kbd>Enter</kbd><span>复制</span>
        <span class="divider" aria-hidden="true"></span>
        <kbd>H</kbd><span>切换历史</span>
      </footer>
    </section>

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

const { darkMode, toggle: toggleDark } = useDarkMode()

const {
  history,
  searchQuery,
  load: loadHistory,
  add: addHistory,
  remove: removeHistory,
  clear: clearHistory,
  merge: mergeHistory,
  mergeImport: mergeImportHistory,
  exportJSON: exportHistory,
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
const urlList = ref([])
const urlError = ref('')
const isShowHistory = ref(false)
const showSettings = ref(false)
const showCloseMsg = ref(false)
const countDown = ref(5)
const origin = window.location.origin
let countdownTimer = null
const targetScheme = window.location.hash.substring(1)

const toast = ref({ message: '', type: 'info', duration: 2500, key: 0 })
let toastKey = 0

function showToast(message, type = 'info', duration = 2500) {
  toastKey++
  toast.value = { message, type, duration, key: toastKey }
}

function normalizeUrl(input) {
  if (!input) return input
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input)) return input
  return 'https://' + input
}

function validateUrl(value) {
  if (!value.trim()) return ''
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) return ''
  if (/^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/|$|:)/.test(value)) return ''
  if (/^localhost(:\d+)?(\/|$)/.test(value)) return ''
  return '请输入有效的 URL、域名或 URL Scheme'
}

const toUrl = computed(() => encodeURI(origin + '/#' + url.value))

const filteredHistory = computed(() => {
  if (!searchQuery.value.trim()) return history.value
  const query = searchQuery.value.toLowerCase()
  return history.value.filter((item) => item.scheme.toLowerCase().includes(query))
})

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
    countDown.value = 5
    countdownTimer = setInterval(() => {
      countDown.value--
      if (countDown.value <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
        try {
          window.close()
        } catch {
          // 非脚本打开的窗口无法关闭
        }
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
}

function gotoUrl(fullUrl) {
  navigator.clipboard.writeText(fullUrl).catch(() => {})
  window.open(fullUrl, '_blank', 'noopener,noreferrer')
}

function toHistoryUrl(scheme) {
  navigator.clipboard.writeText(origin + '/#' + scheme).catch(() => {})
  window.open(normalizeUrl(scheme), '_blank', 'noopener,noreferrer')
}

function deleteHistoryItem(scheme) {
  removeHistory(scheme)
  autoSync()
  showToast('已删除记录', 'info')
}

function invalidHistory() {
  if (!confirm('确定清空所有历史记录？此操作不可撤销。')) return
  clearHistory()
  autoSync()
  showToast('历史记录已清空', 'info')
}

function onImportFile(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (loadEvent) => {
    try {
      const imported = JSON.parse(loadEvent.target.result)
      if (!Array.isArray(imported)) throw new Error('格式错误')
      if (!confirm(`将合并 ${imported.length} 条记录，是否继续？`)) return

      const added = mergeImportHistory(imported)
      autoSync()
      showToast(`导入完成，新增 ${added} 条记录`, 'success')
    } catch {
      showToast('导入失败：文件格式不正确', 'error')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

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
    urlList.value = urlList.value.filter((item) => item !== fullUrl)
    urlList.value.unshift(fullUrl)
    if (urlList.value.length > 20) urlList.value.pop()
    localStorage.setItem('url_list', JSON.stringify(urlList.value))
    addHistory(scheme)
    url.value = ''
    autoSync()
  })
}

function autoSync() {
  scheduleAutoSync(history.value)
}

async function connectGist() {
  try {
    await connect(history.value)
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
    // 错误状态由 composable 维护
  }
}

function disconnectGist() {
  disconnect()
  showToast('已断开 GitHub Gist', 'info')
}

function handleKeydown(event) {
  const isInput = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA'
  const isContentEditable = event.target.isContentEditable

  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    copy()
  }

  if (event.key === 'Escape' && isInput && !isShowHistory.value) {
    url.value = ''
    urlError.value = ''
  }

  if ((event.key === 'h' || event.key === 'H') && !isInput && !isContentEditable) {
    isShowHistory.value = !isShowHistory.value
  }
}

onMounted(() => {
  loadHistory()

  try {
    const saved = JSON.parse(localStorage.getItem('url_list'))
    if (Array.isArray(saved)) urlList.value = saved
  } catch {
    // 忽略损坏的本地缓存
  }

  const connected = loadConfig()
  if (connected) {
    pullFromGist().then((remote) => {
      if (remote && Array.isArray(remote)) {
        mergeHistory(remote)
        pushToGist(history.value)
      }
    })
  }

  if (targetScheme) changeUrl(targetScheme)
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
.app-shell {
  --page-bg: #f3f5f9;
  --page-bg-soft: rgba(255, 255, 255, 0.72);
  --card-bg: rgba(255, 255, 255, 0.82);
  --card-bg-solid: #ffffff;
  --surface-soft: #f5f7fa;
  --surface-elevated: #ffffff;
  --surface-hover: #eef2f7;
  --card-text: #172033;
  --card-text-soft: #46536a;
  --card-text-muted: #7c879b;
  --hairline: rgba(23, 32, 51, 0.1);
  --hairline-strong: rgba(23, 32, 51, 0.18);
  --accent: #4f6ef7;
  --accent-hover: #3f5de0;
  --accent-soft: rgba(79, 110, 247, 0.1);
  --danger: #d84b55;
  --success: #2f9d69;
  --shadow-lg: 0 24px 80px rgba(33, 45, 75, 0.13);
  --shadow-sm: 0 8px 24px rgba(33, 45, 75, 0.08);

  min-height: 100vh;
  padding: 24px clamp(16px, 4vw, 48px) 40px;
  color: var(--card-text);
  background:
    radial-gradient(circle at 12% 12%, rgba(116, 143, 255, 0.14), transparent 30%),
    radial-gradient(circle at 88% 84%, rgba(89, 202, 174, 0.12), transparent 28%),
    var(--page-bg);
  position: relative;
  overflow: hidden;
  outline: none;
  transition: color 0.25s ease, background 0.25s ease;
}

.app-shell.dark {
  --page-bg: #0d111a;
  --page-bg-soft: rgba(18, 24, 36, 0.74);
  --card-bg: rgba(18, 24, 36, 0.82);
  --card-bg-solid: #121824;
  --surface-soft: #171e2c;
  --surface-elevated: #1b2332;
  --surface-hover: #222c3d;
  --card-text: #f2f5fb;
  --card-text-soft: #b7c0d1;
  --card-text-muted: #7f8aa0;
  --hairline: rgba(229, 235, 248, 0.1);
  --hairline-strong: rgba(229, 235, 248, 0.2);
  --accent: #7d96ff;
  --accent-hover: #93a8ff;
  --accent-soft: rgba(125, 150, 255, 0.14);
  --danger: #ff747d;
  --success: #62c995;
  --shadow-lg: 0 24px 90px rgba(0, 0, 0, 0.34);
  --shadow-sm: 0 8px 28px rgba(0, 0, 0, 0.24);
}

.ambient {
  position: fixed;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.28;
  pointer-events: none;
}

.ambient-one {
  top: -180px;
  right: 10%;
  background: #8298ff;
}

.ambient-two {
  left: -200px;
  bottom: -180px;
  background: #6ed7bc;
}

.app-header {
  width: min(1080px, 100%);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--hairline);
  border-radius: 13px;
  background: var(--page-bg-soft);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(16px);
}

.brand-mark svg {
  width: 22px;
  height: 22px;
  color: var(--accent);
}

.brand-copy {
  display: grid;
  gap: 1px;
}

.brand-copy strong {
  font-size: 14px;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.brand-copy small {
  font-size: 10px;
  color: var(--card-text-muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.github-link {
  min-height: 40px;
  padding: 0 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--page-bg-soft);
  color: var(--card-text-soft);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(16px);
  transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.github-link svg {
  width: 17px;
  height: 17px;
}

.github-link:hover {
  color: var(--card-text);
  border-color: var(--hairline-strong);
  transform: translateY(-1px);
}

.workspace {
  width: min(760px, 100%);
  margin: clamp(54px, 9vh, 100px) auto 0;
  position: relative;
  z-index: 1;
}

.workspace-head {
  text-align: center;
  margin-bottom: 24px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--card-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 14%, transparent);
}

h1 {
  margin: 0;
  font-size: clamp(34px, 6vw, 58px);
  line-height: 1.04;
  letter-spacing: -0.055em;
  font-weight: 680;
}

h1 span {
  color: var(--accent);
}

.hero-description {
  max-width: 590px;
  margin: 18px auto 0;
  color: var(--card-text-soft);
  font-size: 15px;
  line-height: 1.75;
}

.hero-description code {
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  background: var(--page-bg-soft);
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.88em;
}

.mode-tabs {
  width: fit-content;
  margin: 26px auto 0;
  padding: 4px;
  display: flex;
  gap: 4px;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: var(--page-bg-soft);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(18px);
}

.mode-tabs button {
  min-height: 38px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--card-text-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.mode-tabs button svg {
  width: 16px;
  height: 16px;
}

.mode-tabs button.active {
  background: var(--card-bg-solid);
  color: var(--card-text);
  box-shadow: 0 2px 10px rgba(33, 45, 75, 0.1);
}

.dark .mode-tabs button.active {
  background: var(--surface-elevated);
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.22);
}

.tab-count {
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10px;
}

.content-card {
  min-height: 220px;
  padding: clamp(20px, 4vw, 34px);
  border: 1px solid var(--hairline);
  border-radius: 24px;
  background: var(--card-bg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(24px) saturate(145%);
}

.history-view {
  min-width: 0;
}

.workspace-footer {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--card-text-muted);
  font-size: 11px;
}

.workspace-footer kbd {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--hairline);
  border-bottom-color: var(--hairline-strong);
  border-radius: 6px;
  background: var(--page-bg-soft);
  color: var(--card-text-soft);
  font: inherit;
  font-weight: 650;
  box-shadow: 0 2px 0 var(--hairline);
}

.divider {
  width: 1px;
  height: 12px;
  margin: 0 4px;
  background: var(--hairline-strong);
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.panel-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 640px) {
  .app-shell {
    padding: 16px 14px 28px;
    overflow-y: auto;
  }

  .brand-copy small,
  .github-link span {
    display: none;
  }

  .github-link {
    width: 40px;
    padding: 0;
    justify-content: center;
  }

  .workspace {
    margin-top: 54px;
  }

  h1 {
    font-size: clamp(32px, 11vw, 44px);
  }

  .hero-description {
    font-size: 14px;
    line-height: 1.65;
  }

  .content-card {
    padding: 20px 16px;
    border-radius: 20px;
  }

  .workspace-footer {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell *,
  .app-shell *::before,
  .app-shell *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
