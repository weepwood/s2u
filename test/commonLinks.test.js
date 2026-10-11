import test from 'node:test'
import assert from 'node:assert/strict'
import { useCommonLinks, DEFAULT_COMMON_LINKS } from '../src/composables/useCommonLinks.js'

function useFakeStorage() {
  const state = new Map()
  const original = globalThis.localStorage
  globalThis.localStorage = {
    getItem(key) { return state.has(key) ? state.get(key) : null },
    setItem(key, value) { state.set(key, String(value)) },
    removeItem(key) { state.delete(key) },
  }
  return { state, restore() { globalThis.localStorage = original } }
}

test('首次进入展示 4 个默认应用；保存后刷新仍保留', () => {
  const mock = useFakeStorage()
  try {
    const links = useCommonLinks()
    links.load()
    assert.deepEqual(links.links.value.map((x) => x.target), DEFAULT_COMMON_LINKS.map((x) => x.target))
    assert.equal(links.save({ name: '自定义', target: 'obsidian://open?vault=笔记' }), true)
    const loaded = useCommonLinks()
    loaded.load()
    assert.equal(loaded.links.value.length, 5)
    assert.equal(loaded.links.value[4].target, 'obsidian://open?vault=笔记')
  } finally {
    mock.restore()
  }
})

test('可修改、删除默认项，恢复默认后不覆盖历史数据', () => {
  const mock = useFakeStorage()
  try {
    const links = useCommonLinks()
    links.load()
    localStorage.setItem('scheme_history', 'keep-existing-history')
    links.save({ id: 'vscode', name: '编辑器', target: 'vscode://file/test' })
    assert.equal(links.links.value.find((x) => x.id === 'vscode').name, '编辑器')
    assert.equal(links.remove('obsidian'), true)
    assert.equal(links.links.value.some((x) => x.id === 'obsidian'), false)
    links.restoreDefaults()
    assert.equal(links.links.value.length, 4)
    assert.equal(localStorage.getItem('scheme_history'), 'keep-existing-history')
  } finally {
    mock.restore()
  }
})

test('拦截危险协议、重复地址、空名称和超长名称', () => {
  const mock = useFakeStorage()
  try {
    const links = useCommonLinks()
    links.load()
    assert.throws(() => links.save({ name: '危险', target: 'javascript:alert(1)' }), /不支持/)
    assert.throws(() => links.save({ name: '重复', target: 'weixin://' }), /已存在/)
    assert.throws(() => links.save({ name: '', target: 'mailto:user@example.com' }), /名称/)
    assert.throws(() => links.save({ name: 'x'.repeat(40), target: 'tel:123' }), /名称/)
    assert.equal(links.links.value.length, 4)
  } finally {
    mock.restore()
  }
})

test('损坏存储回退默认数据且不覆盖原始内容', () => {
  const mock = useFakeStorage()
  try {
    localStorage.setItem('s2u_common_links_v1', '{corrupted')
    const links = useCommonLinks()
    links.load()
    assert.equal(links.links.value.length, 4)
    assert.match(links.storageError.value, /读取失败/)
    assert.equal(localStorage.getItem('s2u_common_links_v1'), '{corrupted')
  } finally {
    mock.restore()
  }
})
