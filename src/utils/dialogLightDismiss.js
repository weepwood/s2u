// <dialog closedby="any"> 目前只在部分浏览器可用（Safari 尚未支持）。
// 本模块为缺少该能力的浏览器补齐点击遮罩关闭（light dismiss），支持动态挂载的弹窗。
// 必须按指针坐标判断是否落在对话框内容框之外：点击 dialog 自身的 padding 或
// 子元素之间的空隙时，event.target 同样是 dialog，用 target 判断会误关弹窗。
const SUPPORTS_CLOSEDBY =
  typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype

export function installDialogLightDismiss() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}
  if (SUPPORTS_CLOSEDBY) return () => {}

  let pressedDialog = null

  const isOutside = (event, dialog) => {
    const rect = dialog.getBoundingClientRect()
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
  }

  const onPointerDown = (event) => {
    const target = event.target instanceof Element ? event.target : null
    const dialog = target?.closest('dialog[closedby="any"]')
    pressedDialog =
      dialog instanceof HTMLDialogElement && dialog.open && isOutside(event, dialog)
        ? dialog
        : null
  }

  const onPointerUp = (event) => {
    const dialog = pressedDialog
    pressedDialog = null
    // 按下与松开都要在内容框之外，避免选中文字后拖到遮罩松手时误关。
    if (dialog?.open && isOutside(event, dialog)) dialog.close()
  }

  const onPointerCancel = () => {
    pressedDialog = null
  }

  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('pointerup', onPointerUp, true)
  document.addEventListener('pointercancel', onPointerCancel, true)

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('pointerup', onPointerUp, true)
    document.removeEventListener('pointercancel', onPointerCancel, true)
    pressedDialog = null
  }
}
