<template>
  <dialog ref="dialog" class="shortcut-dialog" aria-labelledby="shortcut-title" @close="emit('close')" @click="backdrop">
    <div class="shortcut-body">
      <header class="shortcut-heading">
        <div><h2 id="shortcut-title">键盘快捷键</h2><p>无需鼠标也能完成主要操作</p></div>
        <button type="button" aria-label="关闭快捷键帮助" @click="dialog?.close()">×</button>
      </header>
      <dl class="shortcut-list">
        <div><dt>复制当前分享链接</dt><dd><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd></dd></div>
        <div><dt>打开快捷启动命令面板</dt><dd><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd></dd></div>
        <div><dt>切换历史记录</dt><dd><kbd>H</kbd></dd></div>
        <div><dt>清空创建页输入</dt><dd><kbd>Esc</kbd></dd></div>
        <div><dt>页签导航</dt><dd><kbd>←</kbd> <kbd>→</kbd> <kbd>Home</kbd> <kbd>End</kbd></dd></div>
        <div><dt>关闭对话框</dt><dd><kbd>Esc</kbd></dd></div>
      </dl>
      <p class="shortcut-note">输入框和弹窗中的快捷键按各自场景处理，不会触发页面操作。</p>
    </div>
  </dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const emit = defineEmits(['close'])
const dialog = ref(null)
function backdrop(event) {
  if (event.target === dialog.value) dialog.value.close()
}
onMounted(() => dialog.value?.showModal())
</script>

<style scoped>
.shortcut-dialog { border: 1px solid var(--hairline, #dce1e9); padding: 0; border-radius: 18px; width: min(480px, calc(100vw - 32px)); max-height: 90dvh; background: var(--card-bg-solid, #fff); color: var(--card-text, #172033); box-shadow: 0 20px 72px #0003; }
.shortcut-dialog::backdrop { background: #0d152688; backdrop-filter: blur(4px); }
.shortcut-body { padding: 22px; min-width: 0; }
.shortcut-heading { display: flex; justify-content: space-between; gap: 12px; }
.shortcut-heading h2 { margin: 0; font-size: 20px; }
.shortcut-heading p, .shortcut-note { color: var(--card-text-muted, #7c879b); font-size: 12px; margin: 7px 0 0; line-height: 1.6; }
.shortcut-heading button { background: transparent; border: 0; font-size: 26px; color: inherit; cursor: pointer; }
.shortcut-list { display: grid; margin: 20px 0 0; gap: 0; }
.shortcut-list > div { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 13px 0; border-top: 1px solid var(--hairline, #dce1e9); }
.shortcut-list dt { font-size: 13px; }
.shortcut-list dd { margin: 0; }
.shortcut-list kbd { background: var(--surface-soft, #f5f7fa); border: 1px solid var(--hairline, #dce1e9); border-radius: 5px; padding: 2px 5px; font-size: 11px; white-space: nowrap; }
.shortcut-note { margin-top: 12px; }
@media (prefers-reduced-motion: reduce) { .shortcut-dialog::backdrop { backdrop-filter: none; } }
</style>
