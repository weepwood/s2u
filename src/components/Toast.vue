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
  bottom: max(24px, env(safe-area-inset-bottom));
  z-index: 1000;
  box-sizing: border-box;
  width: max-content;
  max-width: calc(100vw - 24px);
  min-height: 44px;
  padding: 9px 15px 9px 11px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--toast-border);
  border-radius: var(--radius-control);
  background: var(--toast-surface);
  color: var(--toast-text);
  font-size: 12px;
  font-weight: 650;
  box-shadow: var(--shadow-popover);
  pointer-events: none;
  transform: translateX(-50%);
  backdrop-filter: blur(18px);
}

.toast-icon {
  flex: 0 0 25px;
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--toast-icon-surface);
}

.toast-icon svg {
  width: 15px;
  height: 15px;
}

.toast.success .toast-icon {
  background: var(--toast-success-surface);
  color: var(--toast-success);
}

.toast.error .toast-icon {
  background: var(--toast-danger-surface);
  color: var(--toast-danger);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--motion-enter-duration) ease, transform var(--motion-enter-duration) var(--motion-standard);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px) scale(0.98);
}
.toast-message { min-width:0; overflow-wrap:anywhere; line-height:1.5; }
@media(prefers-reduced-motion:reduce) {
  .toast-enter-active,.toast-leave-active { transition:none; }
  .toast-enter-from,.toast-leave-to { transform:translateX(-50%); }
}
</style>
