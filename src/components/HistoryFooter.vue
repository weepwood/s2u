<template>
  <footer class="history-footer">
    <div class="footer-actions" aria-label="历史记录操作">
      <button type="button" @click="$emit('export')">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        导出
      </button>
      <button type="button" @click="triggerImport">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15V3m0 0 4 4m-4-4L8 7M5 19h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        导入
      </button>
      <button
        type="button"
        :class="{ active: showSettings }"
        :aria-expanded="showSettings"
        @click="$emit('toggleSettings')"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9.5 4.5 10 3h4l.5 1.5 1.7.7 1.4-.7 2 2-.7 1.4.7 1.7L21 10v4l-1.4.4-.7 1.7.7 1.4-2 2-1.4-.7-1.7.7L14 21h-4l-.5-1.5-1.7-.7-1.4.7-2-2 .7-1.4-.7-1.7L3 14v-4l1.4-.4.7-1.7-.7-1.4 2-2 1.4.7 1.7-.7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        {{ showSettings ? '收起同步' : '云端同步' }}
      </button>
      <button type="button" class="danger-action" @click="$emit('clear')">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        清空
      </button>
      <input ref="importInput" type="file" accept=".json,application/json" class="sr-only" @change="$emit('importFile', $event)" />
    </div>

    <p>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      </svg>
      记录默认保存在本机浏览器。
      <a href="https://github.com/weepwood/s2u" target="_blank" rel="noopener">查看源代码</a>
    </p>
  </footer>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  showSettings: { type: Boolean, default: false },
})

defineEmits(['clear', 'export', 'toggleSettings', 'importFile'])

const importInput = ref(null)

function triggerImport() {
  importInput.value?.click()
}
</script>

<style scoped>
.history-footer {
  margin-top: 22px;
  padding-top: 18px;
  display: grid;
  gap: 13px;
  border-top: 1px solid var(--hairline);
}

.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.footer-actions button {
  min-height: 36px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--surface-elevated);
  color: var(--card-text-soft);
  font: inherit;
  font-size: 11px;
  font-weight: 680;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.footer-actions button:hover {
  border-color: var(--hairline-strong);
  background: var(--surface-hover);
  color: var(--card-text);
  transform: translateY(-1px);
}

.footer-actions button.active {
  border-color: color-mix(in srgb, var(--accent) 36%, var(--hairline));
  background: var(--accent-soft);
  color: var(--accent);
}

.footer-actions button.danger-action:hover {
  border-color: color-mix(in srgb, var(--danger) 32%, var(--hairline));
  background: color-mix(in srgb, var(--danger) 9%, transparent);
  color: var(--danger);
}

.footer-actions svg {
  width: 15px;
  height: 15px;
}

.history-footer p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--card-text-muted);
  font-size: 10px;
  line-height: 1.5;
}

.history-footer p svg {
  width: 14px;
  height: 14px;
  color: var(--success);
}

.history-footer a {
  color: var(--accent);
  text-decoration: none;
}

.history-footer a:hover {
  text-decoration: underline;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 560px) {
  .footer-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-actions button {
    justify-content: center;
  }

  .history-footer p {
    align-items: flex-start;
  }
}
</style>
