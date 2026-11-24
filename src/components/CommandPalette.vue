<template>
  <BaseDialog ref="dialog" class="command-dialog" aria-label="快捷启动命令面板" @close="emit('close')" @opened="focusSearch">
    <div class="command-shell">
      <header class="command-header">
        <label class="visually-hidden" for="command-search">搜索常用链接或历史记录</label>
        <input id="command-search" ref="searchInput" v-model="query" type="search"
          placeholder="搜索应用、网址或标签…" autocomplete="off"
          aria-label="搜索命令" aria-controls="command-results" aria-autocomplete="list"
          :aria-activedescendant="matches[selectedIndex] ? `command-item-${selectedIndex}` : undefined"
          @keydown.esc.stop.prevent="dialog?.close()" @keydown="onKeydown" />
        <kbd>Esc</kbd>
      </header>
      <SegmentedTabs class="command-sources" label="搜索范围" :items="sources" :model-value="source" @update:model-value="changeSource" />
      <div v-if="pending" class="command-confirm">
        <strong>确认打开未知应用协议？</strong>
        <p>协议 {{ pending.protocol }} 可能唤起外部程序，是否继续？</p>
        <div class="command-confirm-actions">
          <BaseButton @click="returnToSearch">返回</BaseButton>
          <BaseButton @click="copyPending">复制原始地址</BaseButton>
          <BaseButton variant="primary" class="command-primary" @click="confirmOpen">确认打开</BaseButton>
        </div>
      </div>
      <div v-else id="command-results" class="command-results" role="listbox" aria-label="匹配的快捷操作">
        <p v-if="!matches.length" class="command-empty">没有找到匹配项</p>
        <button v-for="(item, index) in matches" :key="item.key" :id="`command-item-${index}`" type="button"
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
  </BaseDialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import BaseDialog from './ui/BaseDialog.vue'
import BaseButton from './ui/BaseButton.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'
import { buildLauncherEntries, searchLauncher } from '../domain/launcherSearch.js'
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

const source=ref('all')
const sources=[{id:'all',label:'全部'},{id:'common',label:'常用链接'},{id:'history',label:'历史记录'}]
const entries=computed(()=>buildLauncherEntries(props.commonLinks,props.history))
const matches=computed(()=>searchLauncher(entries.value,query.value,source.value))
function changeSource(next) {
  source.value=next
  selectedIndex.value=0
  pending.value=null
  nextTick(()=>{const list=dialog.value?.element?.querySelector('.command-results');if(list)list.scrollTop=0})
}
function focusSearch(){searchInput.value?.focus({preventScroll:true})}

watch(query, () => {
  selectedIndex.value = 0; pending.value = null
  nextTick(()=>{const list=dialog.value?.element?.querySelector('.command-results');if(list)list.scrollTop=0})
})
watch(matches, list => { if (selectedIndex.value >= list.length) selectedIndex.value = Math.max(0, list.length - 1) })
function returnToSearch() { pending.value = null; nextTick(() => searchInput.value?.focus({ preventScroll:true })) }
function revealSelection() {
  nextTick(() => {
    const container = dialog.value?.element?.querySelector('.command-results')
    const item = container?.querySelector('[aria-selected="true"]')
    if (!container || !item) return
    const row = item.getBoundingClientRect(), viewport = container.getBoundingClientRect()
    // 仅滚动结果区，避免 scrollIntoView 移动弹窗或背景页面。
    if (row.bottom > viewport.bottom) container.scrollTop += row.bottom - viewport.bottom
    else if (row.top < viewport.top) container.scrollTop -= viewport.top - row.top
  })
}

function onKeydown(event) {
  if (event.isComposing || pending.value) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const count = matches.value.length
    if (count) {
      selectedIndex.value = (selectedIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
      revealSelection()
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
    nextTick(() => dialog.value?.element?.querySelector('.command-confirm-actions button')?.focus({preventScroll:true}))
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

</script>

<style scoped>
.command-dialog { border: 1px solid var(--hairline, #dce1e9); padding: 0; width: min(620px, calc(100vw - 32px)); max-height: min(75dvh, 620px); border-radius: 18px; background: var(--card-bg-solid, #fff); color: var(--card-text, #172033); box-shadow: 0 32px 90px #0003; }
.command-dialog::backdrop { background: #0d15268a; backdrop-filter: blur(5px); }
.command-shell { display:grid; grid-template-rows:auto auto minmax(0,1fr) auto; height:100%; min-width:0; min-height:0; }
.command-dialog { height:min(440px,calc(100dvh - 32px)); max-height:none; overflow:hidden; box-sizing:border-box; }
.command-sources { position:relative; isolation:isolate; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; margin:8px 12px 0; padding:var(--tab-padding); border:1px solid var(--hairline); border-radius:var(--radius-navigation); background:var(--glass-navigation); }
.command-header:focus-within { box-shadow:inset 0 -1px var(--accent); }
.command-results,.command-confirm { min-height:0; align-content:start; overflow-y:auto; scrollbar-gutter:stable; }
.command-header { display: flex; gap: 12px; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--hairline, #dce1e9); }
.command-header input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: inherit; font: inherit; font-size: 16px; }
.command-header kbd { font-size: 11px; border: 1px solid var(--hairline, #dce1e9); padding: 4px 7px; border-radius: 6px; white-space: nowrap; }
.command-results { padding: 8px; display: grid; gap: 3px; overflow-y: auto; min-height:0; align-content:start; }
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
.command-confirm { padding:20px; display:grid; gap:12px; font-size:14px; min-height:0; overflow-y:auto; align-content:start; }
.command-confirm p { margin: 0; word-break: break-all; color: var(--card-text-muted, #7c879b); }
.command-confirm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.command-confirm-actions button { border: 1px solid var(--hairline, #dce1e9); color: inherit; background: var(--surface-elevated, #fff); padding: 9px 12px; border-radius: 9px; cursor: pointer; }
.command-confirm-actions .command-primary { background: var(--accent, #4f6ef7); color: var(--on-accent); }
.visually-hidden { position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); overflow: hidden; }
@media (prefers-reduced-motion: reduce) { .command-dialog::backdrop { backdrop-filter: none; } }
</style>
