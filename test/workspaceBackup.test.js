import test from 'node:test'
import assert from 'node:assert/strict'
import { useHistory } from '../src/composables/useHistory.js'
import { useCommonLinks } from '../src/composables/useCommonLinks.js'
import { makeWorkspaceBackup, parseWorkspaceBackup, planWorkspaceRestore, runWorkspaceRestore, RECOVERY_KEY } from '../src/domain/sync/workspaceBackup.js'

const history = (records=[],tombstones=[]) => ({format:'s2u-history',version:2,records,tombstones})
const common = items => ({format:'s2u-common-links',version:1,items})
const item = (id,target='https://example.com/'+id) => ({id,name:id,target})
const record = scheme => ({scheme,count:1,recently:1000,updatedAt:1000})
const make = (items=[],records=[]) => makeWorkspaceBackup({history:history(records),commonLinks:common(items),darkMode:false})
const adapters = () => ({inspectHistory:useHistory().inspectImport,validateCommon:useCommonLinks().validateSync})
test('完整备份格式与旧 Gist 备份兼容，不恢复凭据或同步开关',()=>{
  const a=adapters()
  const input={...make([item('a')]),token:'secret',preferences:{auto:true}}
  const parsed=parseWorkspaceBackup(JSON.stringify(input),a)
  assert.equal(parsed.commonLinks.items.length,1)
  assert.doesNotMatch(JSON.stringify(parsed),/secret|preferences/)
  const legacy=parseWorkspaceBackup(JSON.stringify({savedAt:1,history:history(),files:{'s2u-common-links.json':null}}),a)
  assert.equal(legacy.commonLinks,null)
  assert.equal(legacy.settings,null)
})
test('恢复合并保留已有同地址收藏及图标，并追加新记录',()=>{
  const a=adapters(), current=make([{...item('a'),icon:'data:image/png;base64,AAAA'}])
  const incoming=parseWorkspaceBackup(JSON.stringify(make([item('remote',item('a').target),item('b')])),a)
  const plan=planWorkspaceRestore(current,incoming,a.validateCommon)
  assert.equal(plan.summary.skipped,1);assert.equal(plan.summary.added,1)
  assert.deepEqual(plan.commonLinks.items,[...current.commonLinks.items,item('b')])
})
test('拒绝危险历史链接、格式异常与收藏 ID 冲突',()=>{
  const a=adapters()
  assert.throws(()=>parseWorkspaceBackup(JSON.stringify(make([], [record('javascript:alert(1)')])),a),/协议/)
  assert.throws(()=>parseWorkspaceBackup(JSON.stringify({...make(),version:99}),a),/版本/)
  const incoming=parseWorkspaceBackup(JSON.stringify(make([item('a','https://other.example/')])),a)
  assert.throws(()=>planWorkspaceRestore(make([item('a')]),incoming,a.validateCommon),/ID 冲突/)
})
test('超出本机容量时在修改前停止',()=>{
  const a=adapters(), current=make(Array.from({length:50},(_,i)=>item('a'+i)))
  const incoming=parseWorkspaceBackup(JSON.stringify(make([item('new')])),a)
  assert.throws(()=>planWorkspaceRestore(current,incoming,a.validateCommon),/格式/)
  const large=make([],Array.from({length:500},(_,i)=>record('https://example.com/'+i)))
  const backup=parseWorkspaceBackup(JSON.stringify(make([], [record('https://other.example/')])),a)
  assert.throws(()=>planWorkspaceRestore(large,backup,a.validateCommon),/容量/)
})
test('恢复前快照保存失败不应用任何修改',()=>{
  const storage={getItem:()=>null,setItem:()=>{throw Error('quota')}}
  let applied=false
  assert.throws(()=>runWorkspaceRestore(storage,['history'],make(),()=>{applied=true},()=>{}),/quota/)
  assert.equal(applied,false)
})
test('多键写入失败执行补偿回滚并保留恢复前快照',()=>{
  const data=new Map([['history','old']])
  const storage={getItem:key=>data.get(key)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}
  let reloaded=false
  assert.throws(()=>runWorkspaceRestore(storage,['history','common'],make(),()=>{
    storage.setItem('history','new');storage.setItem('common','new');throw Error('quota')
  },()=>{reloaded=true}),/已回滚/)
  assert.equal(data.get('history'),'old');assert.equal(data.has('common'),false)
  assert.ok(data.get(RECOVERY_KEY));assert.equal(reloaded,true)
})
test('回滚失败明确报告，不宣称数据已恢复',()=>{
  const storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{throw Error('quota')}}
  assert.throws(()=>runWorkspaceRestore(storage,['history'],make(),()=>{throw Error('quota')},()=>{}),/部分回滚失败/)
})
