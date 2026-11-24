import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLauncherEntries, searchLauncher } from '../src/domain/launcherSearch.js'
const entries=buildLauncherEntries([
  {id:'a',name:'Visual Studio Code',target:'vscode://',tags:['开发']},
  {id:'b',name:'Obsidian',target:'obsidian://',tags:['笔记','Work']},
  {id:'c',name:'Work',target:'https://example.com/',tags:['笔记']}
],[
  {scheme:'vscode://'},
  {scheme:'https://work.example/'},
  {scheme:'https://history.example/'}
])
test('命令索引按目标去重并保留常用链接标签',()=>{
  assert.equal(entries.length,5)
  assert.deepEqual(entries[1].tags,['笔记','Work'])
  assert.equal(entries[0].kind,'常用')
})
test('搜索跨名称、地址和标签的多关键词，优先完全匹配名称',()=>{
  assert.deepEqual(searchLauncher(entries,'visual 开发').map(x=>x.name),['Visual Studio Code'])
  assert.deepEqual(searchLauncher(entries,'笔记 work').map(x=>x.name),['Work','Obsidian'])
  assert.equal(searchLauncher(entries,'work')[0].name,'Work')
})
test('按来源筛选、限制结果数和保持默认顺序',()=>{
  assert.deepEqual(searchLauncher(entries,'','common').map(x=>x.name),['Visual Studio Code','Obsidian','Work'])
  assert.deepEqual(searchLauncher(entries,'work','history').map(x=>x.name),['https://work.example/'])
  assert.equal(searchLauncher(entries,'','all',2).length,2)
  assert.deepEqual(searchLauncher(entries,'不存在'),[])
})
