<template>
  <section class="workspace-selector" aria-label="账号工作区">
    <div class="workspace-row">
      <strong>工作区</strong>
      <span class="workspace-current">{{ label }}</span>
    </div>
    <details>
      <summary>切换或新建工作区</summary>
      <div class="workspace-fields">
        <label for="workspace-select">已保存工作区</label>
        <BaseSelect id="workspace-select" v-model="selected" :disabled="busy" :options="profiles.map(profile=>({value:profile.id,label:profile.label}))" />
        <BaseButton :disabled="busy || !selected || selected === workspace" @click="$emit('switch',selected)">切换工作区</BaseButton>
        <label for="workspace-login">新账号工作区</label>
        <BaseInput id="workspace-login" v-model="login" placeholder="GitHub 用户名" autocomplete="off" :disabled="busy" />
        <BaseButton :disabled="busy || !login.trim()" @click="$emit('create',login)">新建并切换</BaseButton>
        <p>各工作区独立保存历史、收藏、主题和同步设置。原数据不会自动复制；可通过备份恢复主动迁移。切换仅影响当前标签页，不保存 Token。</p>
      </div>
    </details>
  </section>
</template>
<script setup>
import { computed, ref } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'
import BaseSelect from '../ui/BaseSelect.vue'
const props=defineProps({workspace:{type:String,required:true},profiles:{type:Array,required:true},busy:Boolean})
defineEmits(['switch','create'])
const selected=ref(props.workspace),login=ref('')
const label=computed(()=>props.workspace==='legacy'?'原工作区':props.workspace.startsWith('account:')?'@'+props.workspace.slice(8):'不可用')
</script>
<style scoped>
.workspace-selector { border:1px solid var(--hairline); border-radius:var(--radius-control); padding:12px; background:var(--surface-soft); display:grid; gap:8px; min-width:0; }
.workspace-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.workspace-current { color:var(--card-text-muted); overflow-wrap:anywhere; }
.workspace-selector summary { cursor:pointer; color:var(--accent); font-size:12px; }
.workspace-fields { display:grid; gap:8px; margin-top:10px; }
.workspace-fields p { margin:0; color:var(--card-text-muted); font-size:12px; line-height:1.6; }
</style>
