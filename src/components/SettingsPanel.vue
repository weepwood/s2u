<template>
  <div class="settings-panel">
    <div class="settings-header">
      GitHub Gist 同步
      <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" class="settings-link">获取 Token</a>
      <a
        v-if="cloudGistId"
        :href="'https://gist.github.com/' + cloudGistId"
        target="_blank"
        rel="noopener"
        class="settings-link"
      >
        Gist 仓库
      </a>
    </div>
    <div class="settings-row">
      <input
        :value="cloudToken"
        @input="$emit('update:cloudToken', $event.target.value)"
        class="text-input settings-input"
        type="password"
        placeholder="GitHub Personal Access Token (gist scope)"
        :disabled="syncStatus === 'connected'"
      />
    </div>
    <div class="settings-row settings-actions">
      <button
        v-if="syncStatus !== 'connected'"
        class="copy-btn"
        style="height:32px;font-size:13px;padding:0 14px"
        @click="$emit('connect')"
        :disabled="syncStatus === 'connecting' || !cloudToken.trim()"
      >
        {{ syncStatus === 'connecting' ? '连接中…' : '连接' }}
      </button>
      <button v-else class="clear-btn" @click="$emit('disconnect')">断开</button>
      <span class="sync-status" :class="syncStatus">
        <span v-if="syncStatus === 'connected'">● 已连接</span>
        <span v-else-if="syncStatus === 'connecting'">⟳ 连接中…</span>
        <span v-else-if="syncStatus === 'error'">⚠ {{ syncError }}</span>
        <span v-else>○ 未连接</span>
      </span>
    </div>
    <div v-if="syncStatus === 'connected'" class="settings-row settings-info">
      <span v-if="lastSyncTime">上次同步：{{ formatDate(lastSyncTime) }}</span>
      <button class="text-link" @click="$emit('sync')">立即同步</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cloudToken: { type: String, default: '' },
  cloudGistId: { type: String, default: '' },
  syncStatus: { type: String, default: '' },
  syncError: { type: String, default: '' },
  lastSyncTime: { type: Number, default: null },
})

defineEmits(['update:cloudToken', 'connect', 'disconnect', 'sync'])

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const sec = String(date.getSeconds()).padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${min}:${sec}`
}
</script>

<style scoped>
.settings-panel {
  margin-top: 16px;
  padding: 16px;
  background: var(--surface-elevated);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.settings-header {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--card-text);
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-link {
  font-size: 12px;
  font-weight: 400;
  color: var(--accent);
  text-decoration: none;
}

.settings-link:hover { text-decoration: underline; }

.settings-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-input {
  height: 34px;
  font-size: 13px;
  width: 100%;
}

.settings-actions { flex-wrap: wrap; }

.settings-info {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--card-text-muted);
  gap: 12px;
  flex-wrap: wrap;
}

.sync-status {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
}

.sync-status.connected { color: #5db872; }
.sync-status.connecting { color: var(--accent); }
.sync-status.error { color: #c64545; }

.text-input {
  width: 100%;
  padding: 0 12px;
  background: var(--surface-elevated);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: var(--card-text);
  outline: none;
  transition: border-color 0.2s ease;
}

.text-input::placeholder { color: var(--card-text-muted); }
.text-input:focus { border-color: var(--accent); }

.copy-btn {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.copy-btn:hover:not(:disabled) { background: #43658a; }
.copy-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.clear-btn {
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 6px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--card-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover { color: var(--card-text); border-color: var(--hairline-strong); }

.text-link {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
  background: none;
  border: none;
  font-size: 13px;
  font-family: inherit;
  padding: 0;
}

.text-link:hover { text-decoration: underline; }
</style>
