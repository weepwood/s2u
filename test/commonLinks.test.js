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


test('localStorage 配额不足时新增、编辑、删除、重置均不产生假成功', () => {
  const mock = useFakeStorage()
  try {
    const links = useCommonLinks()
    links.load()
    assert.equal(links.save({ name: '笔记', target: 'obsidian://open?vault=one' }), true)
    const before = JSON.stringify(links.links.value)
    const persisted = localStorage.getItem('s2u_common_links_v1')
    const originalSetItem = localStorage.setItem
    localStorage.setItem = () => { throw new Error('QuotaExceededError') }

    assert.equal(links.save({ name: '浏览器', target: 'https://example.com' }), false)
    assert.equal(links.save({ id: 'obsidian', name: '另一个', target: 'obsidian://other' }), false)
    assert.equal(links.remove('vscode'), false)
    assert.equal(links.restoreDefaults(), false)
    assert.equal(JSON.stringify(links.links.value), before)
    assert.equal(localStorage.getItem('s2u_common_links_v1'), persisted)
    assert.match(links.storageError.value, /保存失败/)

    localStorage.setItem = originalSetItem
    assert.equal(links.remove('vscode'), true)
    assert.equal(links.links.value.some((x) => x.id === 'vscode'), false)
  } finally {
    mock.restore()
  }
})

test('损坏原始数据先备份再由显式恢复覆盖，普通操作不得隐式覆盖', () => {
  const mock = useFakeStorage()
  try {
    const damaged = '{invalid-json'
    localStorage.setItem('s2u_common_links_v1', damaged)
    const links = useCommonLinks()
    links.load()
    assert.equal(links.save({ name: '新链接', target: 'https://example.com' }), false)
    assert.equal(links.remove('obsidian'), false)
    assert.equal(localStorage.getItem('s2u_common_links_v1'), damaged)
    assert.equal(links.restoreDefaults(), true)
    assert.equal(links.links.value.length, 4)
    const backups = [...mock.state].filter(([key]) => key.startsWith('s2u_common_links_corrupt_backup_'))
    assert.equal(backups.length, 1)
    assert.equal(backups[0][1], damaged)
    assert.equal(JSON.parse(localStorage.getItem('s2u_common_links_v1')).version, 1)
  } finally {
    mock.restore()
  }
})
