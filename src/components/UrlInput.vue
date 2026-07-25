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
            @keydown.enter="handleEnter"
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

    <div v-if="urlValue && !urlError && shareUrl" class="preview-card">
      <div class="preview-head">
        <div>
          <span class="preview-label">生成结果</span>
          <span class="preview-state">
            <span aria-hidden="true"></span>
            可以分享
          </span>
        </div>
        <button type="button" class="preview-open" @click="$emit('goto', shareUrl)">
          打开测试
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 16 16 8M9 8h7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <button type="button" class="preview-url" :title="safeDecode(shareUrl)" @click="$emit('goto', shareUrl)">
        {{ safeDecode(shareUrl) }}
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
  shareUrl: { type: String, default: '' },
  copyText: { type: String, default: 'Copy' },
  urlError: { type: String, default: '' },
})

const emit = defineEmits(['update:url', 'copy', 'goto', 'update:urlError'])
const urlInput = ref(null)

const urlValue = computed({
  get: () => props.url,
  set: (value) => emit('update:url', value),
})

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

function handleEnter(event) {
  if (event.isComposing) return
  emitCopy()
}

function clearInput() {
  emit('update:url', '')
  emitError('')
  nextTick(() => urlInput.value?.focus())
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

onMounted(() => {
  if (window.matchMedia('(pointer: fine)').matches) {
    urlInput.value?.focus()
  }
})
</script>

<style scoped src="../styles/url-input.css"></style>
