<template>
  <div class="history-footer">
    <div class="history-footer-left">
      <button class="outline-btn" @click="$emit('clear')">清空记录</button>
      <button class="outline-btn" @click="$emit('export')">导出</button>
      <button class="outline-btn" @click="triggerImport">导入</button>
      <button class="outline-btn" @click="$emit('toggleSettings')">
        {{ showSettings ? '关闭' : '⚙' }}
      </button>
      <input ref="importInput" type="file" accept=".json" class="sr-only" @change="$emit('importFile', $event)" />
    </div>
    <span class="history-note">
      所有记录均存放在本地，
      <a href="https://github.com/weepwood/s2u" target="_blank" rel="noopener">源代码</a>
    </span>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  showSettings: { type: Boolean, default: false },
})

defineEmits(['clear', 'export', 'import', 'toggleSettings', 'importFile'])

const importInput = ref(null)

function triggerImport() {
  importInput.value?.click()
}

defineExpose({ triggerImport })
</script>

<style scoped>
.history-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--hairline);
}

.history-footer-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.outline-btn {
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

.outline-btn:hover {
  color: var(--card-text);
  border-color: var(--hairline-strong);
}

.history-note {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--card-text-muted);
}

.history-note a {
  color: var(--accent);
  text-decoration: none;
}

.history-note a:hover { text-decoration: underline; }

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

@media (max-width: 600px) {
  .history-footer-left { width: 100%; justify-content: stretch; }
  .outline-btn { flex: 1; text-align: center; }
}
</style>
