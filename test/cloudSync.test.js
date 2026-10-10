import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { useCloudSync } from '../src/composables/useCloudSync.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('推送失败时保留更新期间排队的最新快照', async () => {
  const sync = useCloudSync()
  sync.cloudToken.value = 'test-token'
  sync.cloudGistId.value = 'test-gist'

  let resolveFirstRequest
  const requests = []
  globalThis.fetch = (url, options) => {
    requests.push({ url, options })
    if (requests.length === 1) {
      return new Promise((resolve) => {
        resolveFirstRequest = resolve
      })
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ id: 'test-gist' }),
    })
  }

  const first = sync.pushToGist({ revision: 1 })
  assert.equal(requests.length, 1)

  // 第一次请求尚未完成时，新的数据快照进入队列。
  const second = sync.pushToGist({ revision: 2 })
  resolveFirstRequest({
    ok: false,
    status: 500,
    json: async () => ({ message: 'temporary failure' }),
  })

  assert.equal(await first, true)
  assert.equal(await second, true)
  assert.equal(requests.length, 2)

  const pushedContent = JSON.parse(requests[1].options.body)
    .files['scheme-history.json'].content
  assert.deepEqual(JSON.parse(pushedContent), { revision: 2 })
  assert.equal(sync.syncStatus.value, 'connected')
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
