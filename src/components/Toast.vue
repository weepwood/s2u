<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="type">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' }, // 'info' | 'success' | 'error'
  duration: { type: Number, default: 2500 },
})

const visible = ref(false)
let timer = null

watch(
  () => props.message,
  (newVal) => {
    if (timer) clearTimeout(timer)
    if (newVal) {
      visible.value = true
      timer = setTimeout(() => {
        visible.value = false
      }, props.duration)
    } else {
      visible.value = false
    }
  }
)
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 2px 12px rgba(20, 20, 19, 0.12);
}

.toast.info {
  background: #181715;
  color: #faf9f5;
}

.toast.success {
  background: #5db872;
  color: #ffffff;
}

.toast.error {
  background: #c64545;
  color: #ffffff;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
