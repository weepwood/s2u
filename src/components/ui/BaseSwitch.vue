<template>
  <label class="ui-switch">
    <span><slot /></span>
    <span class="ui-switch-control">
      <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="change" />
      <span class="ui-switch-track" aria-hidden="true"></span>
    </span>
  </label>
</template>
<script setup>
const props = defineProps({ modelValue: Boolean, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
function change(event) {
  const input = event.target
  const requested = input.checked
  // 受控开关：如果业务确认被取消，DOM 立即回到已提交的值。
  input.checked = props.modelValue
  emit('update:modelValue', requested)
}
</script>
