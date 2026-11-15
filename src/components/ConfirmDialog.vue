<template>
  <dialog
    ref="dialog"
    class="confirm-dialog"
    :aria-labelledby="request ? 'confirm-dialog-title' : undefined"
    :aria-describedby="request ? 'confirm-dialog-message' : undefined"
    closedby="closerequest"
    @close="onClose"
  >
    <form v-if="request" method="dialog" class="confirm-body">
      <h3 id="confirm-dialog-title">{{ request.title }}</h3>
      <p id="confirm-dialog-message">{{ request.message }}</p>
      <div class="confirm-actions">
        <button ref="cancelButton" type="submit" value="cancel">{{ request.cancelText }}</button>
        <button type="submit" value="confirm" class="primary" :class="{ danger: request.danger }">
          {{ request.confirmText }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  request: { type: Object, default: null },
})
const emit = defineEmits(['resolve'])

const dialog = ref(null)
const cancelButton = ref(null)

watch(
  () => props.request,
  async (request) => {
    const el = dialog.value
    if (!el) return
    if (request) {
      // 连续确认请求复用同一个 dialog，必须清掉上一次的选择结果。
      el.returnValue = ''
      if (el.open) return
      await nextTick() // 等待 form 渲染，再进入顶层。
      if (!props.request || !dialog.value || dialog.value.open) return
      dialog.value.showModal()
      cancelButton.value?.focus() // 默认落在取消上，避免误触确认。
    } else if (!request && el.open) {
      el.close()
    }
  },
  { flush: 'post' },
)

function onClose() {
  // 只有用户主动关闭（按钮 / Esc / 平台返回手势）时才结算；
  // 外部 settle 已把 request 置空，这里的重复 close 会被忽略。
  if (props.request) emit('resolve', dialog.value?.returnValue === 'confirm')
}
</script>

<style scoped>
.confirm-dialog {
  width: min(420px, calc(100vw - 32px));
  max-width: none;
  max-height: min(90dvh, 560px);
  margin: auto;
  padding: 0;
  overflow-y: auto;
  box-sizing: border-box;
  border: 1px solid var(--hairline, #dce1e9);
  border-radius: 18px;
  background: var(--card-bg-solid, #fff);
  color: var(--card-text, #172033);
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.3);
}
.confirm-dialog::backdrop { background: rgba(12, 18, 32, 0.6); backdrop-filter: blur(5px); }
.confirm-body { display: grid; gap: 13px; padding: clamp(18px, 4vw, 24px); }
.confirm-body h3 { margin: 0; font-size: 18px; letter-spacing: -0.02em; }
.confirm-body p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--card-text-muted, #7c879b); overflow-wrap: anywhere; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 9px; flex-wrap: wrap; }
.confirm-actions button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--hairline, #dce1e9);
  border-radius: 10px;
  background: var(--surface-elevated, #fff);
  color: var(--card-text, #172033);
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}
.confirm-actions button.primary { background: var(--accent, #4f6ef7); border-color: var(--accent, #4f6ef7); color: #fff; }
.confirm-actions button.primary.danger { background: var(--danger, #d84b55); border-color: var(--danger, #d84b55); }
.confirm-actions button:focus-visible { outline: 2px solid var(--accent, #4f6ef7); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .confirm-dialog::backdrop { backdrop-filter: none; } }
</style>
