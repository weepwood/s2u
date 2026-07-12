<template>
  <section class="history-panel" aria-labelledby="history-list-title">
    <div class="section-heading">
      <div>
        <span class="section-kicker">Link archive</span>
        <h2 id="history-list-title">历史记录</h2>
      </div>
      <span class="total-badge">{{ history.length }} 条记录</span>
    </div>

    <div v-if="history.length" class="search-wrap">
      <span class="search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/>
          <path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
      </span>
      <input
        :value="searchQuery"
        class="search-input"
        placeholder="搜索 URL、域名或 Scheme"
        aria-label="搜索历史记录"
        @input="$emit('update:searchQuery', $event.target.value)"
      />
      <kbd>⌘ K</kbd>
      <button
        v-if="searchQuery"
        type="button"
        class="search-clear"
        aria-label="清除搜索"
        @click="$emit('update:searchQuery', '')"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div v-if="filteredHistory.length === 0" class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 7.5h16M6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4Z" stroke="currentColor" stroke-width="1.6"/>
          <path d="M9 11h6M9 15h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </span>
      <h3>{{ searchQuery ? '没有找到匹配记录' : '还没有创建过链接' }}</h3>
      <p>{{ searchQuery ? '尝试更换关键词，或清除当前搜索条件。' : '复制第一个跳转链接后，它会出现在这里。' }}</p>
      <button v-if="searchQuery" type="button" @click="$emit('update:searchQuery', '')">清除搜索</button>
    </div>

    <div v-else class="history-list">
      <article v-for="item in filteredHistory" :key="item.scheme" class="history-item">
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
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  history: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  filteredHistory: { type: Array, default: () => [] },
})

defineEmits(['update:searchQuery', 'select', 'delete'])

function formatDate(timestamp) {
  const date = new Date(timestamp)
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
.history-panel {
  display: grid;
  gap: 20px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-kicker {
  display: block;
  margin-bottom: 5px;
  color: var(--card-text-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.section-heading h2 {
  margin: 0;
  color: var(--card-text);
  font-size: 21px;
  letter-spacing: -0.025em;
}

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

.search-wrap {
  height: 46px;
  display: flex;
  align-items: center;
  border: 1px solid var(--hairline);
  border-radius: 13px;
  background: var(--surface-elevated);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.search-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.search-icon {
  width: 43px;
  display: grid;
  place-items: center;
  color: var(--card-text-muted);
}

.search-icon svg {
  width: 18px;
  height: 18px;
}

.search-input {
  min-width: 0;
  flex: 1;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--card-text);
  font: inherit;
  font-size: 13px;
}

.search-input::placeholder {
  color: var(--card-text-muted);
}

.search-wrap kbd {
  margin-right: 8px;
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--card-text-muted);
  font: inherit;
  font-size: 10px;
}

.search-clear {
  width: 34px;
  height: 34px;
  margin-right: 5px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--card-text-muted);
  cursor: pointer;
}

.search-clear:hover {
  background: var(--surface-soft);
  color: var(--card-text);
}

.search-clear svg {
  width: 15px;
  height: 15px;
}

.empty-state {
  padding: 42px 20px 34px;
  display: grid;
  justify-items: center;
  text-align: center;
}

.empty-icon {
  width: 58px;
  height: 58px;
  margin-bottom: 15px;
  display: grid;
  place-items: center;
  border: 1px solid var(--hairline);
  border-radius: 18px;
  background: var(--surface-soft);
  color: var(--accent);
}

.empty-icon svg {
  width: 27px;
  height: 27px;
}

.empty-state h3 {
  margin: 0;
  color: var(--card-text);
  font-size: 15px;
}

.empty-state p {
  max-width: 320px;
  margin: 7px 0 0;
  color: var(--card-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.empty-state button {
  margin-top: 15px;
  padding: 7px 12px;
  border: 1px solid var(--hairline);
  border-radius: 9px;
  background: var(--surface-elevated);
  color: var(--card-text-soft);
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
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
  font-family: 'JetBrains Mono', monospace;
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
  .total-badge,
  .search-wrap kbd {
    display: none;
  }

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
</style>
