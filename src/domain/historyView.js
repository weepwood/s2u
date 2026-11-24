import { normalizeTarget } from './linkCodec.js'

// 仅用于展示，不修改原有历史数据、计数或删除标记。
export function historyProtocol(item) {
  const result=normalizeTarget(item.scheme)
  return result.ok ? result.protocol : 'unknown:'
}
export function selectHistoryView(items,{query='',protocol='',order='recent'}={}) {
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return items.filter(item=> (!protocol || historyProtocol(item)===protocol) &&
    terms.every(term=>item.scheme.toLowerCase().includes(term)))
    .slice().sort((a,b)=> (order==='count' ? b.count-a.count : 0) || b.recently-a.recently)
}
function dateKey(value) {
  const date=new Date(value)
  return Number.isFinite(date.getTime()) ? [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-') : 'unknown'
}
export function groupHistoryByDay(items,now=Date.now()) {
  const today=dateKey(now), yesterday=new Date(now)
  yesterday.setDate(yesterday.getDate()-1)
  const prior=dateKey(yesterday)
  const groups=new Map()
  for(const item of items) {
    const key=dateKey(item.recently)
    if(!groups.has(key))groups.set(key,{key,label:key===today?'今天':key===prior?'昨天':key==='unknown'?'未知日期':key,items:[]})
    groups.get(key).items.push(item)
  }
  return [...groups.values()]
}
export function historyBookmarkName(target) {
  const normalized=normalizeTarget(target)
  if(!normalized.ok)throw new Error(normalized.error)
  let name=normalized.protocol.slice(0,-1)
  if(['http:','https:'].includes(normalized.protocol))name=new URL(normalized.target).hostname
  return name.slice(0,36)
}
