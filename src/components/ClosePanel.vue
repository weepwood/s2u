<template>
  <section class="redirect-panel" aria-labelledby="redirect-title">
    <div class="app-icon" aria-hidden="true">
      <img v-if="app.icon" :src="app.icon" alt="" />
      <span v-else>{{ app.monogram }}</span>
    </div>
    <div class="redirect-copy">
      <h2 id="redirect-title">{{ heading }}</h2>
      <p role="status">{{ description }}</p>
    </div>
    <div class="target-preview">
      <span class="section-kicker">目标地址</span>
      <code>{{ policy.target }}</code>
    </div>
    <button type="button" class="primary-action" @click="$emit('open')">
      {{ policy.needsConfirmation && !attempted ? '确认并打开' : attempted ? '手动重新打开' : '打开目标' }}
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 16 16 8M9 8h7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="redirect-actions">
      <button type="button" class="secondary-action" @click="$emit('copy')">复制原始链接</button>
      <button type="button" class="secondary-action" @click="$emit('cancel')">返回创建页</button>
    </div>
    <p class="hint">应用是否成功打开由浏览器和操作系统决定。请确认已安装目标应用，并检查浏览器的协议提示。</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  policy: { type: Object, required: true },
  attempted: { type: Boolean, required: true },
})
defineEmits(['open', 'copy', 'cancel'])

const base = import.meta.env.BASE_URL
const apps = {
  'obsidian:': { name: 'Obsidian', icon: base + 'icons/common-obsidian.png' },
  'vscode:': { name: 'Visual Studio Code', monogram: 'VS' },
  'weixin:': { name: '微信', icon: base + 'icons/common-weixin.png' },
  'orpheus:': { name: '网易云音乐', icon: base + 'icons/common-orpheus.png' },
  'http:': { name: '网页', monogram: '↗' },
  'https:': { name: '网页', monogram: '↗' },
}
const app = computed(() => apps[props.policy.protocol] || {
  name: props.policy.protocol.slice(0, -1),
  monogram: props.policy.protocol.slice(0, 2).toUpperCase(),
})
const heading = computed(() => props.policy.needsConfirmation && !props.attempted
  ? '确认打开外部应用'
  : '打开 ' + app.value.name)
const description = computed(() => props.policy.needsConfirmation && !props.attempted
  ? '此链接使用未知应用协议。请确认来源与目标可信，再主动打开。'
  : props.attempted
    ? '已尝试打开目标。如果没有响应，请手动重新打开或复制原始链接。'
    : '请点击按钮打开目标。')
</script>

<style scoped>
.redirect-panel {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px 8px 12px;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 16px;
  min-width: 0;
}
.app-icon {
  width: 68px;
  height: 68px;
  border: 1px solid var(--hairline);
  border-radius: 18px;
  background: var(--surface-elevated);
  display: grid;
  place-items: center;
  color: var(--accent);
  font-size: 24px;
  font-weight: 700;
}
.app-icon img { width: 44px; height: 44px; object-fit: contain; }
.section-kicker {
  display: block;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.12em;
  color: var(--card-text-muted);
}
.redirect-copy h2 { margin: 5px 0 0; color: var(--card-text); font-size: 23px; letter-spacing: -0.03em; }
.redirect-copy p, .hint { margin: 8px 0 0; color: var(--card-text-muted); font-size: 12px; line-height: 1.7; }
.target-preview {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 12px 14px;
  background: var(--surface-elevated);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  text-align: left;
}
.target-preview code {
  display: block;
  margin-top: 5px;
  color: var(--card-text);
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
  max-height: 120px;
  overflow-y: auto;
  user-select: text;
}
.primary-action, .secondary-action {
  min-height: 42px;
  border-radius: 11px;
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.primary-action {
  display: inline-flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border: 0;
  color: #fff;
  background: var(--accent);
}
.primary-action:hover { background: var(--accent-hover); }
.primary-action svg { width: 16px; height: 16px; }
.redirect-actions { display: flex; width: 100%; gap: 8px; flex-wrap: wrap; }
.secondary-action { flex: 1; border: 1px solid var(--hairline); color: var(--card-text-soft); background: var(--surface-elevated); }
.secondary-action:hover { border-color: var(--hairline-strong); }
.hint { margin: 0; }
</style>
