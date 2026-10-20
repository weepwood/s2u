<template>
  <dialog ref="dialog" class="command-dialog" aria-label="快捷启动命令面板" @close="emit('close')" @click="onBackdrop">
    <div class="command-shell">
      <header class="command-header">
        <label class="visually-hidden" for="command-search">搜索常用链接或历史记录</label>
        <input id="command-search" ref="searchInput" v-model="query" type="search"
          placeholder="搜索应用、网址或 Scheme…" autocomplete="off"
          aria-label="搜索命令" @keydown="onKeydown" />
        <kbd>Esc</kbd>
      </header>
      <div v-if="pending" class="command-confirm">
        <strong>确认打开未知应用协议？</strong>
        <p>协议 {{ pending.protocol }} 可能唤起外部程序，是否继续？</p>
        <div class="command-confirm-actions">
          <button type="button" @click="pending = null">返回</button>
          <button type="button" @click="copyPending">复制原始地址</button>
          <button type="button" class="command-primary" @click="confirmOpen">确认打开</button>
        </div>
      </div>
      <div v-else class="command-results" role="listbox" aria-label="匹配的快捷操作">
        <p v-if="!matches.length" class="command-empty">没有找到匹配项</p>
        <button v-for="(item, index) in matches" :key="item.key" type="button"
          role="option" :aria-selected="selectedIndex === index"
          :class="['command-item', { selected: selectedIndex === index }]"
          @pointerenter="selectedIndex = index" @click="activate(item)">
          <span class="command-glyph" aria-hidden="true">{{ item.name.slice(0, 1).toUpperCase() }}</span>
          <span class="command-item-text"><strong>{{ item.name }}</strong><small>{{ item.target }}</small></span>
          <span class="command-kind">{{ item.kind }}</span>
        </button>
      </div>
      <footer class="command-footer">
        <span>↑↓ 选择 · Enter 打开</span>
        <span>Ctrl / ⌘ + K 搜索</span>
      </footer>
    </div>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getTargetOpenPolicy } from '../domain/linkCodec.js'

const props = defineProps({
  commonLinks: { type: Array, default: () => [] },
  history: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'open', 'copy'])
const dialog = ref(null)
const searchInput = ref(null)
const query = ref('')
const selectedIndex = ref(0)
const pending = ref(null)

const entries = computed(() => {
  const seen = new Set()
  const items = []
  for (const item of props.commonLinks) {
    if (seen.has(item.target)) continue
    seen.add(item.target)
    items.push({ key: 'favorite-' + item.id, name: item.name, target: item.target, kind: '常用' })
  }
  for (const item of props.history) {
    if (seen.has(item.scheme)) continue
    seen.add(item.scheme)
    items.push({ key: 'history-' + item.scheme, name: item.scheme, target: item.scheme, kind: '历史' })
  }
  return items
})

const matches = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return entries.value.filter((item) =>
    !needle || item.name.toLowerCase().includes(needle) || item.target.toLowerCase().includes(needle)).slice(0, 12)
})

watch(query, () => { selectedIndex.value = 0; pending.value = null })

function onBackdrop(event) {
  if (event.target === dialog.value) dialog.value.close()
}

function onKeydown(event) {
  if (event.isComposing || pending.value) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const count = matches.value.length
    if (count) selectedIndex.value = (selectedIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const selected = matches.value[selectedIndex.value]
    if (selected) activate(selected)
  }
}

function activate(item) {
  const policy = getTargetOpenPolicy(item.target)
  if (!policy.ok) return
  if (policy.needsConfirmation) {
    pending.value = policy
    return
  }
  dialog.value?.close()
  emit('open', policy.target)
}

function confirmOpen() {
  if (!pending.value) return
  const target = pending.value.target
  pending.value = null
  dialog.value?.close()
  emit('open', target)
}

function copyPending() {
  if (pending.value) emit('copy', pending.value.target)
}

onMounted(() => {
  dialog.value?.showModal()
  searchInput.value?.focus()
})
</script>

<style scoped>
.command-dialog { border: 1px solid var(--hairline, #dce1e9); padding: 0; width: min(620px, calc(100vw - 32px)); max-height: min(75dvh, 620px); border-radius: 18px; background: var(--card-bg-solid, #fff); color: var(--card-text, #172033); box-shadow: 0 32px 90px #0003; }
.command-dialog::backdrop { background: #0d15268a; backdrop-filter: blur(5px); }
.command-shell { display: grid; min-width: 0; }
.command-header { display: flex; gap: 12px; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--hairline, #dce1e9); }
.command-header input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: inherit; font: inherit; font-size: 16px; }
.command-header kbd { font-size: 11px; border: 1px solid var(--hairline, #dce1e9); padding: 4px 7px; border-radius: 6px; white-space: nowrap; }
.command-results { padding: 8px; display: grid; gap: 3px; overflow-y: auto; max-height: min(52dvh, 470px); }
.command-item { display: flex; align-items: center; gap: 12px; text-align: left; padding: 9px 12px; border: 0; border-radius: 11px; background: none; color: inherit; cursor: pointer; min-width: 0; }
.command-item:hover, .command-item.selected { background: var(--surface-soft, #f5f7fa); }
.command-item:focus-visible { outline: 2px solid var(--accent, #4f6ef7); }
.command-glyph { display: grid; place-items: center; background: var(--surface-elevated, #fff); width: 35px; height: 35px; border-radius: 10px; flex: none; }
.command-item-text { flex: 1; display: grid; gap: 2px; min-width: 0; }
.command-item-text strong, .command-item-text small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.command-item-text strong { font-size: 13px; }
.command-item-text small, .command-kind, .command-footer { color: var(--card-text-muted, #7c879b); font-size: 11px; }
.command-kind { white-space: nowrap; }
.command-empty { padding: 24px 12px; text-align: center; color: var(--card-text-muted, #7c879b); }
.command-footer { padding: 11px 18px; border-top: 1px solid var(--hairline, #dce1e9); display: flex; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
.command-confirm { padding: 20px; display: grid; gap: 12px; font-size: 14px; }
.command-confirm p { margin: 0; word-break: break-all; color: var(--card-text-muted, #7c879b); }
.command-confirm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.command-confirm-actions button { border: 1px solid var(--hairline, #dce1e9); color: inherit; background: var(--surface-elevated, #fff); padding: 9px 12px; border-radius: 9px; cursor: pointer; }
.command-confirm-actions .command-primary { background: var(--accent, #4f6ef7); color: #fff; }
.visually-hidden { position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); overflow: hidden; }
@media (prefers-reduced-motion: reduce) { .command-dialog::backdrop { backdrop-filter: none; } }
</style>
