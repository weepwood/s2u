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
          @pointerenter="warmShortcutHelp" @focus="warmShortcutHelp"
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
            :common-links="commonLinks"
            :save-bookmark="saveHistoryBookmark"
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
              @reorder="reorderCommonLink"
              @rename-tag="renameCommonTag"
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

    <SettingsPanel v-if="showSettings" :cloud="cloud" :workspace-preview="workspacePreview" :workspace="workspace.id" :profiles="workspaceProfiles" @close="closeSyncSettings"
      @switch-workspace="switchWorkspace" @create-workspace="addWorkspace"
      @export-workspace="exportWorkspace" @preview-workspace="previewWorkspace" @restore-workspace="restoreWorkspace"
      @cancel-workspace="clearWorkspacePreview" @export-before-restore="exportBeforeRestore" @export-before-conflict="exportBeforeConflict"
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
import { ref, computed, defineAsyncComponent, h, onMounted, onBeforeUnmount } from 'vue'
import ThemeToggle from './ThemeToggle.vue'
import UrlInput from './UrlInput.vue'
import ClosePanel from './ClosePanel.vue'
import Toast from './Toast.vue'
import CommandPalette from './CommandPalette.vue'
import { useDarkMode } from '../composables/useDarkMode.js'
import { useHistory } from '../composables/useHistory.js'
import { useCommonLinks } from '../composables/useCommonLinks.js'
import { useCloudSync } from '../composables/useCloudSync.js'
import { openWorkspace } from '../domain/storage/workspaceScope.js'
import { useClipboard } from '../composables/useClipboard.js'
import { useWorkspaceSync } from '../composables/workspace/useWorkspaceSync.js'
import { useShareRedirect } from '../composables/workspace/useShareRedirect.js'
import { useBookmarkActions } from '../composables/workspace/useBookmarkActions.js'
import { useWorkspaceNavigation } from '../composables/workspace/useWorkspaceNavigation.js'
import { useHistoryActions } from '../composables/workspace/useHistoryActions.js'
import {
  encodeShareLink,
  getAppBaseUrl,
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
// 二维码和快捷键帮助不是首屏必需资源；保留快捷启动同步加载，避免键盘入口等待。
const loadQrShareDialog = () => import('./QrShareDialog.vue')
const loadShortcutHelp = () => import('./ShortcutHelp.vue')
const QrShareDialog = defineAsyncComponent({
  loader: loadQrShareDialog,
  onError(error, retry, fail, attempts) {
    if (attempts === 1) { retry(); return }
    qrShareUrl.value = ''
    showToast('二维码界面加载失败，请刷新页面后重试', 'error', 4000)
    fail()
  },
})
const ShortcutHelp = defineAsyncComponent({
  loader: loadShortcutHelp,
  onError(error, retry, fail, attempts) {
    if (attempts === 1) { retry(); return }
    closeHelp()
    showToast('快捷键帮助加载失败，请刷新页面后重试', 'error', 4000)
    fail()
  },
})
function warmShortcutHelp() {
  loadShortcutHelp().catch(() => {})
}
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

const workspace = openWorkspace()
const { darkMode, toggle:toggleDark } = useDarkMode(workspace.storage)
const historyStore = useHistory(workspace.storage)
const { history, searchQuery, storageError, load:loadHistory, add:addHistory, exportJSON:exportHistory } = historyStore
const commonStore = useCommonLinks(workspace.storage)
const { links:commonLinks, storageError:commonStorageError, load:loadCommonLinks } = commonStore
const cloud = useCloudSync(workspace)
const { syncStatus, pending, loadConfig } = cloud
const commonPanel = ref(null)
const { copyText, copyToClipboard, cleanup:cleanupClipboard } = useClipboard()
const qrShareUrl = ref('')
const url = ref('')
const urlError = ref('')
const showCloseMsg = ref(false)
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
      const normalized = normalizeTarget(item.scheme)
      if (!normalized.ok) return []
      // 展示真实目标，分享地址仅用于原有复制及打开操作。
      return [{ target: normalized.target, shareUrl: encodeShareLink(origin, normalized.target) }]
    } catch {
      return []
    }
  }),
)

function showToast(message, type = 'info', duration = 2500) {
  toastKey++
  toast.value = { message, type, duration, key: toastKey }
}

function notifyStorageError() {
  if (!storageError.value) return
  showToast(storageError.value, 'error', 4000)
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

// 视图仅装配各业务模块；依赖显式注入，复用已有 store，不创建第二套数据。
const {
  workspaceProfiles, showSettings, openSyncSettings, closeSyncSettings, switchWorkspace, addWorkspace,
  autoSync, workspacePreview, clearWorkspacePreview, exportWorkspace, exportBeforeConflict, exportBeforeRestore,
  previewWorkspace, restoreWorkspace, syncGist, connectGist, testGistConnection, restoreGistRecovery,
  exportGistBundle, exportGistRecovery, disconnectGist, scheduleInitialSync, startSyncLifecycle, stopSyncLifecycle,
} = useWorkspaceSync({workspace, cloud, historyStore, commonStore, darkMode, showCloseMsg, showToast, notifyStorageError})
const {
  redirectPolicy, redirectAttempted, attemptRedirect, readShareHash, cancelClose, startRedirectLifecycle, stopRedirectLifecycle,
} = useShareRedirect({showCloseMsg, urlError, addHistory, autoSync, showToast, notifyStorageError})
const {
  reorderCommonLink, renameCommonTag, pinCommonLink, moveCommonLink, exportCommonLinks, importCommonLinks,
  copyCommonRaw, openCommonLink, saveHistoryBookmark, saveCommonLink, removeCommonLink, resetCommonLinks, copyCommonLink,
} = useBookmarkActions({commonStore, commonPanel, origin, addHistory, autoSync, notifyStorageError, showToast})
const { deleteHistoryItem, invalidHistory, onImportFile } = useHistoryActions({historyStore, showToast, notifyStorageError, autoSync})
const {
  commandPaletteOpen, helpOpen, helpTrigger, activePanel, switchDirection, prepareLeavingPanel, activateEnteringPanel,
  switchPanel, handleTabNavigation, closeHelp, handleKeydown,
} = useWorkspaceNavigation({url, urlError, copy})

onMounted(() => {
  loadHistory()
  notifyStorageError()
  loadCommonLinks()
  if (commonStorageError.value) showToast(commonStorageError.value, 'error', 4000)

  try {
    workspace.storage.removeItem('url_list')
  } catch {
    // 忽略无法清理的旧缓存。
  }

  const hasSavedConfig = loadConfig()
  if (workspace.unavailable) showToast('无法读取工作区，请检查浏览器存储权限', 'error', 5000)
  startRedirectLifecycle()
  startSyncLifecycle()
  if (window.location.hash) {
    // 分享链接转发优先；无需与初始云同步竞争网络资源。
    readShareHash()
  } else if (hasSavedConfig) {
    // 有效数据已从本地恢复。等首屏有机会绘制后再执行可选的云同步。
    scheduleInitialSync()
  }
})

onBeforeUnmount(() => {
  stopRedirectLifecycle()
  cleanupClipboard()
  stopSyncLifecycle()
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
