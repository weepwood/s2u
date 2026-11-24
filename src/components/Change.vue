<template>
  <main class="app-shell" :class="{ dark: darkMode }" :data-switch-direction="switchDirection" tabindex="-1" @keydown="handleKeydown">
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
        </span>
      </a>

      <div class="header-actions">
        <button v-if="!showCloseMsg"
          type="button"
          class="launch-trigger"
          aria-label="打开快捷启动命令面板"
          aria-keyshortcuts="Control+K Meta+K"
          @click="commandPaletteOpen = true"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.6" stroke="currentColor" stroke-width="1.8"/>
            <path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span>快捷启动</span>
          <kbd>Ctrl / ⌘ K</kbd>
        </button>
        <button v-if="!showCloseMsg" class="cloud-trigger" type="button" aria-label="打开云同步设置" :title="pending ? '有待同步的修改' : '云端同步'" :data-status="syncStatus" @click="openSyncSettings">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.5 17A4.5 4.5 0 1 1 8 8a6.5 6.5 0 0 1 12.2 3.1A3 3 0 0 1 19 17H7.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><span v-if="pending || syncStatus" class="cloud-dot" aria-hidden="true"></span>
        </button>
        <a class="github-link" href="https://github.com/weepwood/s2u" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.24c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.74-1.55-2.58-.3-5.29-1.29-5.29-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.93 10.93 0 0 1 5.75 0C17.03 5.03 18 5.34 18 5.34c.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.4-2.72 5.38-5.31 5.67.42.36.79 1.07.79 2.16v3.25c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/>
          </svg>
          <span>GitHub</span>
        </a>
        <button ref="helpTrigger" type="button" class="shortcut-help-trigger"
          aria-label="查看快捷键" title="查看键盘快捷键（?）" @click="helpOpen = true">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
            <path d="M9.6 9a2.6 2.6 0 1 1 4.4 1.9c-1.2 1-2 1.4-2 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M12 17.2h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <ThemeToggle :dark-mode="darkMode" @toggle="toggleDark" />
      </div>
    </header>

    <section class="workspace" aria-label="链接转换工作区">
      <div class="workspace-head">
        <nav v-if="!showCloseMsg" class="mode-tabs segmented-tabs" role="tablist" aria-label="页面模式" @keydown="handleTabNavigation">
          <button
            id="create-tab"
            type="button"
            role="tab"
            :class="{ active: activePanel === 'create' }"
            :aria-selected="activePanel === 'create'"
            :tabindex="activePanel === 'create' ? 0 : -1"
            aria-controls="create-panel"
            @click="switchPanel('create')"
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
            :class="{ active: activePanel === 'history' }"
            :aria-selected="activePanel === 'history'"
            :tabindex="activePanel === 'history' ? 0 : -1"
            aria-controls="history-panel"
            @pointerenter="warmPanel('history')"
            @focus="warmPanel('history')"
            @click="switchPanel('history')"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8v4l2.5 1.5M4.93 5.93A9 9 0 1 1 3 11.5M3 5v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            历史记录
            <span v-if="history.length" class="tab-count">{{ history.length }}</span>
          </button>
          <button
            id="common-tab"
            type="button"
            role="tab"
            :class="{ active: activePanel === 'common' }"
            :aria-selected="activePanel === 'common'"
            :tabindex="activePanel === 'common' ? 0 : -1"
            aria-controls="common-panel"
            @pointerenter="warmPanel('common')"
            @focus="warmPanel('common')"
            @click="switchPanel('common')"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 7h14M5 12h14M5 17h14M8 5v14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            常用链接
            <span class="tab-count">{{ commonLinks.length }}</span>
          </button>
        </nav>
      </div>

      <div class="content-card">
        <Transition name="panel" @before-enter="activateEnteringPanel" @before-leave="prepareLeavingPanel">
          <ClosePanel
            v-if="showCloseMsg"
            key="redirect"
            :policy="redirectPolicy"
            :attempted="redirectAttempted"
            @open="attemptRedirect"
            @copy="copyCommonRaw(redirectPolicy.target)"
            @cancel="cancelClose"
          />

          <HistoryWorkspace
            v-else-if="activePanel === 'history'"
            key="history"
            :history="history"
            :search-query="searchQuery"
            :filtered-history="filteredHistory"
            :show-settings="showSettings"
            @update:search-query="searchQuery = $event"
            @select="toHistoryUrl"
            @delete="deleteHistoryItem"
            @clear="invalidHistory"
            @export="exportHistory"
            @toggle-settings="openSyncSettings"
            @import-file="onImportFile"
          />

          <div
            v-else-if="activePanel === 'common'"
            id="common-panel"
            key="common"
            role="tabpanel"
            aria-labelledby="common-tab"
          >
            <CommonLinksPanel
              ref="commonPanel"
              :items="commonLinks"
              @save="saveCommonLink"
              @remove="removeCommonLink"
              @reset="resetCommonLinks"
              @open="openCommonLink"
              @copy="copyCommonLink"
              @copy-raw="copyCommonRaw"
              @move="moveCommonLink"
              @pin="pinCommonLink"
              @export="exportCommonLinks"
              @import="importCommonLinks"
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
            @qr="openQrShare"
            @goto="gotoUrl"
          />
        </Transition>
      </div>
    </section>

    <SettingsPanel v-if="showSettings" :cloud="cloud" :workspace-preview="workspacePreview" @close="closeSyncSettings"
      @export-workspace="exportWorkspace" @preview-workspace="previewWorkspace" @restore-workspace="restoreWorkspace"
      @cancel-workspace="clearWorkspacePreview" @export-before-restore="exportBeforeRestore"
      @connect="connectGist" @sync="syncGist" @disconnect="disconnectGist"
      @export-backup="exportGistRecovery" @export-bundle="exportGistBundle" @restore="restoreGistRecovery" @test="testGistConnection" />
    <CommandPalette v-if="commandPaletteOpen" :common-links="commonLinks" :history="history"
      @close="commandPaletteOpen = false" @open="openCommonLink" @copy="copyCommonRaw" />
    <QrShareDialog v-if="qrShareUrl" :share-url="qrShareUrl" @close="qrShareUrl = ''" />
    <ShortcutHelp v-if="helpOpen" @close="closeHelp" />
    <Toast :message="toast.message" :type="toast.type" :duration="toast.duration" :key="toast.key" />
  </main>
</template>

<script setup>
import { ref, computed, watch, nextTick, defineAsyncComponent, h, onMounted, onBeforeUnmount } from 'vue'
import ThemeToggle from './ThemeToggle.vue'
import UrlInput from './UrlInput.vue'
import ClosePanel from './ClosePanel.vue'
import Toast from './Toast.vue'
import ShortcutHelp from './ShortcutHelp.vue'
import QrShareDialog from './QrShareDialog.vue'
import CommandPalette from './CommandPalette.vue'
import { useDarkMode, DARK_MODE_STORAGE_KEY } from '../composables/useDarkMode.js'
import { makeWorkspaceBackup, parseWorkspaceBackup, planWorkspaceRestore, runWorkspaceRestore, RECOVERY_KEY, MAX_WORKSPACE_BACKUP_BYTES } from '../domain/sync/workspaceBackup.js'
import { useHistory, HISTORY_STORAGE_KEY } from '../composables/useHistory.js'
import { useCommonLinks, COMMON_LINKS_STORAGE_KEY } from '../composables/useCommonLinks.js'
import { useCloudSync } from '../composables/useCloudSync.js'
import { COMMON_FILE, SETTINGS_FILE } from '../domain/sync/gistClient.js'
import { useClipboard } from '../composables/useClipboard.js'
import {
  decodeShareTarget,
  encodeShareLink,
  getAppBaseUrl,
  getTargetOpenPolicy,
  normalizeTarget,
} from '../domain/linkCodec.js'

// 仅首屏创建面板同步加载。历史/收藏 UI 在用户访问对应标签时再下载。
const loadHistoryWorkspace = () => import('./HistoryWorkspace.vue')
const loadCommonLinksPanel = () => import('./CommonLinksPanel.vue')
const LoadingPanel = {
  render: () => h('div', { class: 'lazy-panel-loading', role: 'status' }, '正在加载界面…'),
}
const HistoryWorkspace = defineAsyncComponent({
  loader: loadHistoryWorkspace,
  loadingComponent: LoadingPanel,
  delay: 120,
})
const SettingsPanel = defineAsyncComponent(() => import('./SettingsPanel.vue'))
const CommonLinksPanel = defineAsyncComponent({
  loader: loadCommonLinksPanel,
  loadingComponent: LoadingPanel,
  delay: 120,
})
function warmPanel(panel) {
  const load = panel === 'history' ? loadHistoryWorkspace
    : panel === 'common' ? loadCommonLinksPanel : null
  load?.().catch(() => {}) // 预取失败时仍由 Vue 的异步组件提供错误处理。
}

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

const {
  links: commonLinks,
  storageError: commonStorageError,
  load: loadCommonLinks,
  save: persistCommonLink,
  remove: deleteCommonLink,
  restoreDefaults: restoreCommonLinks,
  move: moveCommonLinkStore,
  pin: pinCommonLinkStore,
  exportJSON: exportCommonJSON,
  inspectImport: inspectCommonImport,
  importJSON: importCommonJSON,
  validateSync: validateCommonSync,
  syncSnapshot: commonSyncSnapshot,
  applySync: applyCommonSync,
} = useCommonLinks()
const commonPanel = ref(null)
const { copyText, copyToClipboard, cleanup: cleanupClipboard } = useClipboard()

const cloud = useCloudSync()
const {
  cloudToken, cloudGistId, syncStatus, syncError, lastSyncTime, preferences, pending,
  loadConfig, connect, disconnect, pushToGist, pullFromGist, scheduleAutoSync,
  cleanup: cleanupSync, getLatestRecovery,
} = cloud

const commandPaletteOpen = ref(false)
const qrShareUrl = ref('')
const helpOpen = ref(false)
const helpTrigger = ref(null)
const url = ref('')
const urlError = ref('')
const activePanel = ref('create')
const switchDirection = ref('forward')
const TAB_ORDER = ['create', 'history', 'common']

function prepareLeavingPanel(element) {
  // 视觉上允许短暂重叠，但旧面板不能抢占焦点或被辅助技术当成有效页面。
  element.inert = true
  element.setAttribute('aria-hidden', 'true')
}

function activateEnteringPanel(element) {
  // 连续快速切换时，Vue 可能复用中途退场的节点。
  element.inert = false
  element.removeAttribute('aria-hidden')
}

function switchPanel(panel) {
  const nextIndex = TAB_ORDER.indexOf(panel)
  const previousIndex = TAB_ORDER.indexOf(activePanel.value)
  if (nextIndex < 0 || nextIndex === previousIndex) return
  // 在 Vue 更改面板前同步设置方向，保证首次过渡也沿正确方向滑入。
  switchDirection.value = nextIndex > previousIndex ? 'forward' : 'backward'
  activePanel.value = panel
}

function handleTabNavigation(event) {
  const tab = event.target instanceof Element ? event.target.closest('[role="tab"]') : null
  if (!tab || !event.currentTarget.contains(tab)) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return

  const activeIndex = TAB_ORDER.indexOf(activePanel.value)
  let nextIndex
  switch (event.key) {
    case 'ArrowRight':
      nextIndex = (activeIndex + 1) % TAB_ORDER.length
      break
    case 'ArrowLeft':
      nextIndex = (activeIndex + TAB_ORDER.length - 1) % TAB_ORDER.length
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = TAB_ORDER.length - 1
      break
    default:
      return
  }

  event.preventDefault()
  const next = TAB_ORDER[nextIndex]
  switchPanel(next)
  nextTick(() => document.getElementById(`${next}-tab`)?.focus())
}
const showSettings = ref(false)
let syncTrigger = null
function openSyncSettings() { syncTrigger = document.activeElement; showSettings.value = true }
function closeSyncSettings() { showSettings.value = false; clearWorkspacePreview(); nextTick(() => syncTrigger?.isConnected && syncTrigger.focus()) }
const showCloseMsg = ref(false)
const redirectPolicy = ref(null)
const redirectAttempted = ref(false)
let autoRedirectTimer = null
const origin = getAppBaseUrl()

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
  cancelAutoRedirect()
  const policy = getTargetOpenPolicy(inputUrl)
  redirectPolicy.value = null
  redirectAttempted.value = false
  showCloseMsg.value = false

  if (!policy.ok) {
    urlError.value = policy.error
    showToast(policy.error, 'error', 4000)
    return
  }

  // 未知应用协议在明确确认前不导航，也不写入历史。
  if (policy.needsConfirmation) {
    redirectPolicy.value = policy
    showCloseMsg.value = true
    return
  }

  redirectPolicy.value = policy
  showCloseMsg.value = true
  if (policy.protocol === 'http:' || policy.protocol === 'https:') {
    attemptRedirect()
  } else {
    // 外部协议可能中断首屏 load；先让回退面板完成渲染，再自动尝试。
    // 若页面资源迟迟未完成，短超时保证不会永久等待。
    if (document.readyState === 'complete') {
      scheduleAutoRedirect()
    } else {
      window.addEventListener('load', scheduleAutoRedirect, { once: true })
      autoRedirectTimer = window.setTimeout(attemptRedirect, 1200)
    }
  }
}

function cancelAutoRedirect() {
  window.removeEventListener('load', scheduleAutoRedirect)
  if (autoRedirectTimer !== null) window.clearTimeout(autoRedirectTimer)
  autoRedirectTimer = null
}

function scheduleAutoRedirect() {
  cancelAutoRedirect()
  autoRedirectTimer = window.setTimeout(attemptRedirect, 0)
}

function attemptRedirect() {
  cancelAutoRedirect()
  const policy = redirectPolicy.value
  if (!policy?.ok) return

  // 手动点击时保持同步导航，不能在用户操作与 Scheme 调用之间等待网络。
  if (!redirectAttempted.value) {
    const saved = addHistory(policy.target)
    if (!saved) notifyStorageError()
    autoSync()
  }
  redirectAttempted.value = true
  try {
    window.location.replace(policy.target)
  } catch {
    showToast('无法打开此链接，请确认浏览器与目标应用支持该协议', 'error', 4000)
  }
  // 外部应用是否真正启动无法可靠检测；始终保留手动重试及复制入口。
}

function readShareHash() {
  cancelAutoRedirect()
  const target = decodeShareTarget(window.location.hash)
  if (target) {
    changeUrl(target)
  } else {
    showCloseMsg.value = false
    redirectPolicy.value = null
    redirectAttempted.value = false
  }
}

function cancelClose() {
  // 不依赖配置的公开域名，避免预览站点上的跨域 replaceState 异常。
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  readShareHash()
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

function openQrShare(shareUrl) {
  // 避免外部事件注入二维码内容。
  if (shareUrl && shareUrl === toUrl.value) qrShareUrl.value = shareUrl
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

function pinCommonLink(id) {
  if (pinCommonLinkStore(id)) {
    showToast('常用链接已置顶', 'success')
  } else if (commonStorageError.value) {
    showToast(commonStorageError.value, 'error', 4000)
  }
}

function moveCommonLink(id, offset) {
  if (moveCommonLinkStore(id, offset)) {
    showToast('链接顺序已保存', 'success')
  } else if (commonStorageError.value) {
    showToast(commonStorageError.value, 'error', 4000)
  }
}

function exportCommonLinks() {
  try {
    const blob = new Blob([exportCommonJSON()], { type: 'application/json;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = 's2u-common-links-' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
    showToast('常用链接备份已导出', 'success')
  } catch {
    showToast('导出常用链接失败', 'error', 4000)
  }
}

async function importCommonLinks(file) {
  if (file.size > 2 * 1024 * 1024) {
    showToast('导入文件不能超过 2 MB', 'error', 4000)
    return
  }
  try {
    const imported = JSON.parse(await file.text())
    const summary = inspectCommonImport(imported)
    if (!summary.added) {
      showToast('备份中的链接已全部存在，无需重复导入')
      return
    }
    if (!confirm(`备份包含 ${summary.count} 条，预计新增 ${summary.added} 条，跳过重复 ${summary.duplicates} 条。确认追加导入？`)) return
    const added = importCommonJSON(imported)
    if (added < 0) {
      showToast(commonStorageError.value, 'error', 4000)
      return
    }
    showToast(`已导入 ${added} 条常用链接`, 'success')
  } catch (error) {
    showToast(error?.message || '备份导入失败', 'error', 4000)
  }
}

async function copyCommonRaw(target) {
  const normalized = normalizeTarget(target)
  if (!normalized.ok) {
    showToast(normalized.error, 'error', 4000)
    return
  }
  try {
    await navigator.clipboard.writeText(normalized.target)
    showToast('原始链接已复制', 'success')
  } catch {
    showToast('复制原始链接失败，请检查剪贴板权限', 'error', 4000)
  }
}

function openCommonLink(target) {
  // 用户点击时直接导航到经过统一校验的原始地址，而非 s2u 分享 URL。
  // 保持同步调用，以保留浏览器启动自定义应用 Scheme 所需的用户操作上下文。
  const normalized = normalizeTarget(target)
  if (!normalized.ok) {
    showToast(normalized.error, 'error', 4000)
    return
  }
  try {
    window.location.assign(normalized.target)
  } catch {
    showToast('无法打开此链接，请确认目标应用或浏览器支持该协议', 'error', 4000)
  }
}

function saveCommonLink(item) {
  try {
    const persisted = persistCommonLink(item)
    if (persisted) {
      commonPanel.value?.cancelEdit()
      showToast('常用链接已保存', 'success')
    } else {
      showToast(commonStorageError.value, 'error', 4000)
    }
  } catch (error) {
    commonPanel.value?.showError(error.message || '链接无效')
  }
}

function removeCommonLink(id) {
  if (deleteCommonLink(id)) showToast('常用链接已删除')
  else if (commonStorageError.value) showToast(commonStorageError.value, 'error', 4000)
}

function resetCommonLinks() {
  if (restoreCommonLinks()) showToast('已恢复默认应用', 'success')
  else showToast(commonStorageError.value, 'error', 4000)
}

async function copyCommonLink(item) {
  const normalized = normalizeTarget(item.target)
  if (!normalized.ok) {
    showToast(normalized.error, 'error', 4000)
    return
  }
  try {
    const shareLink = encodeShareLink(origin, normalized.target)
    await navigator.clipboard.writeText(shareLink)
    const saved = addHistory(normalized.target)
    if (!saved) notifyStorageError()
    autoSync()
    showToast('已复制 ' + item.name + ' 的分享链接', 'success')
  } catch {
    showToast('复制失败，请检查浏览器剪贴板权限', 'error', 4000)
  }
}

function autoSync() {
  if (!showCloseMsg.value) scheduleAutoSync(() => syncGist({ silent: true }))
}

let syncPromise = null
let syncRequested = false
let activeContext = null
let applyingRemote = false
const workspacePreview = ref(null)
let workspaceIncoming = null
let previewGeneration = 0
function clearWorkspacePreview() { previewGeneration++; workspaceIncoming = null; workspacePreview.value = null }
function currentWorkspace() {
  return makeWorkspaceBackup({ history: historySnapshot(), commonLinks: commonSyncSnapshot(true), darkMode: darkMode.value })
}
function downloadWorkspace(data, name) {
  const href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}))
  const link = document.createElement('a')
  link.href = href; link.download = name
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
function exportWorkspace() {
  try {
    if (storageError.value || commonStorageError.value) throw new Error('本机存在存储异常，请先处理再导出')
    downloadWorkspace(currentWorkspace(), 's2u-workspace-backup.json')
  } catch (error) { showToast(error.message, 'error') }
}
function exportBeforeRestore() {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY)
    if (!raw) { showToast('暂无恢复前快照', 'info'); return }
    downloadWorkspace(JSON.parse(raw), 's2u-before-restore.json')
  } catch (error) { showToast(error.message, 'error') }
}
async function previewWorkspace(file) {
  clearWorkspacePreview()
  const generation = previewGeneration
  try {
    if (!file || file.size > MAX_WORKSPACE_BACKUP_BYTES) throw new Error('请选择不超过 8 MiB 的 JSON 备份')
    const raw = await file.text()
    if (generation !== previewGeneration || !showSettings.value) return
    const incoming = parseWorkspaceBackup(raw, {inspectHistory:inspectImport, validateCommon:validateCommonSync})
    const plan = planWorkspaceRestore(currentWorkspace(), incoming, validateCommonSync)
    workspaceIncoming = incoming
    workspacePreview.value = { ...plan.summary, name:file.name }
  } catch (error) {
    if (generation === previewGeneration) workspacePreview.value = {error:error.message}
  }
}
function restoreWorkspace({ theme = false } = {}) {
  if (!workspaceIncoming || syncPromise || ['connecting','syncing'].includes(syncStatus.value)) return
  if (storageError.value || commonStorageError.value) { workspacePreview.value = {error:'本机存在存储异常，已停止恢复'}; return }
  try {
    const before = currentWorkspace()
    const plan = planWorkspaceRestore(before, workspaceIncoming, validateCommonSync)
    if (!confirm('合并备份至本机？已有同地址收藏保持不变，历史删除标记仍有效。恢复前保存快照，并暂停自动同步。')) return
    cloud.setPreferences({auto:false})
    applyingRemote = true
    try {
      runWorkspaceRestore(localStorage, [HISTORY_STORAGE_KEY, COMMON_LINKS_STORAGE_KEY, DARK_MODE_STORAGE_KEY], before, () => {
        mergeHistory(plan.history)
        if (plan.commonLinks) applyCommonSync(plan.commonLinks, true)
        if (theme && plan.settings) {
          localStorage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(plan.settings.darkMode))
          darkMode.value = plan.settings.darkMode
        }
      }, () => { loadHistory(); loadCommonLinks(); darkMode.value = before.settings.darkMode })
    } finally { applyingRemote = false }
    cloud.markPending()
    clearWorkspacePreview()
    showToast('工作区已合并恢复，自动同步已暂停', 'success', 4000)
  } catch (error) {
    cloud.markPending()
    workspacePreview.value = {error:error.message}
  }
}

function validateSettings(value) {
  if (value?.version !== 1 || typeof value.darkMode !== 'boolean') throw new Error('云端主题格式错误')
  return { version: 1, darkMode: value.darkMode }
}
watch(commonLinks, () => { if (!applyingRemote && preferences.value.common) autoSync() }, { deep: true, flush: 'sync' })
watch(darkMode, () => { if (!applyingRemote && preferences.value.theme) autoSync() }, { flush: 'sync' })

function syncGist({ silent = false, resolve = '' } = {}) {
  if (!cloudToken.value || !cloudGistId.value || showCloseMsg.value || syncStatus.value === 'connecting') return Promise.resolve(false)
  const ctx = cloud.context()
  if (syncPromise && activeContext && cloud.isCurrent(activeContext)) {
    syncRequested = true
    return syncPromise
  }
  activeContext = ctx
  cloud.markPending()
  const task = (async () => {
    do {
      syncRequested = false
      const remote = await pullFromGist()
      if (!cloud.isCurrent(ctx) || remote === null) return false
      const summary = inspectImport(remote)
      if (summary.invalid || (Array.isArray(remote?.tombstones) && summary.tombstones !== remote.tombstones.length)) throw new Error('云端历史包含无效记录或删除标记，已停止同步')
      const extras = {}
      const prefs = { ...preferences.value }
      if (prefs.common) {
        const validate = data => {
          const value = validateCommonSync(data)
          if (!prefs.icons && value.items.some(item => item.icon)) throw new Error('云端收藏包含图标，请开启图标同步或关闭收藏同步；不会覆盖云端图标')
          return value
        }
        extras[COMMON_FILE] = cloud.prepareOptional(COMMON_FILE, commonSyncSnapshot(prefs.icons), validate, resolve)
      }
      if (prefs.theme) extras[SETTINGS_FILE] = cloud.prepareOptional(SETTINGS_FILE, { version: 1, darkMode: darkMode.value }, validateSettings, resolve)
      if (!cloud.isCurrent(ctx)) return false
      applyingRemote = true
      try {
        mergeHistory(remote)
        if (extras[COMMON_FILE]) applyCommonSync(extras[COMMON_FILE], prefs.icons)
        if (extras[SETTINGS_FILE]) darkMode.value = extras[SETTINGS_FILE].darkMode
      } finally { applyingRemote = false }
      notifyStorageError()
      if (!await pushToGist(historySnapshot(), extras)) return false
      resolve = ''
    } while (syncRequested && cloud.isCurrent(ctx))
    if (!silent) showToast('云端同步完成', 'success')
    return true
  })().catch(error => {
    if (cloud.isCurrent(ctx)) { syncStatus.value = 'error'; syncError.value = error.message || '同步失败' }
    return false
  })
  const wrapped = task.finally(() => {
    if (syncPromise === wrapped) { syncPromise = null; activeContext = null; syncRequested = false }
  })
  syncPromise = wrapped
  return wrapped
}

async function connectGist(options) {
  try {
    await connect(historySnapshot(), { ...options, validate: data => {
      const summary = inspectImport(data)
      if (summary.invalid || (Array.isArray(data?.tombstones) && summary.tombstones !== data.tombstones.length)) throw new Error('Gist 包含无效历史记录或删除标记')
    } })
    if (await syncGist({ silent: true })) showToast('已连接 GitHub Gist', 'success')
  } catch { /* 连接错误由 composable 维护 */ }
}

async function testGistConnection() {
  try {
    const payload = await cloud.testConnection()
    const summary = inspectImport(payload)
    if (summary.invalid || (Array.isArray(payload?.tombstones) && summary.tombstones !== payload.tombstones.length)) throw new Error('历史文件包含无效数据')
    showToast('读取验证通过，写入权限须实际同步确认', 'success')
  } catch (error) { syncError.value = error.message || '连接检查失败' }
}

async function restoreGistRecovery({ index, version }) {
  const ctx = cloud.context()
  if (['connecting','syncing'].includes(syncStatus.value)) return
  try {
    const snapshot = version ? await cloud.readRevision(version) : getLatestRecovery(index)
    if (!cloud.isCurrent(ctx) || !snapshot) return
    const summary = inspectImport(snapshot)
    if (summary.invalid || (Array.isArray(snapshot?.tombstones) && summary.tombstones !== snapshot.tombstones.length)) throw new Error('备份包含无效记录或删除标记')
    if (!confirm('备份包含 ' + summary.valid + ' 条记录及 ' + summary.tombstones + ' 个删除标记。将合并到本机历史，是否继续？')) return
    if (!cloud.isCurrent(ctx) || ['connecting','syncing'].includes(syncStatus.value)) throw new Error('连接已变化，请重新选择备份')
    localStorage.setItem('s2u_history_before_recovery', JSON.stringify(historySnapshot()))
    mergeHistory(snapshot)
    cloud.markPending()
    showToast('已合并恢复至本机，确认后可手动同步', 'success')
  } catch (error) { if (cloud.isCurrent(ctx)) { syncError.value = error.message; syncStatus.value = 'error' } }
}

function exportGistBundle(index) {
  try {
    const backup = cloud.getBackupBundle(index)
    if (!backup) return
    const href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = href
    link.download = 's2u-gist-workspace-backup.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  } catch (error) { showToast(error.message || '导出备份失败', 'error', 4000) }
}

function exportGistRecovery(index = -1) {
  try {
    const snapshot = getLatestRecovery(index)
    if (!snapshot) {
      showToast('目前没有同步前备份，首次成功推送后会自动保留', 'info', 4000)
      return
    }
    // 导出标准 s2u-history JSON，可用历史记录“导入”功能尝试恢复。
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = 's2u-gist-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
    showToast('同步前备份已导出，请妥善保管历史数据', 'success')
  } catch (error) {
    showToast(error?.message || '无法导出同步备份', 'error', 4000)
  }
}

function disconnectGist() {
  disconnect()
  syncPromise = null; activeContext = null; syncRequested = false
  showToast('已断开 GitHub Gist', 'info')
}

function closeHelp() {
  helpOpen.value = false
  nextTick(() => helpTrigger.value?.focus())
}

function handleKeydown(event) {
  if (event.isComposing) return
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (!document.querySelector('dialog[open]')) commandPaletteOpen.value = true
    return
  }
  // 原生 modal dialog 的键盘交互优先于页面快捷键，Esc 由浏览器关闭弹窗。
  if (document.querySelector('dialog[open]')) return

  const target = event.target
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  const isContentEditable = target instanceof HTMLElement && target.isContentEditable

  if (event.key === '?' && !isInput && !isContentEditable && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault()
    helpOpen.value = true
    return
  }

  if (activePanel.value === 'create' && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    copy()
    return
  }

  if (event.key === 'Escape' && isInput && activePanel.value === 'create') {
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
    switchPanel(activePanel.value === 'history' ? 'create' : 'history')
  }
}

let initialSyncIdle = null
let initialSyncFallback = null
function onSyncFocus(event) {
  const transientError = /超时|请求失败（5\\d\\d）|fetch|network/i.test(syncError.value)
  const retryOnline = event?.type === 'online' && syncStatus.value === 'error' && transientError
  if (!showCloseMsg.value && cloudToken.value && preferences.value.auto &&
      !['connecting','syncing'].includes(syncStatus.value) && (syncStatus.value !== 'error' || retryOnline) &&
      (pending.value || Date.now() - (lastSyncTime.value || 0) > 60000)) {
    syncGist({ silent: true })
  }
}
function scheduleInitialSync() {
  if (!preferences.value.auto) return
  if ('requestIdleCallback' in window) {
    initialSyncIdle = window.requestIdleCallback(() => {
      initialSyncIdle = null
      syncGist({ silent: true }).catch(() => {})
    }, { timeout: 2000 })
  } else {
    initialSyncFallback = window.setTimeout(() => {
      initialSyncFallback = null
      syncGist({ silent: true }).catch(() => {})
    }, 800)
  }
}

onMounted(() => {
  loadHistory()
  notifyStorageError()
  loadCommonLinks()
  if (commonStorageError.value) showToast(commonStorageError.value, 'error', 4000)

  try {
    localStorage.removeItem('url_list')
  } catch {
    // 忽略无法清理的旧缓存。
  }

  const hasSavedConfig = loadConfig()
  window.addEventListener('hashchange', readShareHash)
  window.addEventListener('online', onSyncFocus)
  window.addEventListener('focus', onSyncFocus)
  if (window.location.hash) {
    // 分享链接转发优先；无需与初始云同步竞争网络资源。
    readShareHash()
  } else if (hasSavedConfig) {
    // 有效数据已从本地恢复。等首屏有机会绘制后再执行可选的云同步。
    scheduleInitialSync()
  }
})

onBeforeUnmount(() => {
  if (initialSyncIdle !== null) window.cancelIdleCallback(initialSyncIdle)
  if (initialSyncFallback !== null) window.clearTimeout(initialSyncFallback)
  window.removeEventListener('hashchange', readShareHash)
  window.removeEventListener('online', onSyncFocus)
  window.removeEventListener('focus', onSyncFocus)
  cancelAutoRedirect()
  cleanupClipboard()
  cleanupSync()
})
</script>

<style>/* 仅用于首次加载非默认标签时的短暂占位；请求完成后立即展示真实组件。 */
.app-shell .lazy-panel-loading {
  min-height: 160px;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--card-text-muted);
  letter-spacing: 0.02em;
}
</style>
