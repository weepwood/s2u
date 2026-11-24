<template>
  <dialog ref="element" @close="closed" @pointerdown="rememberPointer" @click="backdrop">
    <slot />
  </dialog>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
const emit = defineEmits(['close','opened'])
const element = ref(null)
let trigger = null, pointerOutside = false, closing = false
function outside(event) {
  const node = element.value
  if (!node || event.target !== node) return false
  const rect = node.getBoundingClientRect()
  return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
}
function rememberPointer(event) { pointerOutside = outside(event) }
function backdrop(event) {
  if (pointerOutside && outside(event)) close()
  pointerOutside = false
}
function close() { if (element.value?.open) element.value.close() }
function restoreFocus() {
  const target = trigger
  nextTick(() => { if (target?.isConnected && !document.querySelector('dialog[open]')) target.focus({preventScroll:true}) })
}
function closed() { if (closing) return; closing = true; emit('close'); restoreFocus() }
onMounted(() => {
  trigger = document.activeElement
  element.value?.showModal()
  emit('opened')
})
onBeforeUnmount(() => { if (element.value?.open) { closing = true; close(); restoreFocus() } })
// 暴露真实 dialog，供命令面板等复杂内容定位内部焦点。
defineExpose({ close, element })
</script>
