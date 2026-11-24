<template>
  <BaseDialog ref="dialog" class="editor-dialog template-dialog" aria-labelledby="template-title" @close="$emit('close')">
    <div class="template-shell">
      <header class="template-header">
        <h3 id="template-title">链接模板</h3>
        <button type="button" class="dialog-close" aria-label="关闭链接模板" @click="dialog?.close()">×</button>
      </header>
      <SegmentedTabs class="template-tabs" label="应用模板" :items="templates" :model-value="selected" @update:model-value="choose"/>
      <form class="template-form" @submit.prevent="apply">
        <label v-for="field in current.fields" :key="selected+'-'+field.id" class="template-field">
          <span>{{field.label}}</span>
          <BaseInput v-model="values[field.id]" :placeholder="field.placeholder" :required="field.required" autocomplete="off" spellcheck="false" maxlength="4096"/>
        </label>
        <div v-if="result" class="template-preview">
          <span>目标地址</span>
          <code>{{result}}</code>
        </div>
        <p v-else class="template-hint">{{error}}</p>
        <div class="template-actions">
          <BaseButton @click="dialog?.close()">取消</BaseButton>
          <BaseButton type="submit" variant="primary" :disabled="!result">填入目标地址</BaseButton>
        </div>
        <p class="template-hint">仅生成链接，不会打开应用或保存历史。文件路径可能包含私人信息，分享前请核对。</p>
      </form>
    </div>
  </BaseDialog>
</template>
<script setup>
import { ref, computed } from 'vue'
import BaseDialog from './ui/BaseDialog.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseInput from './ui/BaseInput.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'
import { LINK_TEMPLATES, buildTemplateTarget } from '../domain/linkTemplates.js'
const emit=defineEmits(['close','apply'])
const dialog=ref(null)
const templates=LINK_TEMPLATES.map(({id,label})=>({id,label}))
const selected=ref('obsidian'),values=ref({})
const current=computed(()=>LINK_TEMPLATES.find(item=>item.id===selected.value))
const preview=computed(()=>{
  try{return {target:buildTemplateTarget(selected.value,values.value),error:''}}
  catch(error){return {target:'',error:error.message}}
})
const result=computed(()=>preview.value.target),error=computed(()=>preview.value.error)
function choose(id){if(id!==selected.value){selected.value=id;values.value={}}}
function apply(){if(result.value)emit('apply',result.value)}
</script>
<style scoped>
.template-dialog { width:min(500px,calc(100vw - 24px)); max-width:none; height:min(490px,calc(100vh - 32px)); height:min(490px,calc(100dvh - 32px)); max-height:none; padding:0; box-sizing:border-box; overflow:hidden; }
.template-shell { height:100%; box-sizing:border-box; padding:18px; display:grid; grid-template-rows:auto auto minmax(0,1fr); gap:12px; }
.template-header { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.template-header h3 { margin:0;font-size:18px; }
.template-tabs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); position:relative; isolation:isolate; gap:4px; padding:var(--tab-padding); border:1px solid var(--hairline); border-radius:var(--radius-navigation); background:var(--glass-navigation); }
.template-form { display:grid; align-content:start; gap:10px; min-height:0; overflow:auto; padding:3px; }
.template-field { display:grid; gap:6px; min-width:0; font-size:12px; }
.template-preview { display:grid; gap:6px; padding:10px; border:1px solid var(--hairline); border-radius:var(--radius-control); background:var(--surface-soft); min-width:0; font-size:12px; }
.template-preview code { overflow-wrap:anywhere; color:var(--card-text); }
.template-hint { margin:0; font-size:12px; color:var(--card-text-muted); line-height:1.5; }
.template-actions { display:flex; justify-content:flex-end; gap:8px; }
@media(max-width:380px){.template-shell{padding:12px}}
</style>
