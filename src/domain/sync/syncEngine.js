// 规范化比较忽略历史/导出的顶层时间戳，保留记录、删除标记及排序。
export function samePayload(a, b) {
  function stable(value, root = false) {
    if (Array.isArray(value)) return value.map(item => stable(item))
    if (!value || typeof value !== 'object') return value
    return Object.fromEntries(Object.keys(value).sort().filter(key => !root || !['updatedAt','exportedAt'].includes(key)).map(key => [key, stable(value[key])]))
  }
  return JSON.stringify(stable(a, true)) === JSON.stringify(stable(b, true))
}
export function mergeWorkspace(local, remote, baseline) {
  if (remote === null) return local
  if (samePayload(local, remote)) return local
  if (baseline !== null && samePayload(local, baseline)) return remote
  if (baseline !== null && samePayload(remote, baseline)) return local
  // 无共同基线或双端同时修改时不猜测，不自动复活删除项。
  throw Object.assign(new Error('收藏或设置存在双端冲突，请先导出本地数据，再选择保留本机或云端'), { name: 'WorkspaceConflictError' })
}
