<template>
  <button
    class="theme-toggle"
    @click="$emit('toggle')"
    :aria-label="darkMode ? '切换到浅色模式' : '切换到深色模式'"
  >
    {{ darkMode ? '☀' : '☾' }}
  </button>
</template>

<script setup>
defineProps({
  darkMode: {
    type: Boolean,
    required: true,
  },
})

defineEmits(['toggle'])
</script>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--hairline);
  background: var(--card-bg);
  color: var(--card-text);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
}

.theme-toggle:hover {
  border-color: var(--accent);
}
</style>
