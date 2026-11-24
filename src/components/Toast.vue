<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="toast"
      :class="type"
      :role="type === 'error' ? 'alert' : 'status'"
      :aria-live="type === 'error' ? 'assertive' : 'polite'"
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
      <span class="toast-message">{{ message }}</span>
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
  { immediate: true },
)

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 1000;
  min-height: 44px;
  box-sizing: border-box;
  max-width: min(480px, calc(100vw - 24px));
  width: max-content;
  padding: 10px 13px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--hairline-strong);
  border-radius: 8px;
  background: var(--card-bg-solid);
  color: var(--card-text);
  font-size: 13px;
  font-weight: 550;
  box-shadow: 0 5px 18px rgba(0, 0, 0, .10);
  pointer-events: none;
  transform: translateX(-50%);
  line-height: 1.5;
}

.toast-icon {
  flex: none;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  color: var(--card-text-muted);
}

.toast-icon svg {
  width: 15px;
  height: 15px;
}

.toast.success .toast-icon {
  color: var(--success);
}

.toast.error .toast-icon {
  color: var(--danger);
}

.toast-message { min-width: 0; overflow-wrap: anywhere; }

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
</style>
