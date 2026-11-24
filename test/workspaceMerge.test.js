import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeWorkspace } from '../src/domain/sync/syncEngine.js'

const item = (id, name = id, target = 'https://example.com/' + id) => ({ id, name, target })
const snapshot = (...items) => ({ format:'s2u-common-links', version:1, items })
const ids = value => value.items.map(x => x.id)
const a = item('a'), b = item('b'), c = item('c')
const base = snapshot(a,b,c)

test('不同设备编辑不同收藏时自动保留两端修改', () => {
  const left = snapshot({...a,name:'本机 A'},b,c)
  const right = snapshot(a,{...b,tags:['工作']},c)
  const merged = mergeWorkspace(left,right,base)
  assert.deepEqual(merged,snapshot({...a,name:'本机 A'},{...b,tags:['工作']},c))
  assert.deepEqual(mergeWorkspace(right,left,base),merged)
})
test('单端删除与另一端无关编辑合并，不复活已删除收藏', () => {
  const merged = mergeWorkspace(snapshot(b,c),snapshot(a,b,{...c,name:'远端 C'}),base)
  assert.deepEqual(merged,snapshot(b,{...c,name:'远端 C'}))
})
test('单端排序与另一端内容编辑可以合并', () => {
  const merged = mergeWorkspace(snapshot(c,a,b),snapshot(a,{...b,name:'远端 B'},c),base)
  assert.deepEqual(ids(merged),['c','a','b'])
  assert.equal(merged.items[2].name,'远端 B')
})
test('两端追加保持各自顺序且结果与设备方向无关', () => {
  const left=snapshot(a,b,c,item('e'),item('g'))
  const right=snapshot(a,b,c,item('d'),item('f'))
  const merged=mergeWorkspace(left,right,base)
  assert.deepEqual(ids(merged),['a','b','c','d','e','f','g'])
  assert.deepEqual(mergeWorkspace(right,left,base),merged)
  const shared=snapshot(a,b,c,item('d'),item('e'))
  assert.deepEqual(ids(mergeWorkspace(snapshot(a,b,c,item('e')),shared,base)),['a','b','c','d','e'])
})
test('删除与编辑、同一收藏的不同编辑必须人工处理', () => {
  assert.throws(()=>mergeWorkspace(snapshot(b,c),snapshot({...a,name:'远端 A'},b,c),base),/双端冲突/)
  assert.throws(()=>mergeWorkspace(snapshot({...a,name:'左'},b,c),snapshot({...a,name:'右'},b,c),base),/双端冲突/)
})
test('两端不同排序、插入位置和追加排序环不自动覆盖', () => {
  assert.throws(()=>mergeWorkspace(snapshot(b,a,c),snapshot(c,b,a),base),/双端冲突/)
  assert.throws(()=>mergeWorkspace(snapshot(a,item('d'),b,c),snapshot(a,b,{...c,name:'C2'}),base),/插入位置/)
  assert.throws(()=>mergeWorkspace(snapshot(a,b,c,item('d'),item('e')),snapshot(a,b,c,item('e'),item('d')),base),/排序冲突/)
})
test('同一目标不同 ID、超容量或没有共同基线均停止', () => {
  assert.throws(()=>mergeWorkspace(snapshot(a,b,c,item('d','D',a.target)),snapshot(a,b,{...c,name:'C2'}),base),/相同目标/)
  const many=Array.from({length:49},(_,i)=>item('x'+i))
  const shared=snapshot(...many)
  assert.throws(()=>mergeWorkspace(snapshot(...many,item('l')),snapshot(...many,item('r')),shared),/50 条/)
  assert.throws(()=>mergeWorkspace(snapshot(a),snapshot(b),null),/双端冲突/)
})
test('主题双端冲突仍要求人工处理', () => {
  assert.throws(()=>mergeWorkspace({version:1,darkMode:true},{version:1,darkMode:false},null),/双端冲突/)
})
