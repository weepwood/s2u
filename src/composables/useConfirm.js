import { shallowRef } from 'vue'

// 同一时刻只会有一个确认流；对话框组件与调用方共享这份状态。
const pending = shallowRef(null)

const DEFAULTS = {
  title: '请确认',
  confirmText: '确认',
  cancelText: '取消',
  danger: false,
}

export function useConfirm() {
  function ask(message, options = {}) {
    // 新的确认请求到来时，先结束上一个未决的 Promise，避免调用方永远挂起。
    if (pending.value) pending.value.resolve(false)
    return new Promise((resolve) => {
      pending.value = { ...DEFAULTS, ...options, message, resolve }
    })
  }

  function settle(result) {
    const current = pending.value
    pending.value = null
    current?.resolve(Boolean(result))
  }

  return { pending, ask, settle }
}
