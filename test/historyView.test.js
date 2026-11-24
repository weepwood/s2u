import test from 'node:test'
import assert from 'node:assert/strict'
import { historyProtocol,selectHistoryView,groupHistoryByDay,historyBookmarkName } from '../src/domain/historyView.js'
const now=new Date(2026,10,24,12).getTime(), yesterday=new Date(2026,10,23,12).getTime()
const items=[{scheme:'obsidian://open?vault=Notes',count:2,recently:now},{scheme:'https://example.com/work',count:9,recently:yesterday},{scheme:'https://example.com/notes',count:4,recently:now-1000}]
test('历史筛选可组合多个关键词与协议，不改变原数组及记录',()=>{
  const before=JSON.stringify(items)
  assert.deepEqual(selectHistoryView(items,{query:'example notes',protocol:'https:'}),[items[2]])
  assert.equal(historyProtocol({scheme:'javascript:alert(1)'}),'unknown:')
  assert.equal(JSON.stringify(items),before)
})
test('频率排序与日期分组使用稳定的原始记录',()=>{
  assert.deepEqual(selectHistoryView(items,{order:'count'}),[items[1],items[2],items[0]])
  const groups=groupHistoryByDay(selectHistoryView(items),now)
  assert.deepEqual(groups.map(x=>x.label),['今天','昨天'])
  assert.deepEqual(groups[0].items,[items[0],items[2]])
})
test('历史转收藏名称使用既有协议校验，拒绝危险目标',()=>{
  assert.equal(historyBookmarkName('https://example.com/work'),'example.com')
  assert.equal(historyBookmarkName('obsidian://open?vault=Notes'),'obsidian')
  assert.throws(()=>historyBookmarkName('javascript:alert(1)'),/不支持/)
})

test('历史较早日期使用本地日历分组和清晰中文标签',()=>{
  const old={scheme:'https://example.com/old',count:1,recently:new Date(2025,0,3,12).getTime()}
  const groups=groupHistoryByDay([old],now)
  assert.equal(groups[0].key,'2025-1-3')
  assert.equal(groups[0].label,'2025年1月3日')
  assert.equal(groups[0].items[0],old)
})
