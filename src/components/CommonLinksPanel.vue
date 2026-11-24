<template>
  <section class="common-panel panel-stack" aria-labelledby="common-title">
    <header class="common-heading panel-head">
      <div>
        <h2 id="common-title">常用链接</h2>
      </div>
      <button class="add-button action-btn action-btn--secondary" type="button" @click="beginAdd">＋ 添加常用链接</button>
    </header>

    <BaseDialog
      ref="editorDialog"
      :auto-open="false"
      class="editor-dialog"
      aria-labelledby="common-editor-title"
      @close="onDialogClose"
    >
      <form class="editor" @submit.prevent="submit">
        <header class="dialog-heading">
          <div>
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
            <BaseInput v-model="name" maxlength="36" placeholder="例如：我的 Obsidian 笔记库" required />
          </label>
          <label>
            目标链接或 URL Scheme
            <BaseInput v-model="target" placeholder="obsidian:// 或 https://example.com" required spellcheck="false" />
          </label>
          <label>
            分类标签（最多 5 个，用逗号分隔）
            <BaseInput v-model="tagsText" maxlength="120" placeholder="开发, 笔记, 效率" aria-label="分类标签" />
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
              <small>PNG/JPEG/WebP · ≤ 1 MB · 本地处理</small>
            </div>
          </div>
          <p v-if="iconError" class="form-error" role="alert">{{ iconError }}</p>
        </div>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div class="editor-actions">
          <BaseButton @click="cancelEdit">取消</BaseButton>
          <BaseButton class="primary" variant="primary" type="submit" :loading="iconBusy">保存链接</BaseButton>
        </div>
      </form>
    </BaseDialog>

    <BaseDialog
      ref="openWarningDialog"
      :auto-open="false"
      class="editor-dialog open-warning-dialog"
      aria-labelledby="unknown-scheme-title"
      @close="pendingTarget = ''"
    >
      <section class="open-warning-body">
        <h3 id="unknown-scheme-title">打开未知应用协议？</h3>
        <p>此地址会尝试唤起设备上的应用。请仅打开来自可信来源的自定义协议；浏览器无法保证应用已成功启动。</p>
        <code class="open-warning-target">{{ pendingTarget }}</code>
        <div class="editor-actions">
          <BaseButton @click="openWarningDialog?.close()">取消</BaseButton>
          <BaseButton @click="copyPendingRaw">复制原始链接</BaseButton>
          <BaseButton class="primary" variant="primary" @click="confirmOpen">继续打开</BaseButton>
        </div>
      </section>
    </BaseDialog>

    <div class="common-toolbar panel-toolbar">
      <SearchField v-model="search" class="common-search" input-type="search" label="搜索常用链接" placeholder="搜索应用名称或 URL" clear-label="清除常用链接搜索" />
      <div class="common-tools panel-toolbar-actions">
        <button class="action-btn" type="button" @click="$emit('export')">导出 JSON</button>
        <button class="action-btn" type="button" @click="triggerImport">导入 JSON</button>
        <input ref="importInput" type="file" accept=".json,application/json" class="visually-hidden-import" aria-label="选择常用链接备份文件" @change="selectImport" />
      </div>
    </div>
    <div class="common-view-tools">
      <span class="common-result-count" aria-live="polite">{{ visibleItems.length }} / {{ items.length }} 个链接</span>
      <div class="common-view-toggle" role="group" aria-label="收藏显示方式">
        <button type="button" :aria-pressed="view === 'grid'" aria-label="网格视图" title="网格视图" @click="view = 'grid'">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.7"/></svg>
        </button>
        <button type="button" :aria-pressed="view === 'list'" aria-label="列表视图" title="列表视图" @click="view = 'list'">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.1M4 12h.1M4 18h.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
    <div v-if="availableTags.length" class="common-tags" aria-label="按标签筛选">
      <button type="button" :aria-pressed="selectedTag === ''" @click="selectedTag = ''">全部</button>
      <button v-for="tag in availableTags" :key="tag" type="button" :aria-pressed="tagKey(selectedTag) === tagKey(tag)" :title="tag + ' · ' + tagCount(tag) + ' 条'" @click="selectedTag = tag">{{ tag }}</button>
    </div>
    <details v-if="availableTags.length" class="common-tag-manager">
      <summary>管理标签</summary>
      <div class="common-tag-fields">
        <label for="manage-tag">选择标签</label>
        <BaseSelect id="manage-tag" v-model="managedTag" @change="beginTagEdit">
          <option value="">请选择</option>
          <option v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}（{{ tagCount(tag) }}）</option>
        </BaseSelect>
        <template v-if="managedTag">
          <label for="rename-tag">标签名称</label>
          <BaseInput id="rename-tag" v-model="newTag" maxlength="18" placeholder="输入新名称"/>
          <div class="common-tag-actions">
            <BaseButton :disabled="!newTag.trim() || newTag.trim() === managedTag" @click="submitTag(false)">重命名标签</BaseButton>
            <BaseButton @click="submitTag(true)">移除标签</BaseButton>
          </div>
          <p v-if="tagError" role="alert" class="form-error">{{ tagError }}</p>
        </template>
      </div>
    </details>
    <TransitionGroup v-if="visibleItems.length" tag="div" name="workspace-list" class="common-grid" :class="{'common-list-view':view === 'list'}">
      <article v-for="item in visibleItems" :key="item.id" class="common-card"
        :class="{'common-dragging':dragId === item.id,'common-drop-before':dropId === item.id && dropPosition === 'before','common-drop-after':dropId === item.id && dropPosition === 'after'}"
        @dragover="dragOver($event,item.id)" @drop="dropItem($event,item.id)" @dragleave="leaveDrop($event,item.id)">
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
          <span v-if="canDrag" class="common-drag-handle" draggable="true" title="拖动调整顺序（也可使用上下移按钮）" aria-hidden="true" @dragstart="startDrag($event,item.id)" @dragend="resetDrag">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
          </span>
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
    </TransitionGroup>
    <EmptyState v-else class="empty-common" :kind="items.length ? 'search' : 'bookmark'"
      :title="items.length ? '没有匹配的链接' : '还没有常用链接'">
      <template #actions>
        <BaseButton v-if="items.length" @click="search = ''; selectedTag = ''">清除筛选</BaseButton>
        <BaseButton v-else @click="beginAdd">添加第一个链接</BaseButton>
      </template>
    </EmptyState>

    <footer class="common-footer">
      <p>默认仅本机保存，可在云端同步中开启收藏同步。应用需安装，未响应时可复制原始链接。</p>
      <button type="button" @click="resetItems">恢复默认应用</button>
    </footer>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import EmptyState from './ui/EmptyState.vue'
import BaseInput from './ui/BaseInput.vue'
import BaseDialog from './ui/BaseDialog.vue'
import SearchField from './ui/SearchField.vue'
import BaseSelect from './ui/BaseSelect.vue'
import { getTargetOpenPolicy, normalizeTarget } from '../domain/linkCodec.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
})
const emit = defineEmits(['save', 'remove', 'reset', 'open', 'copy', 'copy-raw', 'move', 'reorder', 'rename-tag', 'pin', 'import', 'export'])
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
const view = ref('grid')
const managedTag = ref(''), newTag = ref(''), tagError = ref('')
const tagKey = value => String(value || '').toLowerCase()
const availableTags = computed(() => {
  const tags = new Map()
  for (const item of props.items) for (const tag of item.tags || []) if (!tags.has(tagKey(tag))) tags.set(tagKey(tag),tag)
  return [...tags.values()].sort((a,b)=>a.localeCompare(b,'zh'))
})
const tagCount = tag => props.items.filter(item=>(item.tags || []).some(value=>tagKey(value)===tagKey(tag))).length
watch(availableTags, next => {
  if (selectedTag.value && !next.some(tag=>tagKey(tag)===tagKey(selectedTag.value))) selectedTag.value = ''
  if (managedTag.value && !next.some(tag=>tagKey(tag)===tagKey(managedTag.value))) { managedTag.value='';newTag.value='';tagError.value='' }
})
const visibleItems = computed(() => {
  const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return props.items.filter(item => {
    if (selectedTag.value && !(item.tags || []).some(tag=>tagKey(tag)===tagKey(selectedTag.value))) return false
    const haystack = [item.name,item.target,...(item.tags || [])].join(' ').toLowerCase()
    return terms.every(term=>haystack.includes(term))
  })
})
function beginTagEdit() { newTag.value=managedTag.value;tagError.value='' }
function submitTag(remove) {
  const name=managedTag.value, next=remove?'':newTag.value.trim()
  if(!name||(!remove&&!next))return
  const action=remove?'移除标签“'+name+'”':'将标签“'+name+'”重命名为“'+next+'”'
  if(confirm(action+'？将影响 '+tagCount(name)+' 条收藏，不删除链接。')) emit('rename-tag',name,next)
}
function finishTagEdit(next) {
  if(tagKey(selectedTag.value)===tagKey(managedTag.value))selectedTag.value=next
  managedTag.value=availableTags.value.find(tag=>tagKey(tag)===tagKey(next)) || ''
  beginTagEdit()
}
const canDrag=computed(()=>!search.value.trim()&&!selectedTag.value&&props.items.length>1)
const dragId=ref(''),dropId=ref(''),dropPosition=ref('before')
function resetDrag(){dragId.value='';dropId.value='';dropPosition.value='before'}
watch(canDrag,value=>{if(!value)resetDrag()})
// 外部拖放不被接受，dataTransfer 不写入 URL 或收藏内容。
function startDrag(event,id){
  if(!canDrag.value||!event.dataTransfer){event.preventDefault();return}
  dragId.value=id
  event.dataTransfer.effectAllowed='move'
  event.dataTransfer.setData('text/plain','s2u-bookmark-reorder')
}
function dragOver(event,id){
  if(!canDrag.value||!dragId.value||id===dragId.value)return
  event.preventDefault()
  if(event.dataTransfer)event.dataTransfer.dropEffect='move'
  const rect=event.currentTarget.getBoundingClientRect()
  dropId.value=id
  dropPosition.value=event.clientY < rect.top+rect.height/2?'before':'after'
}
function leaveDrop(event,id){
  if(dropId.value===id&&!event.currentTarget.contains(event.relatedTarget))dropId.value=''
}
function dropItem(event,id){
  if(!canDrag.value||!dragId.value||id===dragId.value)return
  event.preventDefault()
  const rect=event.currentTarget.getBoundingClientRect()
  const position=event.clientY < rect.top+rect.height/2?'before':'after'
  emit('reorder',dragId.value,id,position)
  resetDrag()
}
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

defineExpose({ cancelEdit, finishTagEdit, showTagError: value => { tagError.value = value }, showError: (value) => { formError.value = value } })
</script>

<style scoped>
.common-panel { color: var(--card-text); }
.common-footer p { font-size: 12px; line-height: 1.7; color: var(--card-text-muted); margin: 7px 0 0; }
button { font: inherit; cursor: pointer; }
.add-button, .editor-actions button, .card-buttons button { border: 1px solid var(--hairline); border-radius: 10px; background: var(--surface-elevated); color: var(--card-text); min-height: 36px; padding: 0 12px; font-size: 12px; font-weight: 650; }
.add-button:hover, .card-buttons button:hover { border-color: var(--accent); }
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
.card-meta > span { font-size: 12px; color: var(--card-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-buttons { display: flex; gap: 8px; margin-top: auto; }
.card-buttons button { flex: 1; padding: 0 8px; }
.primary { background: var(--accent) !important; color: var(--on-accent) !important; border-color: var(--accent) !important; }
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
.common-footer { border-top: 1px solid var(--hairline); padding-top: 14px; display: flex; justify-content: space-between; align-items: start; gap: 12px; }
.common-footer p { margin: 0; flex: 1; }
.common-footer button { flex-shrink: 0; border: 0; background: transparent; color: var(--card-text-muted); font-size: 12px; cursor: pointer; }
.common-footer button:hover { color: var(--accent); }

/* 桌面鼠标：管理工具浮于卡片右上角，仅悬停或键盘进入该卡片时显示。
   不使用 display:none / visibility:hidden：Tab 焦点仍可抵达隐藏控件。 */
@media (hover: hover) and (pointer: fine) and (min-width: 621px) {
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
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity .16s ease, transform .16s ease;
  }
  .common-card:is(:hover, :focus-within, .common-dragging) .card-actions {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
}
/* 触屏 / 不支持悬停的设备保留常驻操作，避免用户无法管理收藏。 */
@media (hover: none), (pointer: coarse), (max-width: 620px) {
  .common-card .card-actions {
    position: static;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .common-card .card-actions button { min-height:44px; min-width:44px; }
  .common-card .card-buttons button, .common-view-toggle button { min-height:44px; }
  .common-view-toggle button { min-width:44px; }
}
@media (prefers-reduced-motion: reduce) {
  .common-card .card-actions { transition: none !important; transform: none !important; }
}
@media (max-width: 620px) { .common-grid { grid-template-columns: 1fr; } .common-footer { flex-direction: column; } }
@media (max-width: 360px) { .card-main { gap: 6px; } .app-icon { width: 40px; height: 40px; } .card-actions { gap: 0; } .card-actions button { width: 24px; } }
@media (prefers-reduced-motion: reduce) { .common-card { transition: none; transform: none !important; } }
.common-view-tools { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.common-result-count { font-size:12px; color:var(--card-text-muted); }
.common-view-toggle { display:flex; gap:3px; padding:3px; border:1px solid var(--hairline); border-radius:10px; background:var(--surface-soft); }
.common-view-toggle button { border:0; background:transparent; color:var(--card-text-muted); display:grid; place-items:center; width:29px; height:29px; padding:0; border-radius:7px; }
.common-view-toggle button[aria-pressed=true] { color:var(--accent); background:var(--surface-elevated); box-shadow:0 1px 3px #0001; }
.common-view-toggle svg { width:17px; height:17px; }
.common-list-view { grid-template-columns:minmax(0,1fr); }
.common-list-view .common-card { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:8px 12px; }
.common-list-view .card-buttons { grid-column:2; margin-top:0; }
.common-list-view .card-main { grid-row:span 2; }
.common-drag-handle { width:22px; height:30px; display:grid; place-items:center; flex:none; cursor:grab; color:var(--card-text-muted); }
.common-drag-handle:active { cursor:grabbing; }
.common-drag-handle svg { pointer-events:none; }
.common-dragging { opacity:.55; }
.common-drop-before { box-shadow:inset 0 3px var(--accent); }
.common-drop-after { box-shadow:inset 0 -3px var(--accent); }
.common-tag-manager { padding:9px 12px; border:1px solid var(--hairline); border-radius:var(--radius-control); background:var(--surface-soft); }
.common-tag-manager summary { font-size:12px; color:var(--card-text-muted); cursor:pointer; }
.common-tag-fields { display:grid; gap:9px; margin-top:10px; font-size:12px; }
.common-tag-fields select { box-sizing:border-box; min-height:40px; width:100%; border:1px solid var(--hairline); border-radius:var(--radius-control); color:var(--card-text); background:var(--surface-elevated); padding:0 10px; font:inherit; }
.common-tag-actions { display:flex; flex-wrap:wrap; gap:8px; }
@media(max-width:600px) {
  .common-list-view .common-card { display:flex; align-items:stretch; }
  .common-drag-handle { display:none; }
}
@media(pointer:coarse) { .common-drag-handle { display:none; } }
@media(prefers-reduced-motion:reduce) { .common-dragging,.common-drop-before,.common-drop-after { transition:none; } }
</style>

<style scoped>
.common-tags { display: flex; gap: 7px; flex-wrap: wrap; margin: 0; }
.common-tags button { border: 1px solid var(--hairline, #dce1e9); background: var(--surface-soft, #f5f7fa); color: var(--card-text, #172033); border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
.common-tags button[aria-pressed="true"] { color: var(--on-accent); background: var(--accent, #4f6ef7); border-color: var(--accent, #4f6ef7); }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.card-tags span { font-size: 10px; border-radius: 5px; background: var(--surface-soft, #f5f7fa); padding: 2px 6px; color: var(--card-text-muted, #7c879b); }
</style>
