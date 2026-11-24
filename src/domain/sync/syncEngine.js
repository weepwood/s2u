// 规范化比较忽略历史/导出的顶层时间戳，保留记录、删除标记及排序。
export function samePayload(a, b) {
  function stable(value, root = false) {
    if (Array.isArray(value)) return value.map(item => stable(item))
    if (!value || typeof value !== 'object') return value
    return Object.fromEntries(Object.keys(value).sort().filter(key => !root || !['updatedAt','exportedAt'].includes(key)).map(key => [key, stable(value[key])]))
  }
  return JSON.stringify(stable(a, true)) === JSON.stringify(stable(b, true))
}
function conflict(reason) {
  return Object.assign(new Error('收藏或设置存在双端冲突：' + reason + '。请先导出本地数据，再选择保留本机或云端'), { name: 'WorkspaceConflictError' })
}

function isCommonSnapshot(value) {
  return value?.format === 's2u-common-links' && value.version === 1 && Array.isArray(value.items) &&
    value.items.every(item => typeof item?.id === 'string' && typeof item.target === 'string') &&
    new Set(value.items.map(item => item.id)).size === value.items.length
}

// 新增记录只接受追加，不猜测两个设备对中间插入位置的意图。
// 拓扑排序保留两端的追加顺序，ID 仅用于互不相干的新增项的稳定 tie-break。
function mergeAppendOrder(local, remote) {
  const ids = new Set([...local, ...remote])
  const edges = new Map([...ids].map(id => [id, new Set()]))
  const indegree = new Map([...ids].map(id => [id, 0]))
  for (const sequence of [local, remote]) {
    for (let i = 1; i < sequence.length; i++) {
      const before = sequence[i - 1], after = sequence[i]
      if (!edges.get(before).has(after)) {
        edges.get(before).add(after)
        indegree.set(after, indegree.get(after) + 1)
      }
    }
  }
  const result = []
  while (ids.size) {
    const next = [...ids].filter(id => indegree.get(id) === 0).sort()[0]
    if (next === undefined) throw conflict('新增收藏的排序冲突')
    ids.delete(next)
    result.push(next)
    for (const id of edges.get(next)) indegree.set(id, indegree.get(id) - 1)
  }
  return result
}

function mergeCommonLinks(local, remote, baseline) {
  const baseMap = new Map(baseline.items.map(item => [item.id, item]))
  const left = new Map(local.items.map(item => [item.id, item]))
  const right = new Map(remote.items.map(item => [item.id, item]))
  const merged = new Map()
  for (const id of new Set([...baseMap.keys(), ...left.keys(), ...right.keys()])) {
    const before = baseMap.get(id), a = left.get(id), b = right.get(id)
    let result
    if (samePayload(a, b)) result = a
    else if (samePayload(a, before)) result = b
    else if (samePayload(b, before)) result = a
    else throw conflict('同一收藏被两端修改，或删除与修改相冲突')
    if (result !== undefined) merged.set(id, result)
  }

  // 已删除的记录不参与排序；单端移动与另一端不同记录修改可以合并。
  const survivingBase = baseline.items.map(item => item.id).filter(id => merged.has(id))
  function split(snapshot) {
    const existing = [], added = []
    for (const item of snapshot.items) {
      if (!merged.has(item.id)) continue
      if (baseMap.has(item.id)) {
        if (added.length) throw conflict('新增收藏的插入位置需要人工确认')
        existing.push(item.id)
      } else added.push(item.id)
    }
    return { existing, added }
  }
  const a = split(local), b = split(remote)
  let existing
  if (samePayload(a.existing, b.existing)) existing = a.existing
  else if (samePayload(a.existing, survivingBase)) existing = b.existing
  else if (samePayload(b.existing, survivingBase)) existing = a.existing
  else throw conflict('两端同时调整了收藏排序')
  const order = [...existing, ...mergeAppendOrder(a.added, b.added)]
  if (order.length !== merged.size || new Set(order).size !== order.length) throw conflict('合并后的收藏顺序不完整')
  const items = order.map(id => merged.get(id))
  if (items.length > 50) throw conflict('合并后超过 50 条收藏')
  if (new Set(items.map(item => item.target)).size !== items.length) throw conflict('两端创建了相同目标的不同收藏')
  return { ...local, items }
}

export function mergeWorkspace(local, remote, baseline) {
  if (remote === null) return local
  if (samePayload(local, remote)) return local
  if (baseline !== null && samePayload(local, baseline)) return remote
  if (baseline !== null && samePayload(remote, baseline)) return local
  if ([local, remote, baseline].every(isCommonSnapshot)) return mergeCommonLinks(local, remote, baseline)
  // 无共同基线、主题冲突或无法证明安全的合并一律停止。
  throw conflict('没有共同基线或同一设置已被两端修改')
}
