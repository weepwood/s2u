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
    <SettingsPanel
      v-if="showSettings"
      :cloud-token="cloudToken"
      :cloud-gist-id="cloudGistId"
      :sync-status="syncStatus"
      :sync-error="syncError"
      :last-sync-time="lastSyncTime"
      @update:cloud-token="$emit('update:cloudToken', $event)"
      @connect="$emit('connect')"
      @disconnect="$emit('disconnect')"
      @sync="$emit('sync')"
      @export-backup="$emit('exportBackup')"
    />
  </div>
</template>

<script setup>
import HistoryPanel from './HistoryPanel.vue'
import HistoryFooter from './HistoryFooter.vue'
import SettingsPanel from './SettingsPanel.vue'

defineProps([
  'history', 'searchQuery', 'filteredHistory', 'showSettings',
  'cloudToken', 'cloudGistId', 'syncStatus', 'syncError', 'lastSyncTime',
])
defineEmits([
  'update:searchQuery', 'select', 'delete', 'clear', 'export',
  'toggleSettings', 'importFile', 'update:cloudToken',
  'connect', 'disconnect', 'sync', 'exportBackup',
])
</script>
