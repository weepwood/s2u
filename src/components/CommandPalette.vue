<template>
  <dialog ref="dialog" class="command-dialog" aria-label="快捷启动命令面板" @close="emit('close')" @click="onBackdrop">
    <div class="command-shell">
      <header class="command-header">
        <svg class="command-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        <label class="visually-hidden" for="command-search">搜索常用链接或历史记录</label>
        <input id="command-search" ref="searchInput" v-model="query" type="search"
          placeholder="搜索应用、网址或 Scheme…" autocomplete="off"
          aria-label="搜索命令" aria-controls="command-results" aria-autocomplete="list"
          :aria-activedescendant="!pending && matches[selectedIndex] ? `command-item-${selectedIndex}` : undefined"
          @keydown.esc.stop.prevent="dialog?.close()" @keydown="onKeydown" />
        <button class="command-close" type="button" aria-label="关闭快捷启动" @click="dialog?.close()"><kbd>Esc</kbd></button>
      </header>
      <div v-if="pending" class="command-confirm">
        <strong>确认打开未知应用协议？</strong>
        <p>协议 {{ pending.protocol }} 可能唤起外部程序，是否继续？</p>
        <div class="command-confirm-actions">
          <button type="button" @click="returnToResults">返回</button>
          <button type="button" @click="copyPending">复制原始地址</button>
          <button type="button" class="command-primary" @click="confirmOpen">确认打开</button>
        </div>
      </div>
      <template v-else>
        <div class="command-summary" role="status">{{ query.trim() ? '搜索结果' : '常用与历史' }} <span>{{ matches.length }} 项</span></div>
        <div id="command-results" class="command-results" role="listbox" aria-label="匹配的快捷操作">
        <p v-if="!matches.length" class="command-empty">没有找到匹配项。试试应用名称、域名或协议。</p>
        <button v-for="(item, index) in matches" :key="item.key" :id="`command-item-${index}`" type="button"
          role="option" :aria-selected="selectedIndex === index"
          :class="['command-item', { selected: selectedIndex === index }]"
          @pointerenter="selectedIndex = index" @click="activate(item)">
          <span class="command-glyph" aria-hidden="true">
            <img v-if="item.icon" :src="item.icon" alt="" width="24" height="24" />
            <span v-else>{{ appInitials(item.name, item.target) }}</span>
          </span>
          <span class="command-item-text"><strong>{{ item.name }}</strong><small>{{ item.target }}</small></span>
          <span class="command-kind">{{ item.kind }}</span>
        </button>
        </div>
      </template>
      <footer class="command-footer">
        <span><kbd>↑</kbd> <kbd>↓</kbd> 选择 <kbd>Enter</kbd> 打开</span>
        <span><kbd>Esc</kbd> 关闭</span>
      </footer>
    </div>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { appIcon, appInitials } from '../domain/appIcons.js'
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
    items.push({ key: 'favorite-' + item.id, name: item.name, target: item.target, icon: appIcon(item), kind: '常用' })
  }
  for (const item of props.history) {
    if (seen.has(item.scheme)) continue
    seen.add(item.scheme)
    items.push({ key: 'history-' + item.scheme, name: item.scheme, target: item.scheme, icon: appIcon({ target: item.scheme }), kind: '历史' })
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
    if (count) {
      selectedIndex.value = (selectedIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
      nextTick(() => dialog.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }))
    }
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

function returnToResults() {
  pending.value = null
  nextTick(() => searchInput.value?.focus())
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
.command-dialog { border: 1px solid var(--hairline); padding: 0; width: min(570px, calc(100vw - 28px)); max-height: min(85dvh, 640px); color: var(--card-text); }
.command-dialog::backdrop { background: rgba(13, 17, 23, .46); }
.command-shell { display: grid; min-width: 0; }
.command-header { display: flex; gap: 10px; align-items: center; padding: 13px 15px; border-bottom: 1px solid var(--hairline); }
.command-search-icon { width: 19px; height: 19px; flex: none; color: var(--card-text-muted); }
.command-header:focus-within { box-shadow: inset 0 -2px var(--accent); }
.command-header input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: inherit; font: inherit; font-size: 15px; }
.command-header input::placeholder { color: var(--card-text-muted); }
.command-close { display: grid; place-items: center; padding: 0; min-height: 28px; min-width: 32px; border: 0; background: transparent; color: var(--card-text-muted); cursor: pointer; }
.command-shell kbd { font: inherit; font-size: 11px; border: 1px solid var(--hairline); padding: 2px 5px; border-radius: 4px; white-space: nowrap; background: var(--surface-soft); }
.command-summary { padding: 9px 16px 3px; color: var(--card-text-muted); font-size: 12px; display: flex; justify-content: space-between; }
.command-results { padding: 5px 7px 8px; display: grid; gap: 2px; overflow-y: auto; max-height: min(46dvh, 390px); scrollbar-width: thin; }
.command-item { display: flex; align-items: center; gap: 10px; text-align: left; padding: 8px 10px; min-height: 49px; border: 1px solid transparent; border-radius: 6px; background: none; color: inherit; cursor: pointer; min-width: 0; }
.command-item:hover, .command-item.selected { background: var(--accent-soft); }
.command-item.selected { border-color: var(--hairline-strong); }
.command-item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.command-glyph { display: grid; place-items: center; background: var(--surface-elevated); color: var(--card-text-soft); width: 32px; height: 32px; border: 1px solid var(--hairline); border-radius: 6px; flex: none; font-size: 11px; font-weight: 650; overflow: hidden; }
.command-glyph img { width: 24px; height: 24px; object-fit: contain; }
.command-item-text { flex: 1; display: grid; gap: 2px; min-width: 0; }
.command-item-text strong, .command-item-text small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.command-item-text strong { font-size: 13px; font-weight: 650; }
.command-item-text small { font-family: var(--font-mono); }
.command-item-text small, .command-kind, .command-footer { color: var(--card-text-muted); font-size: 12px; }
.command-kind { white-space: nowrap; }
.command-empty { padding: 24px 12px; text-align: center; color: var(--card-text-muted); font-size: 13px; }
.command-footer { padding: 11px 15px; border-top: 1px solid var(--hairline); display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.command-confirm { padding: 18px; display: grid; gap: 12px; font-size: 14px; }
.command-confirm p { margin: 0; overflow-wrap: anywhere; color: var(--card-text-muted); }
.command-confirm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.command-confirm-actions button { border: 1px solid var(--hairline); color: inherit; background: var(--surface-elevated); padding: 9px 12px; border-radius: 6px; cursor: pointer; }
.command-confirm-actions .command-primary { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.visually-hidden { position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); overflow: hidden; }
@media (max-width: 420px) { .command-header { padding: 12px; } .command-item { gap: 7px; padding-inline: 7px; } .command-kind { font-size: 11px; } .command-footer { padding: 10px 12px; } }
</style>
