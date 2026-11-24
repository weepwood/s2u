<template>
  <div class="control-field ui-search-field">
    <span class="control-field__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
    </span>
    <input ref="field" v-model="value" class="control-field__input" :type="inputType" :aria-label="label" :placeholder="placeholder" autocomplete="off" />
    <button v-if="modelValue" type="button" class="control-field__clear" :class="{ 'search-clear': inputType === 'text' }" :aria-label="clearLabel" @click="clear">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>
  </div>
</template>
<script setup>
import { ref, computed, nextTick } from 'vue'
const props=defineProps({modelValue:{type:String,default:''},inputType:{type:String,default:'text'},label:{type:String,required:true},placeholder:{type:String,default:''},clearLabel:{type:String,default:'清除搜索'}})
const emit=defineEmits(['update:modelValue'])
const field=ref(null)
const value=computed({get:()=>props.modelValue,set:next=>emit('update:modelValue',next)})
function clear(){emit('update:modelValue','');nextTick(()=>field.value?.focus({preventScroll:true}))}
</script>
