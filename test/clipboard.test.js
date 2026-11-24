import test from 'node:test'
import assert from 'node:assert/strict'
import { writeClipboardText, useClipboard } from '../src/composables/useClipboard.js'
import { ref } from 'vue'
import { useCreateLinkActions } from '../src/composables/workspace/useCreateLinkActions.js'

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

test('并发复制只由最新操作更新反馈，已完成的复制均保留回调', async () => {
  const requests = new Map(), saved = []
  const clipboard = useClipboard({ write: value => new Promise((resolve, reject) => requests.set(value, { resolve, reject })) })
  try {
    const first = clipboard.copyToClipboard('first', () => saved.push('first'))
    const second = clipboard.copyToClipboard('second', () => saved.push('second'))
    requests.get('second').resolve()
    await second
    requests.get('first').reject(new Error('denied'))
    await first
    assert.equal(clipboard.copyText.value, 'Copied!')
    assert.deepEqual(saved, ['second'])
    const third = clipboard.copyToClipboard('third', () => saved.push('third'))
    clipboard.cleanup()
    requests.get('third').resolve()
    await third
    assert.deepEqual(saved, ['second'])
  } finally { clipboard.cleanup() }
})

test('创建页复制期间改动并恢复原字符串也不应清除当前草稿', async () => {
  let finish, syncs = 0
  const url = ref('https://example.com/a'), urlError = ref(''), saved = []
  const actions = useCreateLinkActions({
    url, urlError, qrShareUrl: ref(''), history: ref([]), origin: 'https://example.com/s2u',
    addHistory: target => { saved.push(target); return true },
    autoSync: () => { syncs++ }, notifyStorageError: () => {}, showToast: () => {},
    write: () => new Promise(resolve => { finish = resolve }),
  })
  try {
    const task = actions.copy()
    url.value = 'https://example.com/b'
    url.value = 'https://example.com/a'
    finish()
    await task
    assert.equal(url.value, 'https://example.com/a')
    assert.deepEqual(saved, ['https://example.com/a'])
    assert.equal(syncs, 1)
  } finally { actions.cleanup() }
})
