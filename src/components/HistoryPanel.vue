<template>
  <div class="section history-section">
    <!-- Search -->
    <div class="search-row" v-if="history.length > 0">
      <div class="search-wrap">
        <input
          :value="searchQuery"
          @input="$emit('update:searchQuery', $event.target.value)"
          class="search-input"
          placeholder="搜索历史记录…"
          aria-label="搜索历史记录"
        />
        <button
          v-if="searchQuery"
          class="search-clear"
          @click="$emit('update:searchQuery', '')"
          aria-label="清除搜索"
        >
          ×
        </button>
      </div>
    </div>

    <div v-if="filteredHistory.length === 0" class="history-empty">
      <p v-if="searchQuery">
        无匹配记录
        <button class="text-link" @click="$emit('update:searchQuery', '')">清除搜索</button>
      </p>
      <p v-else>暂无历史记录</p>
    </div>
    <div v-for="item in filteredHistory" :key="item.scheme" class="history-item">
      <div class="history-scheme" @click="$emit('select', item.scheme)">
        <span :title="item.scheme">{{ truncateString(item.scheme, 30) }}</span>
      </div>
      <div class="history-meta">
        <span class="count-badge">{{ item.count }}</span>
        <span class="history-date" :title="formatDate(item.recently).data">
          {{ formatDate(item.recently).info }}
        </span>
        <button
          class="delete-item-btn"
          @click.stop="$emit('delete', item.scheme)"
          title="删除此记录"
          aria-label="删除此记录"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  history: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  filteredHistory: { type: Array, default: () => [] },
})

defineEmits(['update:searchQuery', 'select', 'delete'])

function truncateString(str, num) {
  if (str.length <= num) return str
  return str.slice(0, num) + '...'
}

function formatDate(timestamp) {
  function addLeadingZero(number) {
    if (number < 10) return `0${number}`
    return number
  }

  const date = new Date(timestamp)
  const now = new Date()

  const year = date.getFullYear()
  const month = addLeadingZero(date.getMonth() + 1)
  const day = addLeadingZero(date.getDate())
  const hour = addLeadingZero(date.getHours())
  const min = addLeadingZero(date.getMinutes())
  const second = addLeadingZero(date.getSeconds())

  const daysAgo = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (daysAgo === 0) {
    return { info: `今天 ${hour}:${min}`, data: `${year}/${month}/${day} ${hour}:${min}:${second}` }
  } else if (daysAgo === 1) {
    return { info: `昨天 ${hour}:${min}`, data: `${year}/${month}/${day} ${hour}:${min}:${second}` }
  } else if (daysAgo <= 30) {
    return { info: `${month}/${day} ${daysAgo}天前`, data: `${year}/${month}/${day} ${hour}:${min}:${second}` }
  }
  return { info: `${year}/${month}/${day}`, data: `${year}/${month}/${day} ${hour}:${min}:${second}` }
}
</script>

<style scoped>
.history-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Search ─── */
.search-row { margin-bottom: 12px; }

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 12px;
  background: var(--surface-elevated);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--card-text);
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input::placeholder { color: var(--card-text-muted); }
.search-input:focus { border-color: var(--accent); }

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--hairline);
  color: var(--card-text-muted);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  padding: 0;
}

.search-clear:hover {
  background: var(--hairline-strong);
  color: var(--card-text);
}

.history-empty {
  text-align: center;
  padding: 32px 0;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--card-text-muted);
}

/* ─── History Items ─── */
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: var(--surface-elevated);
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.history-item:hover { background: var(--surface-soft); }

.history-scheme {
  flex: 1;
  min-width: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--card-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  background: var(--hairline);
  border-radius: 9999px;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: var(--card-text-muted);
}

.history-date {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--card-text-muted);
  white-space: nowrap;
}

.delete-item-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--hairline-strong);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  padding: 0;
}

.history-item:hover .delete-item-btn { opacity: 1; }

.delete-item-btn:hover {
  background: #c64545;
  color: #ffffff;
}

.text-link {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
  background: none;
  border: none;
  font-size: inherit;
  font-family: inherit;
  padding: 0;
}

.text-link:hover { text-decoration: underline; }

@media (max-width: 600px) {
  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .history-meta { width: 100%; justify-content: space-between; }
}
</style>
