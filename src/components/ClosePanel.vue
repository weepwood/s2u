<template>
  <div class="section close-msg">
    <p class="close-text">
      正在跳转，页面将在 <strong class="countdown-num">{{ countDown }}</strong> 秒后自动关闭
    </p>
    <p class="close-sub">
      需要创建链接请访问
      <a class="text-link" @click="$emit('gotoOrigin')">{{ origin }}</a>
    </p>
    <button class="cancel-btn" @click="$emit('cancel')">留在当前页</button>
  </div>
</template>

<script setup>
defineProps({
  countDown: { type: Number, required: true },
  origin: { type: String, required: true },
})

defineEmits(['gotoOrigin', 'cancel'])
</script>

<style scoped>
.close-msg {
  text-align: center;
  padding: 24px 0 8px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.close-text {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.55;
  color: var(--card-text-soft);
  margin-bottom: 8px;
}

.countdown-num {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: var(--accent);
  font-size: 20px;
}

.close-sub {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: var(--card-text-muted);
  margin-bottom: 16px;
}

.text-link {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}

.text-link:hover { text-decoration: underline; }

.cancel-btn {
  margin-top: 4px;
  padding: 8px 20px;
  background: transparent;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--card-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  color: var(--card-text);
  border-color: var(--hairline-strong);
}
</style>
