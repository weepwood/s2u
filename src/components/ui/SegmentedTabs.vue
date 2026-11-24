<template>
  <nav ref="nav" class="segmented-tabs ui-segmented" :aria-label="label" @keydown="navigate">
    <button v-for="item in items" :key="item.id" type="button" :aria-pressed="modelValue === item.id"
      :tabindex="modelValue === item.id ? 0 : -1" @click="$emit('update:modelValue', item.id)">{{ item.label }}</button>
  </nav>
</template>
<script setup>
import { ref, nextTick } from 'vue'
const props = defineProps({ items: { type: Array, required: true }, modelValue: { type: String, required: true }, label: { type: String, required: true } })
const emit = defineEmits(['update:modelValue'])
const nav = ref(null)
async function navigate(event) {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey || event.isComposing) return
  const size = props.items.length
  if (!size) return
  event.preventDefault()
  event.stopPropagation()
  const current = Math.max(0, props.items.findIndex(item => item.id === props.modelValue))
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? size - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + size) % size
  emit('update:modelValue', props.items[index].id)
  await nextTick()
  nav.value?.querySelectorAll('button')[index]?.focus()
}
</script>
