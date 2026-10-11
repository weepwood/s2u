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
        <nav v-if="!showCloseMsg" class="mode-tabs" role="tablist" aria-label="页面模式" @keydown="handleTabNavigation">
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
            :count-down="countDown"
            :origin="origin"
            @cancel="cancelClose"
          />

          <HistoryWorkspace
            v-else-if="activePanel === 'history'"
            key="history"
            :history="history"
            :search-query="searchQuery"
            :filtered-history="filteredHistory"
            :show-settings="showSettings"
            :cloud-token="cloudToken"
            :cloud-gist-id="cloudGistId"
            :sync-status="syncStatus"
            :sync-error="syncError"
            :last-sync-time="lastSyncTime"
            @update:search-query="searchQuery = $event"
            @select="toHistoryUrl"
            @delete="deleteHistoryItem"
            @clear="invalidHistory"
            @export="exportHistory"
            @toggle-settings="showSettings = !showSettings"
            @import-file="onImportFile"
            @update:cloud-token="cloudToken = $event"
            @connect="connectGist"
            @disconnect="disconnectGist"
            @sync="syncGist"
            @export-backup="exportGistRecovery"
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
            @goto="gotoUrl"
          />
        </Transition>
      </div>
    </section>

    <Toast :message="toast.message" :type="toast.type" :duration="toast.duration" :key="toast.key" />
  </main>
</template>

<script setup>
import { ref, computed, nextTick, defineAsyncComponent, h, onMounted, onBeforeUnmount } from 'vue'
import ThemeToggle from './ThemeToggle.vue'
import UrlInput from './UrlInput.vue'
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
import ClosePanel from './ClosePanel.vue'
import Toast from './Toast.vue'
import { useDarkMode } from '../composables/useDarkMode.js'
import { useHistory } from '../composables/useHistory.js'
import { useCommonLinks } from '../composables/useCommonLinks.js'
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
} = useCommonLinks()
const commonPanel = ref(null)
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
  getLatestRecovery,
} = useCloudSync()

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
  scheduleAutoSync(() => syncGist({ silent: true }))
}

let syncPromise = null
let syncRequested = false
let syncToastWanted = false

function syncGist({ silent = false } = {}) {
  if (!cloudToken.value || !cloudGistId.value) return Promise.resolve(false)

  // 同一标签页只允许一个完整的拉取—合并—推送流程。
  // 并发触发会请求当前流程结束后再跑一轮，避免遗漏期间的新本地修改。
  if (syncPromise) {
    syncRequested = true
    syncToastWanted ||= !silent
    return syncPromise
  }

  syncRequested = false
  syncToastWanted = !silent

  const task = (async () => {
    do {
      syncRequested = false
      if (!cloudToken.value || !cloudGistId.value) return false

      const remote = await pullFromGist()
      if (remote === null) {
        if (!cloudToken.value || !cloudGistId.value) return false
        if (syncRequested) continue
        if (syncToastWanted) showToast(syncError.value || '同步失败', 'error', 4000)
        return false
      }

      // 拉取返回后再次检查连接状态，避免断开后继续合并或写入。
      if (!cloudToken.value || !cloudGistId.value) return false

      mergeHistory(remote)
      notifyStorageError()

      let pushed = false
      try {
        pushed = await pushToGist(historySnapshot())
      } catch (error) {
        if (!cloudToken.value || !cloudGistId.value) return false
        if (syncRequested) continue
        if (syncToastWanted) {
          showToast(syncError.value || error.message || '同步失败', 'error', 4000)
        }
        return false
      }

      if (!pushed) {
        if (!cloudToken.value || !cloudGistId.value) return false
        if (syncRequested) continue
        if (syncToastWanted) showToast(syncError.value || '同步失败', 'error', 4000)
        return false
      }
    } while (syncRequested && cloudToken.value && cloudGistId.value)

    if (syncToastWanted) showToast('历史记录已同步', 'success')
    return true
  })().catch((error) => {
    if (cloudToken.value && cloudGistId.value) {
      syncStatus.value = 'error'
      syncError.value = error?.message || '同步失败'
      if (syncToastWanted) showToast(syncError.value, 'error', 4000)
    }
    return false
  })

  let wrapped
  wrapped = task.finally(() => {
    if (syncPromise === wrapped) syncPromise = null
    syncRequested = false
    syncToastWanted = false
  })
  syncPromise = wrapped
  return wrapped
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

function exportGistRecovery() {
  try {
    const snapshot = getLatestRecovery()
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
  showToast('已断开 GitHub Gist', 'info')
}

function handleKeydown(event) {
  if (event.isComposing) return
  // 原生 modal dialog 的键盘交互优先于页面快捷键，Esc 由浏览器关闭弹窗。
  if (document.querySelector('dialog[open]')) return

  const target = event.target
  const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  const isContentEditable = target instanceof HTMLElement && target.isContentEditable

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
function scheduleInitialSync() {
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
  if (targetScheme) {
    // 分享链接转发优先；无需与初始云同步竞争网络资源。
    changeUrl(targetScheme)
  } else if (hasSavedConfig) {
    // 有效数据已从本地恢复。等首屏有机会绘制后再执行可选的云同步。
    scheduleInitialSync()
  }
})

onBeforeUnmount(() => {
  if (initialSyncIdle !== null) window.cancelIdleCallback(initialSyncIdle)
  if (initialSyncFallback !== null) window.clearTimeout(initialSyncFallback)
  stopCountdown()
  cleanupClipboard()
  cleanupSync()
})
</script>

<style scoped src="../styles/change.css"></style>
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
