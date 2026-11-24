<template>
  <footer class="history-footer">
    <div class="footer-actions" aria-label="历史记录操作">
      <button
        type="button"
        :class="{ active: showSettings }"
        aria-haspopup="dialog"
        @click="$emit('toggleSettings')"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9.5 4.5 10 3h4l.5 1.5 1.7.7 1.4-.7 2 2-.7 1.4.7 1.7L21 10v4l-1.4.4-.7 1.7.7 1.4-2 2-1.4-.7-1.7.7L14 21h-4l-.5-1.5-1.7-.7-1.4.7-2-2 .7-1.4-.7-1.7L3 14v-4l1.4-.4.7-1.7-.7-1.4 2-2 1.4.7 1.7-.7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        云端同步
      </button>
      <button type="button" class="danger-action" @click="$emit('clear')">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        清空
      </button>
    </div>

    <p>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      </svg>
      默认本机保存，云端同步可选。
    </p>
  </footer>
</template>

<script setup>
defineProps({
  showSettings: { type: Boolean, default: false },
})

defineEmits(['clear', 'toggleSettings'])
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
