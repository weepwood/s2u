import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTemplateTarget } from '../src/domain/linkTemplates.js'
import { encodeShareLink,decodeShareTarget } from '../src/domain/linkCodec.js'
test('Obsidian 参数独立编码，分享链接正确还原',()=>{
  const target=buildTemplateTarget('obsidian',{vault:'我的笔记 & 资料',file:'日志/#100%.md'})
  const url=new URL(target)
  assert.equal(url.searchParams.get('vault'),'我的笔记 & 资料')
  assert.equal(url.searchParams.get('file'),'日志/#100%.md')
  assert.equal(decodeShareTarget(new URL(encodeShareLink('https://example.com/s2u',target)).hash),target)
  assert.throws(()=>buildTemplateTarget('obsidian',{file:'note.md'}),/必填/)
})
test('VS Code 支持 Windows 绝对路径与 Unix 路径，编码空格及特殊字符',()=>{
  assert.equal(buildTemplateTarget('vscode',{path:'C:\\My Project\\a.js',line:'12',column:'3'}),'vscode://file/C:/My%20Project/a.js:12:3')
  assert.equal(buildTemplateTarget('vscode',{path:'/home/user/我的 #文件.js'}),'vscode://file/home/user/%E6%88%91%E7%9A%84%20%23%E6%96%87%E4%BB%B6.js')
  for(const values of [{path:'relative.js'},{path:'/a',column:'3'},{path:'/a',line:'-1'},{path:'/a/../b'},{path:'//server/share'},{path:'/a/',line:'1'}])assert.throws(()=>buildTemplateTarget('vscode',values))
})
test('网页模板保留已有查询和 hash，拒绝危险协议与认证信息',()=>{
  const url=new URL(buildTemplateTarget('web',{address:'https://example.com/?a=1#section',key:'q',value:'中文 & #'}))
  assert.equal(url.searchParams.get('a'),'1');assert.equal(url.searchParams.get('q'),'中文 & #');assert.equal(url.hash,'#section')
  for(const address of ['javascript:alert(1)','file:///private','obsidian://open','https://user:pass@example.com/'])assert.throws(()=>buildTemplateTarget('web',{address}))
  assert.throws(()=>buildTemplateTarget('web',{address:'example.com',value:'missing key'}),/参数名/)
  assert.throws(()=>buildTemplateTarget('obsidian',{vault:'a\nb'}),/无效字符/)
  assert.throws(()=>buildTemplateTarget('obsidian',{vault:'中'.repeat(2000)}),/过长/)
})
