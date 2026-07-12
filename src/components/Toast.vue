<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="toast"
      :class="type"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span class="toast-icon" aria-hidden="true">
        <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none">
          <path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 7.5v5M12 16.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 10.5v6M12 7.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </span>
      {{ message }}
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' },
  duration: { type: Number, default: 2500 },
})

const visible = ref(false)
let timer = null

watch(
  () => props.message,
  (newValue) => {
    if (timer) clearTimeout(timer)

    if (newValue) {
      visible.value = true
      timer = setTimeout(() => {
        visible.value = false
      }, props.duration)
    } else {
      visible.value = false
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 1000;
  min-height: 44px;
  padding: 0 15px 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 13px;
  background: rgba(18, 24, 36, 0.94);
  color: #f4f7fb;
  font-size: 12px;
  font-weight: 650;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.24);
  pointer-events: none;
  transform: translateX(-50%);
  backdrop-filter: blur(18px);
}

.toast-icon {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

.toast-icon svg {
  width: 15px;
  height: 15px;
}

.toast.success .toast-icon {
  background: rgba(69, 199, 132, 0.18);
  color: #78d9a8;
}

.toast.error .toast-icon {
  background: rgba(255, 116, 125, 0.18);
  color: #ff8d95;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px) scale(0.98);
}
</style>
