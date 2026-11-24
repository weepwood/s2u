<template>
  <div id="history-panel" class="history-view" role="tabpanel" aria-labelledby="history-tab">
    <HistoryPanel
      :history="history"
      :search-query="searchQuery"
      :filtered-history="filteredHistory"
      @update:search-query="$emit('update:searchQuery', $event)"
      @select="$emit('select', $event)"
      @delete="$emit('delete', $event)"
    />
    <HistoryFooter
      :show-settings="showSettings"
      @clear="$emit('clear')"
      @export="$emit('export')"
      @toggle-settings="$emit('toggleSettings')"
      @import-file="$emit('importFile', $event)"
    />
  </div>
</template>

<script setup>
import HistoryPanel from './HistoryPanel.vue'
import HistoryFooter from './HistoryFooter.vue'

defineProps([
  'history', 'searchQuery', 'filteredHistory', 'showSettings',
])
defineEmits([
  'update:searchQuery', 'select', 'delete', 'clear', 'export',
  'toggleSettings', 'importFile',
])
</script>
