<template>
  <button ref="trigger" v-bind="$attrs" type="button" class="ui-select" :class="{'ui-select--compact':compact}" role="combobox"
    aria-haspopup="listbox" :aria-expanded="open" :aria-controls="open ? listId : undefined" :aria-activedescendant="open ? listId+'-'+active : undefined"
    :disabled="disabled" @click="toggle" @keydown="keys" @blur="blur">
    <span>{{ options.find(o=>o.value===modelValue)?.label || '请选择' }}</span>
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <Teleport v-if="open && host" :to="host">
    <div :id="listId" ref="menu" class="ui-select-menu" role="listbox" aria-label="可选项" :style="position" @mousedown.prevent>
      <div v-for="(option,i) in options" :id="listId+'-'+i" :key="option.value" role="option" :data-value="option.value"
        :aria-selected="option.value===modelValue" :class="{'is-active':i===active}" @pointermove="active=i" @click="choose(i)">
        <span>{{ option.label }}</span><span v-if="option.value===modelValue" aria-hidden="true">✓</span>
      </div>
    </div>
  </Teleport>
</template>
<script setup>
import { ref, useId, nextTick, watch, onBeforeUnmount } from 'vue'
defineOptions({inheritAttrs:false})
const props=defineProps({modelValue:{type:[String,Number],default:''},options:{type:Array,required:true},disabled:Boolean,compact:Boolean})
const emit=defineEmits(['update:modelValue','change'])
const trigger=ref(null),menu=ref(null),host=ref(null),open=ref(false),active=ref(0),position=ref({})
const listId=useId()+'-options'
function place(){
  const r=trigger.value?.getBoundingClientRect()
  if(!r)return
  const w=document.documentElement.clientWidth,h=window.innerHeight
  if(r.bottom<=0||r.top>=h)return false
  const below=h-r.bottom-12,above=r.top-12,up=below<180&&above>below
  const width=Math.min(w-16,Math.max(152,r.width))
  position.value={width:width+'px',left:Math.max(8,Math.min(r.left,w-width-8))+'px',maxHeight:Math.max(40,Math.min(240,up?above:below))+'px',...(up?{bottom:(h-r.top+4)+'px'}:{top:(r.bottom+4)+'px'})}
  return true
}
function outside(e){if(!trigger.value?.contains(e.target)&&!menu.value?.contains(e.target))close()}
function scrolled(e){if(!menu.value?.contains(e.target)&&!place())close()}
function blur(e){if(!menu.value?.contains(e.relatedTarget))close()}
function close(){
  if(!open.value)return
  open.value=false
  document.removeEventListener('pointerdown',outside,true)
  window.removeEventListener('scroll',scrolled,true)
  window.removeEventListener('resize',close)
}
function show(){
  if(props.disabled||!props.options.length)return
  trigger.value.focus({preventScroll:true})
  host.value=trigger.value.closest('dialog[open]')||trigger.value.closest('.app-shell')
  if(!host.value)return
  active.value=Math.max(0,props.options.findIndex(o=>o.value===props.modelValue))
  if(!place())return
  open.value=true
  document.addEventListener('pointerdown',outside,true)
  window.addEventListener('scroll',scrolled,true)
  window.addEventListener('resize',close)
  nextTick(reveal)
}
function reveal(){
  const el=menu.value,row=el?.children[active.value]
  if(!row)return
  if(row.offsetTop<el.scrollTop)el.scrollTop=row.offsetTop
  else if(row.offsetTop+row.offsetHeight>el.scrollTop+el.clientHeight)el.scrollTop=row.offsetTop+row.offsetHeight-el.clientHeight
}
function toggle(){if(open.value)close();else show()}
function choose(i){
  const option=props.options[i]
  if(!option)return
  emit('update:modelValue',option.value)
  emit('change',option.value)
  close()
  trigger.value?.focus({preventScroll:true})
}
function keys(e){
  if(e.key==='Tab'){close();return}
  if(e.key==='Escape'&&open.value){e.preventDefault();e.stopPropagation();close();return}
  if(!['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){
    if(open.value&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      const i=props.options.findIndex(o=>String(o.label).toLowerCase().startsWith(e.key.toLowerCase()))
      if(i>=0){active.value=i;reveal();e.preventDefault()}
    }
    return
  }
  e.preventDefault();e.stopPropagation()
  if(!open.value){show();return}
  if(e.key==='Enter'||e.key===' '){choose(active.value);return}
  active.value=e.key==='Home'?0:e.key==='End'?props.options.length-1:Math.max(0,Math.min(props.options.length-1,active.value+(e.key==='ArrowDown'?1:-1)))
  reveal()
}
watch(()=>props.disabled,v=>{if(v)close()})
watch(()=>props.options.length,()=>{if(!props.options.length)close();else active.value=Math.min(active.value,props.options.length-1)})
onBeforeUnmount(close)
</script>
