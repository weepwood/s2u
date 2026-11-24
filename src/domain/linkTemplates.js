import { normalizeTarget } from './linkCodec.js'

export const LINK_TEMPLATES = Object.freeze([
  {id:'obsidian',label:'Obsidian',fields:[{id:'vault',label:'笔记库',placeholder:'例如 Notes',required:true},{id:'file',label:'笔记路径',placeholder:'例如 00-日志/今日笔记.md'}]},
  {id:'vscode',label:'VS Code',fields:[{id:'path',label:'绝对文件路径',placeholder:'/home/user/project/main.js 或 C:\\Project\\main.js',required:true},{id:'line',label:'行号（可选）',placeholder:'12'},{id:'column',label:'列号（可选）',placeholder:'1'}]},
  {id:'web',label:'网页',fields:[{id:'address',label:'网址',placeholder:'https://example.com/',required:true},{id:'key',label:'查询参数名（可选）',placeholder:'q'},{id:'value',label:'查询参数值',placeholder:'关键词'}]},
])

function field(values,key,required=false){
  const raw=values?.[key]??''
  if(typeof raw!=='string'||raw.length>4096||[...raw].some(char => { const code=char.charCodeAt(0); return code < 32 || code === 127 }))throw new Error('参数包含无效字符或超出长度限制')
  const value=raw.trim()
  if(required&&!value)throw new Error('请填写必填参数')
  return value
}
function positiveInteger(value){
  if(!/^[1-9]\d{0,8}$/.test(value))throw new Error('行号和列号必须为正整数（最多 9 位）')
  return value
}
function encodePath(raw){
  // 只接受本地绝对路径；不解析文件、不请求系统权限、不支持 UNC 或相对路径。
  const windows=/^[A-Za-z]:[\\/]/.test(raw)
  const path=windows?raw.replaceAll('\\','/'):raw
  if(!windows&&(!path.startsWith('/')||path.startsWith('//')))throw new Error('请填写 Windows、macOS 或 Linux 的本地绝对路径')
  if(path.includes(':')&&(!windows||path.slice(2).includes(':')))throw new Error('路径中的冒号可能与行号混淆，暂不支持')
  const segments=path.split('/')
  if(segments.some(part=>part==='.'||part==='..'))throw new Error('路径不能包含相对目录段')
  if(windows)return segments.map((part,i)=>i===0?part:encodeURIComponent(part)).join('/')
  return segments.map(part=>encodeURIComponent(part)).join('/')
}
export function buildTemplateTarget(id,values={}){
  let target
  if(id==='obsidian'){
    const vault=field(values,'vault',true), file=field(values,'file')
    target='obsidian://open?vault='+encodeURIComponent(vault)+(file?'&file='+encodeURIComponent(file):'')
  }else if(id==='vscode'){
    const path=field(values,'path',true), line=field(values,'line'), column=field(values,'column')
    if(column&&!line)throw new Error('设置列号时必须同时填写行号')
    if((line||column)&&/[\\/]$/.test(path))throw new Error('目录路径不能指定行号或列号')
    const encoded=encodePath(path)
    target='vscode://file'+(encoded.startsWith('/')?'':'/')+encoded+(line?':'+positiveInteger(line):'')+(column?':'+positiveInteger(column):'')
  }else if(id==='web'){
    const normalized=normalizeTarget(field(values,'address',true))
    if(!normalized.ok||!['http:','https:'].includes(normalized.protocol))throw new Error('网页模板仅接受 HTTP 或 HTTPS 网址')
    const url=new URL(normalized.target)
    if(url.username||url.password)throw new Error('网页模板不接受含用户名或密码的网址')
    const key=field(values,'key'),value=field(values,'value')
    if(value&&!key)throw new Error('填写参数值时必须填写参数名')
    if(key)url.searchParams.set(key,value)
    target=url.toString()
  }else throw new Error('不支持的链接模板')
  const normalized=normalizeTarget(target)
  if(!normalized.ok)throw new Error(normalized.error)
  return normalized.target
}
