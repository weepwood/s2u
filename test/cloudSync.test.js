import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { useCloudSync } from '../src/composables/useCloudSync.js'

const storage = new Map()
globalThis.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null },
  setItem(key, value) { storage.set(key, String(value)) },
  removeItem(key) { storage.delete(key) },
}
const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  storage.clear()
})

test('推送失败时仍尝试最新排队快照，每次先读取远端及备份', async () => {
  const sync = useCloudSync()
  sync.cloudToken.value = 'test-token'
  sync.cloudGistId.value = 'test-gist'
  let resolveFirstPatch
  const patches = []
  globalThis.fetch = (url, options = {}) => {
    if (options.method !== 'PATCH') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ files: { 'scheme-history.json': { content: '{"version":2}' } } }),
      })
    }
    patches.push(options)
    if (patches.length === 1) {
      return new Promise((resolve) => { resolveFirstPatch = resolve })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'test-gist' }) })
  }

  const first = sync.pushToGist({ revision: 1 })
  // 等到 PATCH 已发送后加入更新快照。
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(patches.length, 1)
  const second = sync.pushToGist({ revision: 2 })
  resolveFirstPatch({
    ok: false,
    status: 500,
    json: async () => ({ message: 'temporary failure' }),
  })

  assert.equal(await first, true)
  assert.equal(await second, true)
  assert.equal(patches.length, 2)
  assert.deepEqual(JSON.parse(JSON.parse(patches[1].body).files['scheme-history.json'].content), { revision: 2 })
  assert.equal(sync.syncStatus.value, 'connected')
  assert.ok(sync.getLatestRecovery())
})

test('主动清理请求不会把取消操作误报成同步超时错误', async () => {
  const sync = useCloudSync()
  sync.cloudToken.value = 'test-token'
  sync.cloudGistId.value = 'test-gist'

  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('aborted by cleanup')
      error.name = 'AbortError'
      reject(error)
    }, { once: true })
  })

  const pending = sync.pushToGist({ revision: 1 })
  sync.cleanup()

  await assert.rejects(pending, /请求已取消/)
  assert.notEqual(sync.syncStatus.value, 'error')
})


test('拉取后远端发生变化：拒绝 PATCH 并明确报告冲突', async () => {
  const sync = useCloudSync()
  sync.cloudToken.value = 'test-token'
  sync.cloudGistId.value = 'test-conflict'
  let changed = false
  let patches = 0
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === 'PATCH') {
      patches++
      return { ok: true, status: 200, json: async () => ({}) }
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ files: { 'scheme-history.json': { content: changed
        ? '{"version":2,"records":[{"scheme":"new"}]}'
        : '{"version":2,"records":[]}' } } }),
    }
  }

  assert.deepEqual(await sync.pullFromGist(), { version: 2, records: [] })
  changed = true
  await assert.rejects(sync.pushToGist({ version: 2, records: [] }), /已被其它设备修改/)
  assert.equal(patches, 0)
  assert.equal(sync.syncStatus.value, 'error')
  assert.match(sync.syncError.value, /重新同步/)
})

test('同步前备份失败时停止写入，避免远端内容被覆盖', async () => {
  const sync = useCloudSync()
  sync.cloudToken.value = 'test-token'
  sync.cloudGistId.value = 'test-quota'
  let patches = 0
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === 'PATCH') patches++
    return { ok: true, status: 200, json: async () =>
      ({ files: { 'scheme-history.json': { content: '{"version":2}' } } }) }
  }
  const originalSetItem = globalThis.localStorage.setItem
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError') }
  try {
    await assert.rejects(sync.pushToGist({ version: 2 }), /无法保存同步前备份/)
    assert.equal(patches, 0)
  } finally {
    globalThis.localStorage.setItem = originalSetItem
  }
})

test('成功推送保留标准历史快照，无 GitHub Token 写入备份', async () => {
  const sync = useCloudSync()
  sync.cloudToken.value = 'private-test-token'
  sync.cloudGistId.value = 'backup-check'
  globalThis.fetch = async (_url, options = {}) => ({
    ok: true, status: 200,
    json: async () => options.method === 'PATCH'
      ? { id: 'backup-check' }
      : { files: { 'scheme-history.json': { content: '{"format":"s2u-history","version":2,"records":[],"tombstones":[]}' } } },
  })

  assert.equal(await sync.pushToGist({ version: 2 }), true)
  assert.deepEqual(sync.getLatestRecovery(), { format: 's2u-history', version: 2, records: [], tombstones: [] })
  assert.doesNotMatch(JSON.stringify([...storage]), /private-test-token/)
})
