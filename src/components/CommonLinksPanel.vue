<template>
  <section class="common-panel" aria-labelledby="common-title">
    <header class="common-heading">
      <div>
        <span class="eyebrow">Your shortcuts</span>
        <h2 id="common-title">常用链接</h2>
        <p>收藏常用应用和网页地址，快速生成分享链接。</p>
      </div>
      <button class="add-button" type="button" @click="beginAdd">＋ 添加常用链接</button>
    </header>

    <dialog
      ref="editorDialog"
      class="editor-dialog"
      aria-labelledby="common-editor-title"
      @close="onDialogClose"
      @click="onDialogBackdropClick"
    >
      <form class="editor" @submit.prevent="submit">
        <header class="dialog-heading">
          <div>
            <span class="eyebrow">Edit shortcut</span>
            <h3 id="common-editor-title">{{ editingId ? '编辑常用链接' : '添加常用链接' }}</h3>
          </div>
          <button class="dialog-close" type="button" aria-label="关闭弹窗" @click="cancelEdit">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="editor-fields">
          <label>
            应用名称
            <input v-model="name" maxlength="36" placeholder="例如：我的 Obsidian 笔记库" required />
          </label>
          <label>
            目标链接或 URL Scheme
            <input v-model="target" placeholder="obsidian:// 或 https://example.com" required spellcheck="false" />
          </label>
          <label>
            分类标签（最多 5 个，用逗号分隔）
            <input v-model="tagsText" maxlength="120" placeholder="开发, 笔记, 效率" aria-label="分类标签" />
          </label>
        </div>
        <div class="icon-editor">
          <span class="icon-label">应用图标（可选）</span>
          <div class="icon-edit-row">
            <span class="app-icon" :class="{ 'fallback-icon': !getIcon({ target, icon }) }">
              <img v-if="getIcon({ target, icon })" :src="getIcon({ target, icon })" alt="应用图标预览" width="48" height="48" />
              <span v-else aria-hidden="true">{{ iconInitials(name || 'App') }}</span>
            </span>
            <div class="icon-edit-actions">
              <label class="icon-file-label">
                上传应用图标
                <input ref="iconInput" type="file" accept="image/png,image/jpeg,image/webp" aria-label="上传应用图标" @change="selectIcon" />
              </label>
              <button type="button" @click="clearCustomIcon" :disabled="!icon">恢复内置/默认图标</button>
              <small>仅本地处理 PNG/JPEG/WebP（原图 ≤ 1 MB），压缩为 96px 图标后保存，不上传服务器。</small>
            </div>
          </div>
          <p v-if="iconError" class="form-error" role="alert">{{ iconError }}</p>
        </div>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div class="editor-actions">
          <button type="button" @click="cancelEdit">取消</button>
          <button class="primary" type="submit" :disabled="iconBusy">保存链接</button>
        </div>
      </form>
    </dialog>

    <dialog
      ref="openWarningDialog"
      class="editor-dialog open-warning-dialog"
      aria-labelledby="unknown-scheme-title"
      @close="pendingTarget = ''"
    >
      <section class="open-warning-body">
        <h3 id="unknown-scheme-title">打开未知应用协议？</h3>
        <p>此地址会尝试唤起设备上的应用。请仅打开来自可信来源的自定义协议；浏览器无法保证应用已成功启动。</p>
        <code class="open-warning-target">{{ pendingTarget }}</code>
        <div class="editor-actions">
          <button type="button" @click="openWarningDialog?.close()">取消</button>
          <button type="button" @click="copyPendingRaw">复制原始链接</button>
          <button class="primary" type="button" @click="confirmOpen">继续打开</button>
        </div>
      </section>
    </dialog>

    <div class="common-toolbar">
      <label class="common-search">
        <span>搜索常用链接</span>
        <input v-model="search" type="search" placeholder="搜索应用名称或 URL" aria-label="搜索常用链接" />
      </label>
      <div class="common-tools">
        <button type="button" @click="$emit('export')">导出 JSON</button>
        <button type="button" @click="triggerImport">导入 JSON</button>
        <input ref="importInput" type="file" accept=".json,application/json" class="visually-hidden-import" aria-label="选择常用链接备份文件" @change="selectImport" />
      </div>
    </div>
    <div v-if="availableTags.length" class="common-tags" aria-label="按标签筛选">
      <button type="button" :aria-pressed="selectedTag === ''" @click="selectedTag = ''">全部</button>
      <button v-for="tag in availableTags" :key="tag" type="button" :aria-pressed="selectedTag === tag" @click="selectedTag = tag">{{ tag }}</button>
    </div>
    <div v-if="visibleItems.length" class="common-grid">
      <article v-for="item in visibleItems" :key="item.id" class="common-card">
        <div class="card-main">
          <span class="app-icon" :class="{ 'fallback-icon': !getIcon(item) }">
            <img v-if="getIcon(item)" :src="getIcon(item)" :alt="item.name + ' 图标'" width="48" height="48" />
            <span v-else aria-hidden="true">{{ iconInitials(item.name) }}</span>
          </span>
          <div class="card-meta">
            <div class="card-title-row">
              <strong :title="item.name">{{ item.name }}</strong>
              <span v-if="items[0]?.id === item.id" class="first-item-indicator" aria-label="当前排在首位">首位</span>
            </div>
            <span :title="item.target">{{ item.target }}</span>
            <div v-if="item.tags?.length" class="card-tags"><span v-for="tag in item.tags" :key="tag">{{ tag }}</span></div>
          </div>
        </div>
        <div class="card-actions" role="group" :aria-label="'管理 ' + item.name">
          <button v-if="items[0]?.id !== item.id" type="button" class="pin-button" :aria-label="'置顶 ' + item.name" title="移至首位" @click="$emit('pin', item.id)">置顶</button>
          <button type="button" :disabled="items[0]?.id === item.id" :aria-label="'上移 ' + item.name" title="上移" @click="$emit('move', item.id, -1)">↑</button>
            <button type="button" :disabled="items[items.length - 1]?.id === item.id" :aria-label="'下移 ' + item.name" title="下移" @click="$emit('move', item.id, 1)">↓</button>
            <button type="button" :aria-label="'复制 ' + item.name + ' 原始链接'" title="复制原始链接" @click="$emit('copy-raw', item.target)">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.7"/></svg>
            </button>
            <button type="button" :aria-label="'编辑 ' + item.name" title="编辑" @click="beginEdit(item)">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 16 11-11 4 4L8 20H4v-4Zm9-9 4 4" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
            </button>
            <button type="button" :aria-label="'删除 ' + item.name" title="删除" @click="removeItem(item)">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
            </button>
        </div>
        <div class="card-buttons">
          <button type="button" @click="requestOpen(item.target)" :aria-label="'打开 ' + item.name">打开</button>
          <button class="primary" type="button" @click="$emit('copy', item)" :aria-label="'复制 ' + item.name + ' 分享链接'">复制分享链接</button>
        </div>
      </article>
    </div>
    <div v-else class="empty-common">
      <strong>{{ items.length ? '没有匹配的链接' : '还没有常用链接' }}</strong>
      <p>{{ items.length ? '尝试更换搜索关键词。' : '可添加你经常使用的应用 Scheme 或网址。' }}</p>
    </div>

    <footer class="common-footer">
      <p>常用链接仅保存在当前浏览器，不会通过 Gist 同步。应用 Scheme 需设备安装并注册对应应用；浏览器不一定能获知是否启动成功，可使用“复制原始链接”作为回退。</p>
      <button type="button" @click="resetItems">恢复默认应用</button>
    </footer>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getTargetOpenPolicy, normalizeTarget } from '../domain/linkCodec.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
})
const emit = defineEmits(['save', 'remove', 'reset', 'open', 'copy', 'copy-raw', 'move', 'pin', 'import', 'export'])
const openWarningDialog = ref(null)
const pendingTarget = ref('')

function requestOpen(target) {
  const policy = getTargetOpenPolicy(target)
  if (!policy.ok) {
    emit('open', target)
    return
  }
  if (policy.needsConfirmation) {
    pendingTarget.value = policy.target
    openWarningDialog.value?.showModal()
    return
  }
  emit('open', policy.target)
}

function confirmOpen() {
  const target = pendingTarget.value
  openWarningDialog.value?.close()
  if (target) emit('open', target)
}

function copyPendingRaw() {
  if (pendingTarget.value) emit('copy-raw', pendingTarget.value)
}

const search = ref('')
const selectedTag = ref('')
const availableTags = computed(() => [...new Set(props.items.flatMap((item) => item.tags || []))].sort((a, b) => a.localeCompare(b, 'zh')))
watch(availableTags, (next) => {
  // 移除最后一个带该标签的收藏后，不要让筛选器停留在不存在的分类上。
  if (selectedTag.value && !next.includes(selectedTag.value)) selectedTag.value = ''
})
const visibleItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  return props.items.filter((item) => {
    if (selectedTag.value && !(item.tags || []).includes(selectedTag.value)) return false
    return !term || item.name.toLowerCase().includes(term) || item.target.toLowerCase().includes(term) ||
      (item.tags || []).some((tag) => tag.toLowerCase().includes(term))
  })
})
const importInput = ref(null)

function triggerImport() { importInput.value?.click() }
function selectImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) emit('import', file)
}

const editorDialog = ref(null)
const editingId = ref(null)
const name = ref('')
const target = ref('')
const tagsText = ref('')
const formError = ref('')
const icon = ref('')
const iconError = ref('')
const iconBusy = ref(false)
const iconInput = ref(null)
const MAX_UPLOAD_BYTES = 1024 * 1024
const MAX_ICON_DATA_LENGTH = 32768

function getIcon(item) {
  if (item.icon) return item.icon
  const scheme = item.target.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase()
  if (['obsidian', 'weixin', 'orpheus'].includes(scheme)) {
    return import.meta.env.BASE_URL + 'icons/common-' + scheme + '.png'
  }
  // VS Code 暂使用文字徽标，避免引入来源不明的图标。
  return ''
}

function iconInitials(value) {
  if (value === 'Visual Studio Code') return 'VS'
  return value.trim().slice(0, 2).toUpperCase()
}

function openEditor(item = null) {
  editingId.value = item?.id ?? null
  name.value = item?.name ?? ''
  target.value = item?.target ?? ''
  tagsText.value = (item?.tags || []).join(', ')
  formError.value = ''
  iconError.value = ''
  icon.value = item?.icon ?? ''
  editorDialog.value?.showModal()
}

function beginAdd() {
  openEditor()
}

function beginEdit(item) {
  openEditor(item)
}

function cancelEdit() {
  editorDialog.value?.close()
}

function onDialogClose() {
  // 包括 ESC 键关闭；下次打开时重置验证状态和输入。
  formError.value = ''
  editingId.value = null
  name.value = ''
  target.value = ''
  tagsText.value = ''
  icon.value = ''
  iconError.value = ''
  iconBusy.value = false
}

function onDialogBackdropClick(event) {
  if (event.target === editorDialog.value) cancelEdit()
}

function submit() {
  if (iconBusy.value) return
  const normalized = normalizeTarget(target.value)
  if (!normalized.ok) {
    formError.value = normalized.error
    return
  }
  const trimmedName = name.value.trim()
  if (!trimmedName || trimmedName.length > 36) {
    formError.value = '名称需为 1–36 个字符'
    return
  }
  // 其它校验（数量和重复）由同一数据存储入口负责。
  emit('save', { id: editingId.value, name: trimmedName, target: normalized.target, icon: icon.value, tags: tagsText.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) })
}


function clearCustomIcon() {
  icon.value = ''
  iconError.value = ''
  if (iconInput.value) iconInput.value.value = ''
}

async function selectIcon(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  iconError.value = ''
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
    iconError.value = '只允许 PNG、JPEG 或 WebP 图片，大小不得超过 1 MB'
    return
  }

  iconBusy.value = true
  try {
    // 现有 CSP 仅允许 img-src 'self' data:；不创建 blob: 图片地址。
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('读取图片失败'))
      reader.readAsDataURL(file)
    })
    const image = new Image()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('图片无法解码'))
      image.src = source
    })
    if (!image.naturalWidth || !image.naturalHeight ||
        image.naturalWidth * image.naturalHeight > 16_000_000) {
      throw new Error('图片像素数量过大，请选择更小的图标')
    }

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 96
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器不支持图片转换')
    const scale = Math.min(96 / image.naturalWidth, 96 / image.naturalHeight)
    const w = Math.max(1, Math.round(image.naturalWidth * scale))
    const h = Math.max(1, Math.round(image.naturalHeight * scale))
    ctx.drawImage(image, (96 - w) / 2, (96 - h) / 2, w, h)
    let encoded = canvas.toDataURL('image/png')
    if (encoded.length > MAX_ICON_DATA_LENGTH) encoded = canvas.toDataURL('image/webp', 0.76)
    if (encoded.length > MAX_ICON_DATA_LENGTH || !/^data:image\/(?:png|webp);base64,/.test(encoded)) {
      throw new Error('压缩后的图标仍超过大小限制，请选择更简单的图片')
    }
    icon.value = encoded
  } catch (error) {
    iconError.value = error?.message || '图标处理失败'
  } finally {
    iconBusy.value = false
  }
}

function removeItem(item) {
  if (window.confirm('确定删除“' + item.name + '”吗？')) emit('remove', item.id)
}

function resetItems() {
  if (window.confirm('恢复内置的 4 个默认应用？当前自定义列表将被替换。')) {
    emit('reset')
  }
}

defineExpose({ cancelEdit, showError: (value) => { formError.value = value } })
</script>

<style scoped>
.common-panel { display: grid; gap: 20px; min-width: 0; color: var(--card-text); }
.common-heading { display: flex; align-items: start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.eyebrow { display: block; margin-bottom: 6px; font-size: 10px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; color: var(--card-text-muted); }
.common-heading h2 { margin: 0; font-size: 22px; letter-spacing: -.03em; }
.common-heading p, .common-footer p { font-size: 12px; line-height: 1.7; color: var(--card-text-muted); margin: 7px 0 0; }
button { font: inherit; cursor: pointer; }
.add-button, .editor-actions button, .card-buttons button { border: 1px solid var(--hairline); border-radius: 10px; background: var(--surface-elevated); color: var(--card-text); min-height: 36px; padding: 0 12px; font-size: 12px; font-weight: 650; }
.add-button:hover, .card-buttons button:hover { border-color: var(--accent); }
.common-toolbar { display: flex; align-items: end; gap: 10px; justify-content: space-between; flex-wrap: wrap; }
.common-search { display: grid; gap: 6px; min-width: 170px; flex: 1; color: var(--card-text-muted); font-size: 11px; }
.common-search input { width: 100%; min-width: 0; height: 38px; border: 1px solid var(--hairline); border-radius: 10px; padding: 0 10px; background: var(--surface-elevated); color: var(--card-text); }
.common-tools { display: flex; flex-wrap: wrap; gap: 7px; }
.common-tools button { min-height: 38px; padding: 0 10px; border: 1px solid var(--hairline); border-radius: 10px; background: var(--surface-elevated); color: var(--card-text); font: inherit; font-size: 11px; font-weight: 650; }
.visually-hidden-import { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; pointer-events: none; }
.common-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.common-card { position: relative; padding: 17px; border: 1px solid var(--hairline); border-radius: 18px; background: var(--surface-soft); min-width: 0; display: flex; flex-direction: column; gap: 13px; transition: border-color .2s, transform .2s; }
.common-card:hover { border-color: var(--accent); transform: translateY(-1px); }
.card-main { display: flex; align-items: center; min-width: 0; gap: 11px; }
.app-icon { width: 52px; height: 52px; flex-shrink: 0; display: grid; place-items: center; overflow: hidden; border-radius: 13px; background: var(--surface-elevated); }
.app-icon img { display: block; width: 100%; height: 100%; object-fit: cover; }
.fallback-icon { color: #fff; background: linear-gradient(135deg, #298ae5, #165cad); font-size: 16px; font-weight: 750; }
.card-actions { display: flex; gap: 3px; flex-shrink: 0; align-items: center; justify-content: flex-end; }
.card-actions button { width: 27px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 8px; color: var(--card-text-muted); background: transparent; }
.card-actions button:hover { background: var(--surface-elevated); color: var(--card-text); }
.card-actions button:disabled { opacity: .3; cursor: not-allowed; }
.card-actions svg { width: 16px; height: 16px; }
 .card-meta { display: grid; gap: 5px; min-width: 0; flex: 1; }
.card-title-row { display: flex; align-items: center; min-width: 0; gap: 5px; }
.card-title-row strong { flex: 1; min-width: 0; }
.pin-button, .first-item-indicator { flex-shrink: 0; border: 0; padding: 3px 5px; border-radius: 6px; font-size: 10px; font-weight: 650; line-height: 1.3; }
.pin-button { color: var(--card-text-muted); background: var(--surface-elevated); }
.card-actions .pin-button { width: auto; min-width: 38px; padding: 0 6px; }
.pin-button:hover, .pin-button:focus-visible { color: var(--card-text); outline-color: var(--accent); }
.first-item-indicator { color: var(--card-text-muted); opacity: .65; }
.card-meta strong { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta span { font-size: 12px; color: var(--card-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-buttons { display: flex; gap: 8px; margin-top: auto; }
.card-buttons button { flex: 1; padding: 0 8px; }
.primary { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }
.primary:hover { filter: brightness(.94); }
.editor-dialog {
  width: min(460px, calc(100vw - 32px));
  max-width: none;
  max-height: min(90dvh, 720px);
  margin: auto;
  padding: 0;
  overflow-y: auto;
  box-sizing: border-box;
  border: 1px solid var(--hairline);
  border-radius: 20px;
  background: var(--card-bg-solid);
  color: var(--card-text);
  box-shadow: 0 28px 88px rgba(15, 23, 42, .3);
}
.editor-dialog::backdrop { background: rgba(12, 18, 32, .6); backdrop-filter: blur(5px); }
.open-warning-body { padding: clamp(18px, 4vw, 25px); display: grid; gap: 15px; }
.open-warning-body h3 { font-size: 19px; margin: 0; }
.open-warning-body p { font-size: 13px; line-height: 1.7; color: var(--card-text-muted); margin: 0; }
.open-warning-target { padding: 11px; border: 1px solid var(--hairline); border-radius: 10px; background: var(--surface-soft); overflow-wrap: anywhere; font-size: 12px; }
.open-warning-body .editor-actions { flex-wrap: wrap; }
.open-warning-body .editor-actions button { min-height: 36px; border: 1px solid var(--hairline); border-radius: 10px; padding: 0 12px; background: var(--surface-elevated); color: var(--card-text); font: inherit; font-size: 12px; cursor: pointer; }
.editor { display: grid; gap: 18px; padding: clamp(18px, 4vw, 25px); }
.dialog-heading { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
.dialog-heading h3 { font-size: 20px; margin: 0; }
.dialog-close { display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 9px; background: var(--surface-soft); color: var(--card-text-muted); }
.dialog-close:hover { color: var(--card-text); }
.dialog-close svg { width: 18px; height: 18px; }
 .icon-editor { display: grid; gap: 9px; }
.icon-label { font-size: 12px; font-weight: 650; }
.icon-edit-row { display: flex; align-items: center; gap: 13px; }
.icon-edit-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-width: 0; }
.icon-edit-actions small { width: 100%; font-size: 11px; line-height: 1.5; color: var(--card-text-muted); }
.icon-edit-actions button, .icon-file-label { display: inline-flex; align-items: center; justify-content: center; min-height: 30px; padding: 4px 9px; border: 1px solid var(--hairline); border-radius: 8px; background: var(--surface-elevated); color: var(--card-text); font-size: 11px; font-weight: 650; cursor: pointer; }
.icon-edit-actions button:disabled { opacity: .45; cursor: not-allowed; }
.icon-file-label input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.editor-fields { display: grid; grid-template-columns: 1fr; gap: 15px; }
.editor-fields label { display: grid; gap: 8px; font-size: 12px; font-weight: 650; }
.editor-fields input { box-sizing: border-box; width: 100%; min-width: 0; height: 44px; padding: 0 12px; border: 1px solid var(--hairline); border-radius: 10px; background: var(--surface-elevated); color: var(--card-text); outline-offset: 2px; }
.editor-fields input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.editor-actions { display: flex; gap: 10px; justify-content: flex-end; }
.form-error { margin: 0; font-size: 12px; color: #df4c50; }
.empty-common { text-align: center; background: var(--surface-soft); padding: 38px 16px; border-radius: 16px; }
.empty-common p { color: var(--card-text-muted); font-size: 13px; }
.common-footer { border-top: 1px solid var(--hairline); padding-top: 14px; display: flex; justify-content: space-between; align-items: start; gap: 12px; }
.common-footer p { margin: 0; flex: 1; }
.common-footer button { flex-shrink: 0; border: 0; background: transparent; color: var(--card-text-muted); font-size: 12px; cursor: pointer; }
.common-footer button:hover { color: var(--accent); }

/* 桌面鼠标：管理工具浮于卡片右上角，仅悬停或键盘进入该卡片时显示。
   不使用 display:none / visibility:hidden：Tab 焦点仍可抵达隐藏控件。 */
@media (hover: hover) and (pointer: fine) {
  .common-card .card-actions {
    position: absolute;
    z-index: 2;
    top: 10px;
    right: 10px;
    max-width: calc(100% - 20px);
    padding: 4px;
    background: var(--card-bg-solid);
    border: 1px solid var(--hairline);
    border-radius: 11px;
    box-shadow: 0 7px 22px rgba(24, 37, 68, .12);
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity .16s ease, transform .16s ease;
  }
  .common-card:is(:hover, :focus-within) .card-actions {
    opacity: 1;
    transform: translateY(0);
  }
}
/* 触屏 / 不支持悬停的设备保留常驻操作，避免用户无法管理收藏。 */
@media (hover: none), (pointer: coarse) {
  .common-card .card-actions {
    position: static;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .common-card .card-actions button { min-height: 34px; min-width: 34px; }
  .common-card .card-actions .pin-button { min-width: 42px; }
}
@media (prefers-reduced-motion: reduce) {
  .common-card .card-actions { transition: none !important; transform: none !important; }
}
@media (max-width: 620px) { .common-grid { grid-template-columns: 1fr; } .common-footer { flex-direction: column; } }
@media (max-width: 360px) { .card-main { gap: 6px; } .app-icon { width: 40px; height: 40px; } .card-actions { gap: 0; } .card-actions button { width: 24px; } }
@media (prefers-reduced-motion: reduce) { .common-card { transition: none; transform: none !important; } }
</style>

<style scoped>
.common-tags { display: flex; gap: 7px; flex-wrap: wrap; margin: -7px 0 2px; }
.common-tags button { border: 1px solid var(--hairline, #dce1e9); background: var(--surface-soft, #f5f7fa); color: var(--card-text, #172033); border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
.common-tags button[aria-pressed="true"] { color: #fff; background: var(--accent, #4f6ef7); border-color: var(--accent, #4f6ef7); }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.card-tags span { font-size: 10px; border-radius: 5px; background: var(--surface-soft, #f5f7fa); padding: 2px 6px; color: var(--card-text-muted, #7c879b); }
</style>
