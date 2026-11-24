<template>
  <input v-model="value" class="ui-input" :type="type" :disabled="disabled" />
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ modelValue: { type: String, default: '' }, type: { type: String, default: 'text' }, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
const value = computed({ get: () => props.modelValue, set: next => emit('update:modelValue', next) })
</script>
