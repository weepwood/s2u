<template>
  <section class="redirect-panel" aria-labelledby="redirect-title" aria-live="polite">
    <div class="countdown-wrap" :style="{ '--progress': `${countDown / 5}` }" aria-hidden="true">
      <svg viewBox="0 0 54 54">
        <circle class="track" cx="27" cy="27" r="23" />
        <circle class="progress" cx="27" cy="27" r="23" />
      </svg>
      <strong>{{ countDown }}</strong>
    </div>

    <div class="redirect-copy">
      <span class="section-kicker">Redirect in progress</span>
      <h2 id="redirect-title">目标应用正在打开</h2>
      <p>页面会在倒计时结束后尝试自动关闭。浏览器若阻止跳转，可重新打开首页继续创建链接。</p>
    </div>

    <div class="redirect-actions">
      <button type="button" class="primary-action" @click="$emit('gotoOrigin')">
        返回创建页
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 16 16 8M9 8h7v7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button type="button" class="secondary-action" @click="$emit('cancel')">留在当前页</button>
    </div>

    <button type="button" class="origin-link" @click="$emit('gotoOrigin')">
      {{ origin }}
    </button>
  </section>
</template>

<script setup>
defineProps({
  countDown: { type: Number, required: true },
  origin: { type: String, required: true },
})

defineEmits(['gotoOrigin', 'cancel'])
</script>

<style scoped>
.redirect-panel {
  padding: 12px 8px 4px;
  display: grid;
  justify-items: center;
  text-align: center;
}

.countdown-wrap {
  width: 82px;
  height: 82px;
  margin-bottom: 20px;
  position: relative;
  display: grid;
  place-items: center;
}

.countdown-wrap svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.countdown-wrap circle {
  fill: none;
  stroke-width: 4;
}

.track {
  stroke: var(--hairline);
}

.progress {
  stroke: var(--accent);
  stroke-linecap: round;
  stroke-dasharray: 144.5;
  stroke-dashoffset: calc(144.5 * (1 - var(--progress)));
  transition: stroke-dashoffset 0.8s linear;
}

.countdown-wrap strong {
  color: var(--card-text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 600;
}

.section-kicker {
  display: block;
  margin-bottom: 6px;
  color: var(--card-text-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.redirect-copy h2 {
  margin: 0;
  color: var(--card-text);
  font-size: 23px;
  letter-spacing: -0.03em;
}

.redirect-copy p {
  max-width: 450px;
  margin: 10px auto 0;
  color: var(--card-text-muted);
  font-size: 12px;
  line-height: 1.7;
}

.redirect-actions {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.primary-action,
.secondary-action {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 11px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  background: var(--accent);
  color: #ffffff;
}

.primary-action:hover {
  background: var(--accent-hover);
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

.origin-link {
  max-width: 100%;
  margin-top: 17px;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--card-text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.origin-link:hover {
  color: var(--accent);
}

@media (max-width: 480px) {
  .redirect-actions {
    width: 100%;
    display: grid;
  }
}
</style>
