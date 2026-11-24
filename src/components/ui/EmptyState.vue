<template>
  <div class="ui-empty-state" :class="{'ui-empty-state--compact':compact}" role="status" aria-live="polite">
    <span v-if="!compact" class="ui-empty-icon" aria-hidden="true">
      <svg v-if="kind==='search'" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
      <svg v-else-if="kind==='bookmark'" viewBox="0 0 24 24" fill="none"><path d="M6 4h12v16l-6-4-6 4V4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
      <svg v-else viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M4 8h16M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </span>
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.actions" class="ui-empty-actions"><slot name="actions" /></div>
  </div>
</template>
<script setup>
defineProps({title:{type:String,required:true},description:{type:String,default:''},kind:{type:String,default:'history'},compact:Boolean})
</script>
<style scoped>
.ui-empty-state { min-width:0; box-sizing:border-box; display:grid; justify-items:center; align-content:center; gap:8px; text-align:center; padding:28px 16px; border-radius:14px; background:var(--surface-soft); overflow-wrap:anywhere; }
.ui-empty-icon { width:42px; height:42px; display:grid; place-items:center; border:1px solid var(--hairline); border-radius:var(--radius-control); background:var(--surface-elevated); color:var(--accent); }
.ui-empty-icon svg { width:22px; height:22px; }
.ui-empty-state strong { font-size:14px; line-height:1.5; font-weight:650; color:var(--card-text); }
.ui-empty-state p { margin:0; max-width:320px; color:var(--card-text-muted); font-size:12px; line-height:1.6; }
.ui-empty-actions { display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-top:4px; }
.ui-empty-state--compact { padding:24px 12px; background:transparent; }
.ui-empty-state--compact strong { color:var(--card-text-muted); font-weight:400; font-size:13px; }
</style>
