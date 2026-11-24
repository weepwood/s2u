<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="darkMode ? '切换到浅色模式' : '切换到深色模式'"
    :title="darkMode ? '切换到浅色模式' : '切换到深色模式'"
    @click="$emit('toggle')"
  >
    <span class="icon-wrap" :class="{ dark: darkMode }" aria-hidden="true">
      <svg v-if="darkMode" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none">
        <path d="M20.2 15.2A8.2 8.2 0 0 1 8.8 3.8 8.4 8.4 0 1 0 20.2 15.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
      </svg>
    </span>
  </button>
</template>

<script setup>
defineProps({
  darkMode: {
    type: Boolean,
    required: true,
  },
})

defineEmits(['toggle'])
</script>

<style scoped>
.icon-wrap { display:grid; place-items:center; transition:color .18s ease; }
.icon-wrap.dark { color:var(--accent); }
</style>
