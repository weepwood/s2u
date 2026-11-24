import test from 'node:test'
import assert from 'node:assert/strict'
import { writeClipboardText } from '../src/composables/useClipboard.js'

test('剪贴板方法保持接收者绑定并传递原始文本', async () => {
  const clipboard = { text: '', async writeText(value) { this.text = value } }
  await writeClipboardText('https://example.com/#中文', clipboard)
  assert.equal(clipboard.text, 'https://example.com/#中文')
})

test('剪贴板缺失及权限拒绝均产生可捕获的 Promise 拒绝', async () => {
  await assert.rejects(writeClipboardText('test', null), /unavailable/)
  await assert.rejects(writeClipboardText('test', {}), /unavailable/)
  await assert.rejects(writeClipboardText('test', { writeText() { throw new Error('denied') } }), /denied/)
  await assert.rejects(writeClipboardText('test', { async writeText() { throw new Error('denied') } }), /denied/)
})
