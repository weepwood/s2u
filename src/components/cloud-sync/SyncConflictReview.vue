<template>
  <section class="conflict-review" aria-label="同步冲突处理">
    <div class="conflict-heading"><strong>同步冲突</strong><BaseButton @click="$emit('export')">导出本机备份</BaseButton></div>
    <p>逐条选择保留无冲突修改；整份保留会替换该文件另一端的全部内容。</p>
    <fieldset v-for="item in conflicts" :key="item.id" :disabled="busy" class="conflict-group">
      <legend>{{ item.kind === 'common' ? '常用链接' : '深浅主题' }}</legend>
      <p>{{ item.message }}</p>
      <template v-if="item.kind === 'common'">
        <div v-for="(row,index) in item.rows" :key="row.id" class="conflict-row">
          <strong>{{ row.local?.name || row.remote?.name }}</strong>
          <div class="conflict-columns">
            <div v-for="side in ['local','remote']" :key="side" class="conflict-value">
              <span>{{ side === 'local' ? '本机' : '云端' }}</span>
              <template v-if="row[side]">
                <strong>{{ row[side].name }}</strong>
                <span class="conflict-target">{{ row[side].target }}</span>
                <span v-if="row[side].tags.length">{{ row[side].tags.join(' · ') }}</span>
                <span v-if="row.iconChanged">{{ row[side].hasIcon ? '含自定义图标' : '无自定义图标' }}</span>
              </template>
              <span v-else>已删除 / 不存在</span>
            </div>
          </div>
          <div v-if="row.manual && modes[item.id] === 'records'" class="conflict-choice">
            <label v-for="side in ['local','remote']" :key="side">
              <input type="radio" :name="'record-'+item.id+'-'+index" :value="side" :checked="recordChoice(item.id,row.id) === side" @change="selectRecord(item.id,row.id,side)"/>
              {{ side === 'local' ? '保留本机' : '保留云端' }}
            </label>
          </div>
        </div>
        <details v-if="item.orderChanged"><summary>查看收藏顺序差异</summary><p>本机：{{ item.localOrder.join(' → ') || '空' }}</p><p>云端：{{ item.remoteOrder.join(' → ') || '空' }}</p></details>
      </template>
      <p v-else>本机：{{ item.localTheme ? '深色' : '浅色' }} · 云端：{{ item.remoteTheme ? '深色' : '浅色' }}</p>
      <label :for="'conflict-mode-'+item.id">处理方式</label>
      <BaseSelect :id="'conflict-mode-'+item.id" v-model="modes[item.id]" :options="[{value:'',label:'请选择'},...(item.canChooseRecords?[{value:'records',label:'逐条选择冲突记录'}]:[]),{value:'local',label:'整份保留本机'},{value:'remote',label:'整份保留云端'}]" />
      <p v-if="modes[item.id] === 'records'">为每条冲突记录选择版本；无冲突修改自动保留。排序仍有歧义时会停止。</p>
    </fieldset>
    <BaseButton variant="primary" :disabled="busy || !complete" @click="$emit('resolve', decisions)">确认处理冲突</BaseButton>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseSelect from '../ui/BaseSelect.vue'
const props=defineProps({conflicts:{type:Array,required:true},busy:Boolean})
defineEmits(['resolve','export'])
const modes=ref({}), records=ref([])
watch(()=>props.conflicts.map(item=>item.id).join(','),()=>{modes.value={};records.value=[]},{immediate:true})
function recordChoice(file,id) { return records.value.find(item=>item.file===file&&item.id===id)?.side || '' }
function selectRecord(file,id,side) { records.value=records.value.filter(item=>item.file!==file||item.id!==id);records.value.push({file,id,side}) }
const complete=computed(()=>props.conflicts.length>0&&props.conflicts.every(item=>{
  const mode=modes.value[item.id]
  return ['local','remote'].includes(mode)||(mode==='records'&&item.canChooseRecords&&item.rows.filter(row=>row.manual).every(row=>!!recordChoice(item.id,row.id)))
}))
const decisions=computed(()=>props.conflicts.map(item=>({id:item.id,mode:modes.value[item.id],records:records.value.filter(row=>row.file===item.id).map(row=>[row.id,row.side])})))
</script>
<style scoped>
.conflict-review,.conflict-group,.conflict-row,.conflict-value { display:grid; gap:9px; min-width:0; }
.conflict-review { padding:12px; border:1px solid var(--hairline); border-radius:var(--radius-control); background:var(--surface-soft); overflow-wrap:anywhere; }
.conflict-heading,.conflict-choice { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; }
.conflict-review p,.conflict-value span { margin:0; color:var(--card-text-muted); font-size:12px; line-height:1.5; }
.conflict-group { margin:0; padding:10px; border:1px solid var(--hairline); border-radius:10px; }
.conflict-group legend { font-weight:650; padding:0 4px; }
.conflict-columns { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
.conflict-value { align-content:start; background:var(--surface-elevated); border:1px solid var(--hairline); border-radius:8px; padding:8px; }
.conflict-target { overflow-wrap:anywhere; }
.conflict-choice label { display:flex; gap:5px; align-items:center; font-size:12px; }
.conflict-choice input { accent-color:var(--accent); }
.conflict-review details { font-size:12px; }
@media(max-width:380px) { .conflict-columns { grid-template-columns:1fr; } }
</style>
