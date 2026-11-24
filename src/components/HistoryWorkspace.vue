<template>
  <div id="history-panel" class="history-view" role="tabpanel" aria-labelledby="history-tab">
    <HistoryPanel
      :history="history"
      :search-query="searchQuery"
      :filtered-history="filteredHistory"
      :common-links="commonLinks"
      :save-bookmark="saveBookmark"
      @update:search-query="$emit('update:searchQuery', $event)"
      @select="$emit('select', $event)"
      @delete="$emit('delete', $event)"
      @export="$emit('export')"
      @import-file="$emit('importFile', $event)"
    />
    <HistoryFooter
      :show-settings="showSettings"
      @clear="$emit('clear')"
      @toggle-settings="$emit('toggleSettings')"
    />
  </div>
</template>

<script setup>
import HistoryPanel from './HistoryPanel.vue'
import HistoryFooter from './HistoryFooter.vue'

defineProps([
  'history', 'searchQuery', 'filteredHistory', 'showSettings', 'commonLinks', 'saveBookmark',
])
defineEmits([
  'update:searchQuery', 'select', 'delete', 'clear', 'export',
  'toggleSettings', 'importFile',
])
</script>
