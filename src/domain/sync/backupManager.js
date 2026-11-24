const PREFIX = 's2u_gist_backup_v1_'
export function listBackups(id, storage = globalThis.localStorage) {
  if (!id) return []
  const raw = JSON.parse(storage.getItem(PREFIX + id) || '[]')
  if (!Array.isArray(raw)) throw new Error('同步备份格式不正确')
  return raw
}
export function saveBackup(id, remoteContent, files = {}, storage = globalThis.localStorage) {
  let previous
  try { previous = listBackups(id, storage) } catch { throw new Error('本地同步备份不可读取，已停止云端写入') }
  try {
    storage.setItem(PREFIX + id, JSON.stringify([...previous, { savedAt: Date.now(), remoteContent, files }].slice(-3)))
  } catch { throw new Error('无法保存同步前备份，为保护远端数据已中止写入') }
}
