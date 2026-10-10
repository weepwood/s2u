import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { useHistory } from '../src/composables/useHistory.js'

class MemoryStorage {
  #data = new Map()

  getItem(key) {
    return this.#data.has(key) ? this.#data.get(key) : null
  }

  setItem(key, value) {
    this.#data.set(key, String(value))
  }

  removeItem(key) {
    this.#data.delete(key)
  }

  clear() {
    this.#data.clear()
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

test('旧版数组历史记录可以迁移到版本化格式', () => {
  localStorage.setItem(
    'scheme_history',
    JSON.stringify([{ scheme: 'weixin://open', count: 2, recently: 1000 }]),
  )

  const store = useHistory()
  store.load()

  assert.equal(store.history.value.length, 1)
  assert.equal(store.history.value[0].updatedAt, 1000)
  assert.equal(store.snapshot().version, 2)
})

test('删除记录会生成同步删除标记', () => {
  const store = useHistory()
  store.load()
  store.add('https://example.com/')

  assert.equal(store.remove('https://example.com/'), true)
  assert.equal(store.history.value.length, 0)
  assert.equal(store.tombstones.value.length, 1)
  assert.equal(store.tombstones.value[0].scheme, 'https://example.com/')
})

test('远端删除标记可以删除本地旧记录', () => {
  const now = Date.now()
  const store = useHistory()
  store.load()
  store.merge({
    format: 's2u-history',
    version: 2,
    records: [
      {
        scheme: 'https://example.com/',
        count: 1,
        recently: now - 1000,
        updatedAt: now - 1000,
      },
    ],
    tombstones: [],
  })

  store.merge({
    format: 's2u-history',
    version: 2,
    records: [],
    tombstones: [{ scheme: 'https://example.com/', deletedAt: now }],
  })

  assert.equal(store.history.value.length, 0)
  assert.equal(store.tombstones.value[0].deletedAt, now)
})

test('删除后重新使用链接会以更新记录覆盖旧删除标记', () => {
  const store = useHistory()
  store.load()
  store.merge({
    format: 's2u-history',
    version: 2,
    records: [],
    tombstones: [{ scheme: 'weixin://open', deletedAt: Date.now() - 1 }],
  })

  assert.equal(store.add('weixin://open'), true)
  assert.equal(store.history.value.length, 1)
  assert.equal(store.tombstones.value.length, 0)
})

test('导入检查兼容旧数组并报告无效条目', () => {
  const store = useHistory()
  const summary = store.inspectImport([
    { scheme: 'weixin://open', count: 1, recently: 1000 },
    { scheme: '', count: 1, recently: 1000 },
  ])

  assert.deepEqual(summary, {
    total: 2,
    valid: 1,
    invalid: 1,
    tombstones: 0,
  })
})


test('先应用删除标记再限制 500 条容量，不会丢掉被删除项之后的有效记录', () => {
  const now = Date.now()
  const records = Array.from({ length: 500 }, (_, index) => ({
    scheme: `https://example.com/${index}`,
    count: 1,
    recently: now - index * 1000,
    updatedAt: now - index * 1000,
  }))
  const store = useHistory()

  store.load()
  store.merge({
    format: 's2u-history',
    version: 2,
    records,
    tombstones: [],
  })

  const oldestScheme = records[records.length - 1].scheme
  store.merge({
    format: 's2u-history',
    version: 2,
    records: [{
      scheme: 'https://example.com/new-then-deleted',
      count: 1,
      recently: now + 1000,
      updatedAt: now + 1000,
    }],
    tombstones: [{
      scheme: 'https://example.com/new-then-deleted',
      deletedAt: now + 2000,
    }],
  })

  assert.equal(store.history.value.length, 500)
  assert.ok(store.history.value.some((item) => item.scheme === oldestScheme))
  assert.ok(!store.history.value.some((item) => item.scheme === 'https://example.com/new-then-deleted'))
})

test('拒绝缺少版本号的版本化历史对象', () => {
  const store = useHistory()

  assert.throws(
    () => store.inspectImport({
      format: 's2u-history',
      records: [{ scheme: 'weixin://open', count: 1, recently: 1000 }],
      tombstones: [],
    }),
    /有效版本号/,
  )
})

test('拒绝超出允许范围的导入记录数量', () => {
  const store = useHistory()
  const tooManyRecords = Array.from({ length: 10001 }, (_, index) => ({
    scheme: `weixin://open/${index}`,
    count: 1,
    recently: 1000,
  }))

  assert.throws(() => store.inspectImport(tooManyRecords), /记录数量不能超过 10000/)
})

test('忽略明显位于未来的时间戳，避免异常记录覆盖删除标记', () => {
  const store = useHistory()
  const now = Date.now()

  store.load()
  store.merge({
    format: 's2u-history',
    version: 2,
    records: [{
      scheme: 'weixin://future-record',
      count: 1,
      recently: now + 365 * 24 * 60 * 60 * 1000,
      updatedAt: now + 365 * 24 * 60 * 60 * 1000,
    }],
    tombstones: [],
  })

  assert.equal(store.history.value.some((item) => item.scheme === 'weixin://future-record'), false)
})
