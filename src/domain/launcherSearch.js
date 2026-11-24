// 纯本机搜索，不请求图标或向外部发送查询。
export function buildLauncherEntries(commonLinks, history) {
  const seen=new Set(), entries=[]
  for(const item of commonLinks) {
    if(seen.has(item.target))continue
    seen.add(item.target)
    entries.push({key:'favorite-'+item.id,name:item.name,target:item.target,tags:item.tags||[],kind:'常用',source:'common'})
  }
  for(const item of history) {
    if(seen.has(item.scheme))continue
    seen.add(item.scheme)
    entries.push({key:'history-'+item.scheme,name:item.scheme,target:item.scheme,tags:[],kind:'历史',source:'history'})
  }
  return entries
}
export function searchLauncher(entries, query, source='all', limit=12) {
  const phrase=String(query||'').trim().toLowerCase(), terms=phrase.split(/\s+/).filter(Boolean)
  const results=[]
  for(const [index,item] of entries.entries()) {
    if(source!=='all'&&item.source!==source)continue
    const name=item.name.toLowerCase(), target=item.target.toLowerCase(), tags=item.tags.join(' ').toLowerCase()
    const fields=[name,target,tags]
    if(!terms.every(term=>fields.some(field=>field.includes(term))))continue
    const score=phrase ? (name===phrase?100:name.startsWith(phrase)?70:0) +
      terms.reduce((total,term)=>total+(name.includes(term)?10:target.includes(term)?5:3),0) : 0
    results.push({item,index,score})
  }
  return results.sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit).map(result=>result.item)
}
