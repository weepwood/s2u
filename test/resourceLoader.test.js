import test from 'node:test'
import assert from 'node:assert/strict'
import { createResourceLoader } from '../src/utils/resourceLoader.js'

test('预取与打开共用请求，成功资源保持缓存', async () => {
  let calls = 0
  const load = createResourceLoader(async () => { calls++; return 'component' })
  const first = load()
  assert.equal(load(), first)
  assert.equal(await first, 'component')
  assert.equal(load(), first)
  assert.equal(calls, 1)
})
test('失败释放请求，下次加载可重试', async () => {
  let calls = 0
  const load = createResourceLoader(async () => {
    if (++calls === 1) throw new Error('offline')
    return 'ok'
  })
  await assert.rejects(load(), /offline/)
  assert.equal(await load(), 'ok')
  assert.equal(calls, 2)
})
test('超时后的迟到结果不会覆盖新请求', async () => {
  let finish, calls = 0
  const load = createResourceLoader(() => ++calls === 1
    ? new Promise(resolve => { finish = resolve })
    : Promise.resolve('new'), { timeout: 10 })
  await assert.rejects(load(), /超时/)
  assert.equal(await load(), 'new')
  finish('old')
  assert.equal(await load(), 'new')
})
