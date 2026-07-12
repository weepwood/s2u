<template>
  <section class="settings-panel" aria-labelledby="sync-title">
    <div class="settings-head">
      <span class="settings-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M7.5 16A4.5 4.5 0 0 1 8 7.03 5.5 5.5 0 0 1 18.47 9 3.5 3.5 0 0 1 18 16H7.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="m9 13 3-3 3 3M12 10v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <div>
        <h3 id="sync-title">GitHub Gist 同步</h3>
        <p>在多个设备之间合并历史记录。Token 仅保存在当前浏览器。</p>
      </div>
      <span class="sync-status" :class="syncStatus || 'idle'">
        <span aria-hidden="true"></span>
        {{ statusLabel }}
      </span>
    </div>

    <div class="token-field">
      <div class="field-label">
        <label for="gist-token">Personal Access Token</label>
        <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">
          创建 Token
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 16 16 8M9 8h7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
      <div class="token-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="8" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/>
          <path d="M12 12h9m-3 0v3m-3-3v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <input
          id="gist-token"
          :value="cloudToken"
          type="password"
          placeholder="ghp_••••••••••••••••"
          autocomplete="off"
          :disabled="syncStatus === 'connected'"
          @input="$emit('update:cloudToken', $event.target.value)"
        />
      </div>
      <p v-if="syncStatus === 'error'" class="sync-error" role="alert">{{ syncError || '连接失败，请检查 Token 权限。' }}</p>
      <p v-else class="field-help">需要具备 Gist 读写权限；请勿在公共设备保存 Token。</p>
    </div>

    <div class="settings-actions">
      <button
        v-if="syncStatus !== 'connected'"
        type="button"
        class="primary-action"
        :disabled="syncStatus === 'connecting' || !cloudToken.trim()"
        @click="$emit('connect')"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8.5 15.5 15.5 8.5M7 10H5.75A3.75 3.75 0 0 0 2 13.75v2.5A3.75 3.75 0 0 0 5.75 20h2.5A3.75 3.75 0 0 0 12 16.25V15m0-6V7.75A3.75 3.75 0 0 1 15.75 4h2.5A3.75 3.75 0 0 1 22 7.75v2.5A3.75 3.75 0 0 1 18.25 14H17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
        {{ syncStatus === 'connecting' ? '正在连接…' : '连接 Gist' }}
      </button>
      <template v-else>
        <button type="button" class="primary-action" @click="$emit('sync')">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5M6.1 8.2A7 7 0 0 1 18.7 10M17.9 15.8A7 7 0 0 1 5.3 14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          立即同步
        </button>
        <button type="button" class="secondary-action" @click="$emit('disconnect')">断开连接</button>
      </template>

      <a
        v-if="cloudGistId"
        class="gist-link"
        :href="'https://gist.github.com/' + cloudGistId"
        target="_blank"
        rel="noopener"
      >
        打开 Gist
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 16 16 8M9 8h7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </div>

    <p v-if="lastSyncTime && syncStatus === 'connected'" class="last-sync">
      上次同步：{{ formatDate(lastSyncTime) }}
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  cloudToken: { type: String, default: '' },
  cloudGistId: { type: String, default: '' },
  syncStatus: { type: String, default: '' },
  syncError: { type: String, default: '' },
  lastSyncTime: { type: Number, default: null },
})

defineEmits(['update:cloudToken', 'connect', 'disconnect', 'sync'])

const statusLabel = computed(() => {
  if (props.syncStatus === 'connected') return '已连接'
  if (props.syncStatus === 'connecting') return '连接中'
  if (props.syncStatus === 'error') return '连接异常'
  return '未连接'
})

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
</script>

<style scoped>
.settings-panel {
  margin-top: 18px;
  padding: 18px;
  display: grid;
  gap: 18px;
  border: 1px solid var(--hairline);
  border-radius: 16px;
  background: var(--surface-soft);
}

.settings-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 11px;
}

.settings-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid var(--hairline);
  border-radius: 11px;
  background: var(--surface-elevated);
  color: var(--accent);
}

.settings-icon svg {
  width: 19px;
  height: 19px;
}

.settings-head h3 {
  margin: 1px 0 4px;
  color: var(--card-text);
  font-size: 14px;
}

.settings-head p {
  margin: 0;
  color: var(--card-text-muted);
  font-size: 10px;
  line-height: 1.55;
}

.sync-status {
  min-height: 26px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  color: var(--card-text-muted);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.sync-status > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.sync-status.connected {
  color: var(--success);
}

.sync-status.connecting {
  color: var(--accent);
}

.sync-status.error {
  color: var(--danger);
}

.token-field {
  display: grid;
  gap: 8px;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-label label {
  color: var(--card-text-soft);
  font-size: 11px;
  font-weight: 700;
}

.field-label a,
.gist-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 680;
  text-decoration: none;
}

.field-label a:hover,
.gist-link:hover {
  text-decoration: underline;
}

.field-label svg,
.gist-link svg {
  width: 13px;
  height: 13px;
}

.token-input-wrap {
  height: 44px;
  display: flex;
  align-items: center;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface-elevated);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.token-input-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.token-input-wrap > svg {
  width: 18px;
  height: 18px;
  margin: 0 11px 0 13px;
  color: var(--card-text-muted);
}

.token-input-wrap input {
  min-width: 0;
  flex: 1;
  height: 100%;
  padding-right: 12px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--card-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.token-input-wrap input::placeholder {
  color: var(--card-text-muted);
}

.token-input-wrap input:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.field-help,
.sync-error,
.last-sync {
  margin: 0;
  color: var(--card-text-muted);
  font-size: 10px;
  line-height: 1.5;
}

.sync-error {
  color: var(--danger);
}

.settings-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.primary-action,
.secondary-action {
  min-height: 36px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 10px;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.primary-action {
  border: 0;
  background: var(--accent);
  color: #ffffff;
}

.primary-action:hover:not(:disabled) {
  background: var(--accent-hover);
}

.primary-action:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.primary-action svg {
  width: 15px;
  height: 15px;
}

.secondary-action {
  border: 1px solid var(--hairline);
  background: var(--surface-elevated);
  color: var(--card-text-soft);
}

.secondary-action:hover {
  border-color: var(--hairline-strong);
  color: var(--card-text);
}

.gist-link {
  margin-left: auto;
}

.last-sync {
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
}

@media (max-width: 560px) {
  .settings-panel {
    padding: 15px;
  }

  .settings-head {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .sync-status {
    grid-column: 2;
    justify-self: start;
  }

  .settings-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .gist-link {
    margin-left: 0;
  }
}
</style>
