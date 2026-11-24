import { normalizeTarget } from '../linkCodec.js'

export const WORKSPACE_BACKUP_FORMAT = 's2u-workspace-backup'
export const MAX_WORKSPACE_BACKUP_BYTES = 8 * 1024 * 1024
export const RECOVERY_KEY = 's2u_workspace_before_restore_v1'

// 只构造明确允许导出的业务字段；不包含 Token、Gist ID 或同步配置。
export function makeWorkspaceBackup({ history, commonLinks, darkMode }) {
  return {
    format: WORKSPACE_BACKUP_FORMAT, version: 1, savedAt: Date.now(),
    history, commonLinks, settings: { version: 1, darkMode: darkMode === true },
  }
}
export function parseWorkspaceBackup(text, { inspectHistory, validateCommon }) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_WORKSPACE_BACKUP_BYTES) throw new Error('工作区备份不能超过 8 MiB')
  let input
  try { input = JSON.parse(text) } catch { throw new Error('备份不是有效 JSON') }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('不支持的工作区备份格式')
  let history, commonLinks, settings
  if (input.format === WORKSPACE_BACKUP_FORMAT && input.version === 1) {
    history = input.history
    commonLinks = input.commonLinks
    settings = input.settings
    if (!history || !commonLinks || !settings) throw new Error('完整工作区备份缺少数据')
  } else if (input.format == null && Number.isFinite(input.savedAt) && input.history && input.files && typeof input.files === 'object' && !Array.isArray(input.files)) {
    // 兼容现有同步前 Gist 备份包。没有保存的可选文件不表示清空本机。
    history = input.history
    const read = name => {
      const raw = input.files[name]
      if (raw == null) return null
      if (typeof raw !== 'string') throw new Error('Gist 备份文件格式错误')
      return JSON.parse(raw)
    }
    commonLinks = read('s2u-common-links.json')
    settings = read('s2u-settings.json')
  } else throw new Error('不支持的工作区备份格式或版本')
  const summary = inspectHistory(history)
  if (summary.invalid || (Array.isArray(history?.tombstones) && summary.tombstones !== history.tombstones.length)) throw new Error('备份历史记录或删除标记无效')
  const records = Array.isArray(history) ? history : history.records || history.items
  const tombstones = history.tombstones || []
  if ([...records, ...tombstones].some(item => !normalizeTarget(item.scheme).ok)) throw new Error('备份包含不支持的链接协议')
  if (records.length > 500 || tombstones.length > 1000) throw new Error('备份历史记录或删除标记超过本机容量')
  if (settings && (settings.version !== 1 || typeof settings.darkMode !== 'boolean')) throw new Error('主题设置格式无效')
  // 使用现有收藏校验器；剔除不属于数据格式的其他字段。
  const validatedCommon = commonLinks ? validateCommon(commonLinks) : null
  const sanitizedHistory = {
    format: 's2u-history', version: 2,
    records: records.map(({scheme,count,recently,updatedAt}) => ({scheme,count,recently,updatedAt})),
    tombstones: tombstones.map(({scheme,deletedAt}) => ({scheme,deletedAt})),
  }
  return { history: sanitizedHistory, commonLinks: validatedCommon, settings: settings ? {version:1,darkMode:settings.darkMode} : null, summary }
}

export function planWorkspaceRestore(current, incoming, validateCommon) {
  const currentRecords = current.history.records
  const currentTombstones = current.history.tombstones
  // 保守上限：不允许恢复导致已有记录因容量被静默淘汰。
  if (new Set([...currentRecords, ...incoming.history.records].map(item => item.scheme)).size > 500 ||
      new Set([...currentTombstones, ...incoming.history.tombstones].map(item => item.scheme)).size > 1000) throw new Error('合并后可能超出历史容量，请先整理记录')
  let commonLinks = null, added = 0, skipped = 0
  if (incoming.commonLinks) {
    const items = [...current.commonLinks.items]
    const targets = new Set(items.map(item => item.target))
    const ids = new Set(items.map(item => item.id))
    for (const item of incoming.commonLinks.items) {
      if (targets.has(item.target)) { skipped++; continue }
      if (ids.has(item.id)) throw new Error('收藏 ID 冲突，请先使用单独收藏导入进行处理')
      items.push(item); ids.add(item.id); targets.add(item.target); added++
    }
    commonLinks = validateCommon({format:'s2u-common-links',version:1,items})
  }
  return {
    history: incoming.history, commonLinks, settings: incoming.settings,
    summary: { history: incoming.summary.valid, tombstones: incoming.summary.tombstones, added, skipped, theme: incoming.settings ? (incoming.settings.darkMode ? '深色' : '浅色') : null }
  }
}

// localStorage 没有跨键事务。先保存可导出的恢复前快照，再尝试补偿回滚。
// 仅操作调用者明确指定的业务键，不访问凭据、云连接或其它站点数据。
export function runWorkspaceRestore(storage, keys, before, apply, reload) {
  const original = keys.map(key => [key, storage.getItem(key)])
  storage.setItem(RECOVERY_KEY, JSON.stringify(before))
  try { apply() }
  catch (error) {
    let rollbackFailed = false
    for (const [key, value] of original) {
      try { if (value === null) storage.removeItem(key); else storage.setItem(key, value) }
      catch { rollbackFailed = true }
    }
    try { reload() } catch { rollbackFailed = true }
    throw new Error(rollbackFailed ? '恢复未完成，部分回滚失败；请导出恢复前快照并检查本机存储' : '恢复失败，已回滚本次本机修改：' + (error.message || '存储错误'))
  }
}
