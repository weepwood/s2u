<template>
  <section class="url-input-panel" aria-labelledby="create-link-title">
    <div class="section-heading">
      <div>
        <span class="section-kicker">Create a bridge</span>
        <h2 id="create-link-title">输入目标地址</h2>
      </div>
      <span class="privacy-badge">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        </svg>
        本地生成
      </span>
    </div>

    <div class="field-group">
      <label for="url">网址或 URL Scheme</label>
      <div class="input-row">
        <div class="input-wrap" :class="{ error: urlError, filled: urlValue }">
          <span class="input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M8.5 15.5 15.5 8.5M7 10H5.75A3.75 3.75 0 0 0 2 13.75v2.5A3.75 3.75 0 0 0 5.75 20h2.5A3.75 3.75 0 0 0 12 16.25V15m0-6V7.75A3.75 3.75 0 0 1 15.75 4h2.5A3.75 3.75 0 0 1 22 7.75v2.5A3.75 3.75 0 0 1 18.25 14H17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </span>
          <input
            id="url"
            ref="urlInput"
            v-model="urlValue"
            class="text-input"
            placeholder="weixin://open 或 example.com"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :aria-invalid="Boolean(urlError)"
            :aria-describedby="urlError ? 'url-error' : 'url-help'"
            @keydown.enter="emitCopy"
            @input="emitError('')"
          />
          <button
            v-if="urlValue"
            type="button"
            class="input-clear"
            aria-label="清空输入"
            @click="clearInput"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <button
          type="button"
          class="copy-btn"
          :class="{ copied: copyText === 'Copied!', failed: copyText === 'Failed' }"
          :disabled="!urlValue.trim()"
          @click="emitCopy"
        >
          <svg v-if="copyText !== 'Copied!'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/>
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.7"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ buttonLabel }}</span>
        </button>
      </div>

      <p v-if="urlError" id="url-error" class="field-message error-message" role="alert">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 7.5v5M12 16.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        {{ urlError }}
      </p>
      <p v-else id="url-help" class="field-message">
        生成的链接不会上传目标地址；按 <kbd>Ctrl / ⌘ + Enter</kbd> 可快速复制。
      </p>
    </div>

    <div v-if="urlValue && !urlError" class="preview-card">
      <div class="preview-head">
        <div>
          <span class="preview-label">生成结果</span>
          <span class="preview-state">
            <span aria-hidden="true"></span>
            可以分享
          </span>
        </div>
        <button type="button" class="preview-open" @click="$emit('goto', toUrl)">
          打开测试
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 16 16 8M9 8h7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <button type="button" class="preview-url" :title="safeDecode(toUrl)" @click="$emit('goto', toUrl)">
        {{ safeDecode(toUrl) }}
      </button>
    </div>

    <div v-if="recentUrls.length" class="recent-section">
      <div class="recent-head">
        <div>
          <span class="section-kicker">Recently generated</span>
          <h3>最近复制</h3>
        </div>
        <span>{{ recentUrls.length }} 条</span>
      </div>

      <div class="recent-list">
        <button
          v-for="(item, index) in recentUrls"
          :key="item"
          type="button"
          class="recent-item"
          :title="safeDecode(item)"
          @click="$emit('goto', item)"
        >
          <span class="recent-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="recent-url">{{ safeDecode(item) }}</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 16 16 8M9 8h7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

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
  set: (value) => emit('update:url', value),
})

const toUrl = computed(() => encodeURI(props.origin + '/#' + props.url))
const recentUrls = computed(() => props.urlList.slice(0, 6))

const buttonLabel = computed(() => {
  if (props.copyText === 'Copied!') return '已复制'
  if (props.copyText === 'Failed') return '复制失败'
  return '复制链接'
})

function emitError(message) {
  emit('update:urlError', message)
}

function emitCopy() {
  emit('copy')
}

function clearInput() {
  emit('update:url', '')
  emitError('')
  nextTick(() => urlInput.value?.focus())
}

function safeDecode(value) {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

onMounted(() => {
  urlInput.value?.focus()
})
</script>

<style scoped>
.url-input-panel {
  display: grid;
  gap: 26px;
}

.section-heading,
.recent-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-kicker,
.preview-label {
  display: block;
  margin-bottom: 5px;
  color: var(--card-text-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.section-heading h2,
.recent-head h3 {
  margin: 0;
  color: var(--card-text);
  letter-spacing: -0.025em;
}

.section-heading h2 {
  font-size: 21px;
}

.recent-head h3 {
  font-size: 16px;
}

.privacy-badge {
  min-height: 30px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--card-text-muted);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.privacy-badge svg {
  width: 14px;
  height: 14px;
  color: var(--success);
}

.field-group {
  display: grid;
  gap: 9px;
}

.field-group > label {
  color: var(--card-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.input-wrap {
  min-width: 0;
  height: 52px;
  display: flex;
  align-items: center;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: var(--surface-elevated);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.input-wrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.input-wrap.error {
  border-color: var(--danger);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--danger) 10%, transparent);
}

.input-icon {
  width: 44px;
  display: grid;
  place-items: center;
  color: var(--card-text-muted);
  flex: 0 0 auto;
}

.input-wrap:focus-within .input-icon,
.input-wrap.filled .input-icon {
  color: var(--accent);
}

.input-icon svg {
  width: 19px;
  height: 19px;
}

.text-input {
  min-width: 0;
  flex: 1;
  height: 100%;
  padding: 0 4px 0 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--card-text);
  font: inherit;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.text-input::placeholder {
  color: var(--card-text-muted);
  font-family: 'Inter', sans-serif;
}

.input-clear {
  width: 38px;
  height: 38px;
  margin-right: 6px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--card-text-muted);
  cursor: pointer;
}

.input-clear:hover {
  background: var(--surface-soft);
  color: var(--card-text);
}

.input-clear svg {
  width: 16px;
  height: 16px;
}

.copy-btn {
  min-width: 126px;
  height: 52px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 14px;
  background: var(--accent);
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 28%, transparent);
  transition: transform 0.16s ease, background 0.16s ease, opacity 0.16s ease, box-shadow 0.16s ease;
}

.copy-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: var(--accent-hover);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--accent) 32%, transparent);
}

.copy-btn:active:not(:disabled) {
  transform: translateY(0);
}

.copy-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  box-shadow: none;
}

.copy-btn.copied {
  background: var(--success);
}

.copy-btn.failed {
  background: var(--danger);
}

.copy-btn svg {
  width: 18px;
  height: 18px;
}

.field-message {
  min-height: 18px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--card-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.field-message kbd {
  padding: 1px 4px;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  color: var(--card-text-soft);
  font: inherit;
  font-weight: 650;
}

.error-message {
  color: var(--danger);
}

.error-message svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.preview-card {
  padding: 15px;
  border: 1px solid var(--hairline);
  border-radius: 16px;
  background:
    linear-gradient(135deg, var(--accent-soft), transparent 52%),
    var(--surface-soft);
}

.preview-head {
  margin-bottom: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.preview-head > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

.preview-label {
  margin: 0;
}

.preview-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--success);
  font-size: 10px;
  font-weight: 700;
}

.preview-state > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.preview-open {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.preview-open:hover {
  text-decoration: underline;
}

.preview-open svg {
  width: 14px;
  height: 14px;
}

.preview-url {
  width: 100%;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--card-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.recent-section {
  padding-top: 4px;
  display: grid;
  gap: 12px;
}

.recent-head {
  align-items: flex-end;
}

.recent-head > span {
  color: var(--card-text-muted);
  font-size: 11px;
}

.recent-list {
  display: grid;
  gap: 6px;
}

.recent-item {
  width: 100%;
  min-height: 45px;
  padding: 0 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--card-text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.recent-item:hover {
  border-color: var(--hairline);
  background: var(--surface-hover);
  transform: translateX(2px);
}

.recent-index {
  color: var(--card-text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
}

.recent-url {
  min-width: 0;
  overflow: hidden;
  color: var(--card-text-soft);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-item > svg {
  width: 15px;
  height: 15px;
  color: var(--card-text-muted);
}

.recent-item:hover > svg {
  color: var(--accent);
}

@media (max-width: 640px) {
  .url-input-panel {
    gap: 22px;
  }

  .input-row {
    grid-template-columns: 1fr;
  }

  .copy-btn {
    width: 100%;
  }

  .field-message {
    align-items: flex-start;
  }

  .field-message kbd {
    display: none;
  }

  .privacy-badge {
    display: none;
  }
}
</style>
