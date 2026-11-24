<template>
  <section class="history-panel panel-stack" aria-labelledby="history-list-title">
    <div class="section-heading panel-head">
      <div>
        <h2 id="history-list-title">历史记录</h2>
      </div>
      <span class="total-badge panel-meta">{{ history.length }} 条记录</span>
    </div>

    <div class="panel-toolbar">
      <div class="search-wrap control-field">
        <span class="search-icon control-field__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/>
            <path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
        </span>
        <input
          :value="searchQuery"
          class="search-input control-field__input"
          placeholder="搜索 URL、域名或 Scheme"
          aria-label="搜索历史记录"
          @input="$emit('update:searchQuery', $event.target.value)"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="search-clear control-field__clear"
          aria-label="清除搜索"
          @click="$emit('update:searchQuery', '')"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="panel-toolbar-actions" aria-label="历史记录导入导出">
      <button class="action-btn" type="button" @click="$emit('export')">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        导出
      </button>
      <button class="action-btn" type="button" @click="triggerImport">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15V3m0 0 4 4m-4-4L8 7M5 19h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        导入
      </button>
        <input ref="importInput" type="file" accept=".json,application/json" class="control-visually-hidden" tabindex="-1" aria-label="导入历史记录文件" @change="$emit('importFile', $event)" />
      </div>
    </div>

    <div v-if="history.length" class="history-filters">
      <div class="history-filter-fields">
        <select v-model="protocol" aria-label="按协议筛选">
          <option value="">全部协议</option>
          <option v-for="value in protocols" :key="value" :value="value">{{ value.slice(0,-1) }}</option>
        </select>
        <select v-model="order" aria-label="历史排序">
          <option value="recent">最近使用</option>
          <option value="count">使用频率</option>
        </select>
      </div>
      <span aria-live="polite">{{ visibleHistory.length }} / {{ history.length }} 条</span>
    </div>

    <EmptyState v-if="visibleHistory.length === 0" class="empty-state" :kind="history.length ? 'search' : 'history'"
      :title="history.length ? '没有找到匹配记录' : '还没有创建过链接'" :description="history.length ? '' : '复制链接后自动保存。'">
      <template v-if="history.length || searchQuery" #actions><BaseButton @click="clearFilters">清除搜索</BaseButton></template>
    </EmptyState>

    <TransitionGroup v-else tag="div" name="workspace-list" class="history-list">
      <template v-for="group in groups" :key="group.key">
      <h3 v-if="order === 'recent'" class="history-day-heading">{{ group.label }}</h3>
      <article v-for="item in group.items" :key="item.scheme" class="history-item">
        <button
          type="button"
          class="history-main"
          :title="item.scheme"
          @click="$emit('select', item.scheme)"
        >
          <span class="scheme-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M8.5 15.5 15.5 8.5M7 10H5.75A3.75 3.75 0 0 0 2 13.75v2.5A3.75 3.75 0 0 0 5.75 20h2.5A3.75 3.75 0 0 0 12 16.25V15m0-6V7.75A3.75 3.75 0 0 1 15.75 4h2.5A3.75 3.75 0 0 1 22 7.75v2.5A3.75 3.75 0 0 1 18.25 14H17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="history-content">
            <strong>{{ item.scheme }}</strong>
            <span>
              {{ formatDate(item.recently).relative }}
              <span aria-hidden="true">·</span>
              已使用 {{ item.count }} 次
            </span>
          </span>
          <span class="open-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M8 16 16 8M9 8h7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

        <div class="history-actions">
        <button type="button" class="history-bookmark" :aria-label="isBookmarked(item.scheme) ? '已收藏 ' + item.scheme : '收藏 ' + item.scheme"
          :title="isBookmarked(item.scheme) ? '已在常用链接中' : '添加到常用链接'"
          :disabled="isBookmarked(item.scheme)" @click="beginBookmark(item.scheme)">
          <svg viewBox="0 0 24 24" :fill="isBookmarked(item.scheme) ? 'currentColor' : 'none'" aria-hidden="true"><path d="M12 3.5 14.7 9l6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
        </button>
        <button
          type="button"
          class="delete-btn"
          title="删除此记录"
          :aria-label="`删除 ${item.scheme}`"
          @click="$emit('delete', item.scheme)"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        </div>
      </article>
      </template>
    </TransitionGroup>
    <BaseDialog v-if="bookmarkTarget" ref="bookmarkDialog" class="editor-dialog history-bookmark-dialog" aria-labelledby="history-bookmark-title" @close="bookmarkTarget = ''">
      <form class="history-bookmark-form" @submit.prevent="submitBookmark">
        <h3 id="history-bookmark-title">添加到常用链接</h3>
        <label for="history-bookmark-name">应用名称</label>
        <BaseInput id="history-bookmark-name" v-model="bookmarkName" maxlength="36" required />
        <code>{{ bookmarkTarget }}</code>
        <p v-if="bookmarkError" role="alert" class="bookmark-error">{{ bookmarkError }}</p>
        <div class="history-bookmark-actions">
          <BaseButton @click="bookmarkDialog?.close()">取消</BaseButton>
          <BaseButton type="submit" variant="primary">保存收藏</BaseButton>
        </div>
      </form>
    </BaseDialog>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { normalizeTarget } from '../domain/linkCodec.js'
import { historyProtocol, selectHistoryView, groupHistoryByDay, historyBookmarkName } from '../domain/historyView.js'
import BaseDialog from './ui/BaseDialog.vue'
import BaseButton from './ui/BaseButton.vue'
import EmptyState from './ui/EmptyState.vue'
import BaseInput from './ui/BaseInput.vue'

const props=defineProps({
  history: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  filteredHistory: { type: Array, default: () => [] },
  commonLinks: {type:Array,default:()=>[]},
  saveBookmark: {type:Function,required:true},
})

const emit=defineEmits(['update:searchQuery', 'select', 'delete', 'export', 'importFile'])
const protocol=ref(''),order=ref('recent')
const protocols=computed(()=>[...new Set(props.history.map(historyProtocol))].sort())
watch(protocols,values=>{if(protocol.value&&!values.includes(protocol.value))protocol.value=''})
const visibleHistory=computed(()=>selectHistoryView(props.history,{query:props.searchQuery,protocol:protocol.value,order:order.value}))
const groups=computed(()=>order.value==='recent'?groupHistoryByDay(visibleHistory.value):[{key:'all',items:visibleHistory.value}])
function clearFilters(){protocol.value='';emit('update:searchQuery','')}
const bookmarkDialog=ref(null),bookmarkTarget=ref(''),bookmarkName=ref(''),bookmarkError=ref('')
const targets=computed(()=>new Set(props.commonLinks.map(item=>item.target)))
function isBookmarked(target){const result=normalizeTarget(target);return result.ok&&targets.value.has(result.target)}
function beginBookmark(target) {
  try{
    const result=normalizeTarget(target)
    if(!result.ok||isBookmarked(target))return
    bookmarkName.value=historyBookmarkName(result.target)
    bookmarkError.value=''
    bookmarkTarget.value=result.target
  }catch(error){bookmarkError.value=error.message}
}
function submitBookmark(){
  try{
    if(props.saveBookmark({name:bookmarkName.value,target:bookmarkTarget.value}))bookmarkDialog.value?.close()
    else bookmarkError.value='无法保存收藏，请检查本机存储状态'
  }catch(error){bookmarkError.value=error.message}
}
const importInput = ref(null)
function triggerImport() { importInput.value?.click() }

function formatDate(timestamp) {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return { relative: '未知时间', full: '' }

  const now = new Date()
  const diff = Math.max(0, now.getTime() - date.getTime())
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  let relative
  if (minutes < 1) relative = '刚刚'
  else if (minutes < 60) relative = `${minutes} 分钟前`
  else if (hours < 24) relative = `${hours} 小时前`
  else if (days === 1) relative = '昨天'
  else if (days < 30) relative = `${days} 天前`
  else relative = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

  return {
    relative,
    full: new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  }
}
</script>

<style scoped>
.total-badge {
  min-height: 30px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--card-text-muted);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.history-list {
  display: grid;
  gap: 7px;
}

.history-item {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: var(--surface-soft);
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.history-item:hover {
  border-color: var(--hairline);
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.history-main {
  min-width: 0;
  min-height: 64px;
  padding: 9px 8px 9px 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.scheme-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--hairline);
  border-radius: 11px;
  background: var(--surface-elevated);
  color: var(--accent);
}

.scheme-icon svg {
  width: 18px;
  height: 18px;
}

.history-content {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.history-content strong {
  overflow: hidden;
  color: var(--card-text);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-content > span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--card-text-muted);
  font-size: 10px;
}

.open-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: var(--card-text-muted);
}

.open-icon svg {
  width: 15px;
  height: 15px;
}

.history-main:hover .open-icon {
  background: var(--accent-soft);
  color: var(--accent);
}

.delete-btn {
  width: 36px;
  height: 36px;
  margin-right: 8px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--card-text-muted);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.16s ease, color 0.16s ease, background 0.16s ease;
}

.history-item:hover .delete-btn,
.delete-btn:focus-visible {
  opacity: 1;
}

.delete-btn:hover {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
}

.delete-btn svg {
  width: 17px;
  height: 17px;
}

@media (max-width: 640px) {
  .history-item {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .history-main {
    gap: 9px;
    padding-left: 8px;
  }

  .scheme-icon {
    width: 34px;
    height: 34px;
  }

  .open-icon {
    display: none;
  }

  .delete-btn {
    width: 34px;
    height: 34px;
    margin-right: 5px;
    opacity: 1;
  }
}
.history-filters { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; font-size:12px; color:var(--card-text-muted); }
.history-filter-fields { display:flex; gap:8px; min-width:0; }
.history-filter-fields select { min-width:0; max-width:150px; min-height:34px; padding:0 8px; border:1px solid var(--hairline); border-radius:var(--radius-control); background:var(--surface-elevated); color:var(--card-text); font:inherit; }
.history-day-heading { font-size:12px; color:var(--card-text-muted); font-weight:650; margin:8px 4px 2px; }
.history-actions { display:flex; gap:2px; align-items:center; }
.history-bookmark { display:grid; place-items:center; width:30px; height:36px; padding:0; border:0; border-radius:10px; background:transparent; color:var(--card-text-muted); cursor:pointer; }
.history-bookmark svg { width:17px; height:17px; }
.history-bookmark:hover:not(:disabled),.history-bookmark:focus-visible { color:var(--accent); background:var(--accent-soft); }
.history-bookmark:disabled { color:var(--accent); cursor:default; }
.history-item:focus-within .delete-btn { opacity:1; }
.history-bookmark-dialog { width:min(420px,calc(100vw - 24px)); max-width:none; max-height:calc(100dvh - 32px); padding:0; }
.history-bookmark-form { display:grid; gap:12px; padding:22px; min-width:0; }
.history-bookmark-form h3 { margin:0; font-size:18px; }
.history-bookmark-form label { font-size:12px; }
.history-bookmark-form code { font-size:12px; color:var(--card-text-muted); overflow-wrap:anywhere; }
.history-bookmark-actions { display:flex; justify-content:flex-end; gap:8px; }
.bookmark-error { margin:0; color:var(--danger); font-size:12px; }
@media(max-width:640px){.history-actions{gap:0}.history-bookmark{width:28px}.history-filter-fields select{max-width:130px}.history-bookmark-form{padding:16px}}
</style>
