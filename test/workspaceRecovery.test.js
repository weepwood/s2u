import test from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'
import { useWorkspaceRecovery } from '../src/composables/workspace/useWorkspaceRecovery.js'

function fixture() {
  const map=new Map(), history={format:'s2u-history',version:2,records:[],tombstones:[]}
  const common={format:'s2u-common-links',version:1,items:[]}
  const calls=[], active={value:true}, busy={value:false}, opened={value:true}
  const context={id:'test'}
  const cloud={syncStatus:ref('connected'),syncError:ref(''),getLatestRecovery:()=>history,
    context:()=>context,isCurrent:()=>active.value,markPending:()=>calls.push('pending'),
    setPreferences:value=>calls.push(['preferences',value]),readRevision:async()=>history}
  const recovery=useWorkspaceRecovery({
    workspace:{storage:{getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)}},cloud,
    historyStore:{storageError:ref(''),load:()=>{},inspectImport:()=>({valid:0,invalid:0,tombstones:0}),snapshot:()=>history,merge:()=>calls.push('merge')},
    commonStore:{storageError:ref(''),load:()=>{},validateSync:x=>x,syncSnapshot:()=>common,applySync:()=>{}},
    darkMode:ref(false),isBusy:()=>busy.value,isPreviewOpen:()=>opened.value,
    applyRemote:fn=>fn(),showToast:()=>{},
  })
  return {recovery,map,calls,active,busy,opened,cloud,history,common}
}
test('关闭恢复面板后旧文件读取结果不再更新预览',async()=>{
  const f=fixture()
  let resolve
  const promise=f.recovery.previewWorkspace({size:20,name:'test.json',text:()=>new Promise(done=>{resolve=done})})
  f.opened.value=false;f.recovery.clearWorkspacePreview()
  resolve('invalid')
  await promise
  assert.equal(f.recovery.workspacePreview.value,null)
})
test('同步期间禁止恢复远端备份',async()=>{
  const f=fixture();f.busy.value=true
  await f.recovery.restoreGistRecovery({index:0})
  assert.equal(f.calls.length,0)
  assert.equal(f.map.size,0)
})
test('历史备份恢复先保存快照并暂停自动同步',async()=>{
  const f=fixture(),old=globalThis.confirm
  globalThis.confirm=()=>true
  try{
    await f.recovery.restoreGistRecovery({index:0})
    assert.deepEqual(f.calls,[['preferences',{auto:false}],'merge','pending'])
    assert.deepEqual(JSON.parse(f.map.get('s2u_history_before_recovery')),f.history)
  }finally{globalThis.confirm=old}
})
test('冲突快照只保存业务数据',()=>{
  const f=fixture();f.recovery.saveBeforeConflict()
  const snapshot=JSON.parse(f.map.get('s2u_workspace_before_conflict_v1'))
  assert.deepEqual(snapshot.history,f.history)
  assert.deepEqual(snapshot.commonLinks,f.common)
  assert.equal(snapshot.settings.darkMode,false)
  assert.equal('token' in snapshot,false)
})
