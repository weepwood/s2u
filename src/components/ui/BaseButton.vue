<template>
  <button :type="type" class="ui-button" :class="'ui-button--' + variant" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <slot />
  </button>
</template>
<script setup>
defineProps({
  type: { type: String, default: 'button' },
  variant: { type: String, default: 'secondary' },
  disabled: Boolean,
  loading: Boolean,
})
</script>
