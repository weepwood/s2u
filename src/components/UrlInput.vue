<template>
  <div class="section input-section">
    <div class="input-row">
      <label for="url" class="sr-only">需要跳转的地址</label>
      <div class="input-wrap" :class="{ error: urlError }">
        <input
          id="url"
          ref="urlInput"
          v-model="urlValue"
          class="text-input"
          :class="{ 'input-error': urlError }"
          placeholder="例如 weixin://open、example.com"
          @keydown.enter="emitCopy"
          @input="emitError('')"
        />
        <span v-if="urlError" class="input-error-msg">{{ urlError }}</span>
      </div>
      <button
        class="copy-btn"
        :class="{ copied: copyText === 'Copied!', failed: copyText === 'Failed' }"
        @click="emitCopy"
        :disabled="!urlValue.trim()"
      >
        {{ copyText }}
      </button>
    </div>

    <!-- Generated URL display -->
    <div v-if="urlValue && !urlError" class="url-display">
      <span class="url-label">Generated URL</span>
      <span class="url-text" @click="$emit('goto', toUrl)">
        {{ decodeURI(toUrl) }}
      </span>
    </div>

    <!-- Recently copied URLs -->
    <div v-if="urlList.length" class="copied-list">
      <div class="copied-header">
        <span class="url-label">最近复制</span>
      </div>
      <div v-for="item in urlList" :key="item" class="copied-item" @click="$emit('goto', item)">
        <span class="copied-icon">→</span>
        <span class="copied-text">{{ decodeURI(item) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  url: { type: String, default: '' },
  urlList: { type: Array, default: () => [] },
  copyText: { type: String, default: 'Copy' },
  urlError: { type: String, default: '' },
  origin: { type: String, required: true },
})

const emit = defineEmits(['update:url', 'copy', 'goto', 'update:urlError'])

const urlInput = ref(null)

const urlValue = computed({
  get: () => props.url,
  set: (val) => emit('update:url', val),
})

function emitError(msg) {
  emit('update:urlError', msg)
}

function emitCopy() {
  emit('copy')
}

const toUrl = computed(() => {
  return encodeURI(props.origin + '/#' + props.url)
})

onMounted(() => {
  urlInput.value?.focus()
})
</script>

<style scoped>
/* ─── Input Row ─── */
.input-section {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.input-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.text-input {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  background: var(--surface-elevated);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  color: var(--card-text);
  outline: none;
  transition: border-color 0.2s ease, background 0.3s ease, color 0.3s ease;
}

.text-input::placeholder { color: var(--card-text-muted); }
.text-input:focus { border-color: var(--accent); }
.text-input.input-error { border-color: #c64545; }

.input-error-msg {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: #c64545;
  line-height: 1.4;
}

/* ─── Copy Button ─── */
.copy-btn {
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease, opacity 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.copy-btn:hover:not(:disabled) { background: #43658a; }
.copy-btn:active:not(:disabled) { transform: scale(0.97); }

.copy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.copy-btn.copied { background: #5db872; }
.copy-btn.failed { background: #c64545; }

/* ─── Generated URL ─── */
.url-display {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.url-label {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--card-text-muted);
}

.url-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--accent);
  cursor: pointer;
  word-break: break-all;
  padding: 8px 12px;
  background: var(--surface-elevated);
  border-radius: 8px;
  transition: background 0.15s ease;
}

.url-text:hover {
  background: var(--surface-soft);
  text-decoration: underline;
}

/* ─── Copied URL List ─── */
.copied-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.copied-header { margin-bottom: 2px; }

.copied-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-elevated);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.copied-item:hover { background: var(--surface-soft); }

.copied-icon {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--accent);
  flex-shrink: 0;
}

.copied-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--card-text-muted);
  word-break: break-all;
}

.copied-item:hover .copied-text { color: var(--card-text); }

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
  .input-row {
    flex-direction: column;
    gap: 8px;
  }
  .copy-btn { width: 100%; }
}
</style>
