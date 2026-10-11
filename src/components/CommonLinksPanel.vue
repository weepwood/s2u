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

    <form v-if="editing" class="editor" @submit.prevent="submit">
      <h3>{{ editingId ? '编辑常用链接' : '添加常用链接' }}</h3>
      <div class="editor-fields">
        <label>
          应用名称
          <input v-model="name" maxlength="36" placeholder="例如：我的 Obsidian 笔记库" required />
        </label>
        <label>
          目标链接或 URL Scheme
          <input v-model="target" placeholder="obsidian:// 或 https://example.com" required spellcheck="false" />
        </label>
      </div>
      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
      <div class="editor-actions">
        <button class="primary" type="submit">保存链接</button>
        <button type="button" @click="cancelEdit">取消</button>
      </div>
    </form>

    <div v-if="items.length" class="common-grid">
      <article v-for="item in items" :key="item.id" class="common-card">
        <div class="card-top">
          <span class="app-icon" :class="{ 'fallback-icon': !getIcon(item.target) }">
            <img v-if="getIcon(item.target)" :src="getIcon(item.target)" :alt="item.name + ' 图标'" width="48" height="48" />
            <span v-else aria-hidden="true">{{ iconInitials(item.name) }}</span>
          </span>
          <div class="card-actions">
            <button type="button" :aria-label="'编辑 ' + item.name" title="编辑" @click="beginEdit(item)">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 16 11-11 4 4L8 20H4v-4Zm9-9 4 4" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
            </button>
            <button type="button" :aria-label="'删除 ' + item.name" title="删除" @click="removeItem(item)">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div class="card-meta">
          <strong :title="item.name">{{ item.name }}</strong>
          <span :title="item.target">{{ item.target }}</span>
        </div>
        <div class="card-buttons">
          <button type="button" @click="$emit('fill', item.target)" :aria-label="'填入 ' + item.name">填入</button>
          <button class="primary" type="button" @click="$emit('copy', item)" :aria-label="'复制 ' + item.name + ' 分享链接'">复制分享链接</button>
        </div>
      </article>
    </div>
    <div v-else class="empty-common">
      <strong>还没有常用链接</strong>
      <p>可添加你经常使用的应用 Scheme 或网址。</p>
    </div>

    <footer class="common-footer">
      <p>常用链接仅保存在当前浏览器，不会随历史记录或 Gist 自动同步。应用 Scheme 需要本机安装对应软件才能打开。</p>
      <button type="button" @click="resetItems">恢复默认应用</button>
    </footer>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { normalizeTarget } from '../domain/linkCodec.js'

defineProps({
  items: { type: Array, default: () => [] },
})
const emit = defineEmits(['save', 'remove', 'reset', 'fill', 'copy'])

const editing = ref(false)
const editingId = ref(null)
const name = ref('')
const target = ref('')
const formError = ref('')

function getIcon(value) {
  const scheme = value.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase()
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

function beginAdd() {
  editingId.value = null
  name.value = ''
  target.value = ''
  formError.value = ''
  editing.value = true
}

function beginEdit(item) {
  editingId.value = item.id
  name.value = item.name
  target.value = item.target
  formError.value = ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  formError.value = ''
}

function submit() {
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
  emit('save', { id: editingId.value, name: trimmedName, target: normalized.target })
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
.common-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.common-card { padding: 17px; border: 1px solid var(--hairline); border-radius: 18px; background: var(--surface-soft); min-width: 0; display: flex; flex-direction: column; gap: 13px; transition: border-color .2s, transform .2s; }
.common-card:hover { border-color: var(--accent); transform: translateY(-1px); }
.card-top { display: flex; align-items: start; justify-content: space-between; gap: 8px; }
.app-icon { width: 52px; height: 52px; flex-shrink: 0; display: grid; place-items: center; overflow: hidden; border-radius: 13px; background: var(--surface-elevated); }
.app-icon img { display: block; width: 100%; height: 100%; object-fit: cover; }
.fallback-icon { color: #fff; background: linear-gradient(135deg, #298ae5, #165cad); font-size: 16px; font-weight: 750; }
.card-actions { display: flex; gap: 4px; }
.card-actions button { width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 8px; color: var(--card-text-muted); background: transparent; }
.card-actions button:hover { background: var(--surface-elevated); color: var(--card-text); }
.card-actions svg { width: 16px; height: 16px; }
.card-meta { display: grid; gap: 7px; min-width: 0; }
.card-meta strong { font-size: 15px; overflow-wrap: anywhere; }
.card-meta span { font-size: 12px; color: var(--card-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-buttons { display: flex; gap: 8px; margin-top: auto; }
.card-buttons button { flex: 1; padding: 0 8px; }
.primary { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }
.primary:hover { filter: brightness(.94); }
.editor { display: grid; gap: 13px; padding: 17px; border: 1px solid var(--accent); border-radius: 16px; background: var(--surface-soft); }
.editor h3 { font-size: 15px; margin: 0; }
.editor-fields { display: grid; grid-template-columns: 1fr 1.5fr; gap: 12px; }
.editor-fields label { display: grid; gap: 7px; font-size: 12px; font-weight: 650; }
.editor-fields input { width: 100%; min-width: 0; height: 42px; padding: 0 11px; border: 1px solid var(--hairline); border-radius: 10px; background: var(--surface-elevated); color: var(--card-text); outline-offset: 2px; }
.editor-actions { display: flex; gap: 9px; }
.form-error { margin: 0; font-size: 12px; color: #df4c50; }
.empty-common { text-align: center; background: var(--surface-soft); padding: 38px 16px; border-radius: 16px; }
.empty-common p { color: var(--card-text-muted); font-size: 13px; }
.common-footer { border-top: 1px solid var(--hairline); padding-top: 14px; display: flex; justify-content: space-between; align-items: start; gap: 12px; }
.common-footer p { margin: 0; flex: 1; }
.common-footer button { flex-shrink: 0; border: 0; background: transparent; color: var(--card-text-muted); font-size: 12px; cursor: pointer; }
.common-footer button:hover { color: var(--accent); }
@media (max-width: 620px) { .common-grid, .editor-fields { grid-template-columns: 1fr; } .common-footer { flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { .common-card { transition: none; transform: none !important; } }
</style>
