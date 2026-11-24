<template>
  <select v-model="value" class="ui-select" :class="{'ui-select--compact':compact}" :disabled="disabled"><slot /></select>
</template>
<script setup>
import { computed } from 'vue'
const props=defineProps({modelValue:{type:String,default:''},disabled:Boolean,compact:Boolean})
const emit=defineEmits(['update:modelValue'])
const value=computed({get:()=>props.modelValue,set:next=>emit('update:modelValue',next)})
</script>
