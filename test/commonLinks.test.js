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


test('常用链接排序持久化且写入失败不改变原顺序', () => {
  const mock = useFakeStorage()
  try {
    const links = useCommonLinks()
    links.load()
    assert.equal(links.move('obsidian', 1), true)
    assert.equal(links.links.value[0].id, 'vscode')
    const loaded = useCommonLinks()
    loaded.load()
    assert.equal(loaded.links.value[0].id, 'vscode')
    const oldSet = localStorage.setItem
    localStorage.setItem = () => { throw new Error('QuotaExceededError') }
    assert.equal(links.move('vscode', 1), false)
    assert.equal(links.links.value[0].id, 'vscode')
    localStorage.setItem = oldSet
  } finally { mock.restore() }
})

test('版本化备份可追加恢复、重复链接跳过且保留历史记录', () => {
  const mock = useFakeStorage()
  try {
    const links = useCommonLinks()
    links.load()
    const backup = JSON.parse(links.exportJSON())
    assert.equal(backup.format, 's2u-common-links')
    localStorage.setItem('scheme_history', 'keep')
    links.remove('weixin')
    assert.deepEqual(links.inspectImport(backup), { count: 4, added: 1, duplicates: 3 })
    assert.equal(links.importJSON(backup), 1)
    assert.equal(links.links.value.at(-1).target, 'weixin://')
    assert.equal(localStorage.getItem('scheme_history'), 'keep')
  } finally { mock.restore() }
})

test('危险协议、重复目标和错误版本的备份全部拒绝', () => {
  const mock = useFakeStorage()
  try {
    const links = useCommonLinks()
    links.load()
    const original = JSON.stringify(links.links.value)
    const data = JSON.parse(links.exportJSON())
    data.items[0].target = 'javascript:alert(1)'
    assert.throws(() => links.importJSON(data), /无效|危险/)
    data.items[0].target = 'weixin://'
    assert.throws(() => links.importJSON(data), /无效|重复/)
    data.items[0].target = 'obsidian://'
    data.version = 99
    assert.throws(() => links.importJSON(data), /格式或版本/)
    assert.equal(JSON.stringify(links.links.value), original)
  } finally { mock.restore() }
})


test('自定义图标可保存、修改与 JSON 往返，旧版不带 icon 的收藏仍有效', () => {
  const mock = useFakeStorage()
  try {
    const store = useCommonLinks()
    store.load()
    const icon = 'data:image/png;base64,iVBORw0KGgo='
    assert.equal(store.save({ id: 'obsidian', name: '笔记图标', target: 'obsidian://', icon }), true)
    assert.equal(store.links.value[0].icon, icon)
    assert.equal(store.save({ id: 'obsidian', name: '笔记应用', target: 'obsidian://' }), true)
    assert.equal(store.links.value[0].icon, icon)

    const exported = JSON.parse(store.exportJSON())
    assert.equal(exported.items[0].icon, icon)
    assert.equal(store.save({ id: 'obsidian', name: '笔记应用', target: 'obsidian://', icon: '' }), true)
    assert.equal(store.links.value[0].icon, undefined)
    assert.equal(store.remove('obsidian'), true)
    assert.deepEqual(store.inspectImport(exported), { count: 4, added: 1, duplicates: 3 })
    assert.equal(store.importJSON(exported), 1)
    assert.equal(store.links.value.at(-1).icon, icon)

    const reloaded = useCommonLinks()
    reloaded.load()
    assert.equal(reloaded.links.value.at(-1).icon, icon)
  } finally { mock.restore() }
})

test('拒绝恶意图标格式和过大的 data URL，失败不改变收藏', () => {
  const mock = useFakeStorage()
  try {
    const store = useCommonLinks()
    store.load()
    const original = store.exportJSON()
    for (const icon of [
      'data:image/svg+xml;base64,PHN2Zy8+',
      'https://example.com/icon.png',
      'data:image/png;base64,' + 'A'.repeat(33000),
      'data:text/html;base64,PHNjcmlwdD4=',
    ]) {
      assert.throws(() => store.save({ id: 'obsidian', name: '修改', target: 'obsidian://', icon }), /图标/)
      const imported = JSON.parse(original)
      imported.items[0].icon = icon
      assert.throws(() => store.importJSON(imported), /无效|危险/)
    }
    assert.equal(store.exportJSON().includes('"icon"'), false)
  } finally { mock.restore() }
})

test('自定义图标保存失败时原有列表和图标不变', () => {
  const mock = useFakeStorage()
  try {
    const store = useCommonLinks()
    store.load()
    const before = JSON.stringify(store.links.value)
    const original = localStorage.setItem
    localStorage.setItem = () => { throw new Error('QuotaExceededError') }
    assert.equal(store.save({
      id: 'obsidian', name: '尝试上传', target: 'obsidian://',
      icon: 'data:image/png;base64,iVBORw0KGgo=',
    }), false)
    assert.equal(JSON.stringify(store.links.value), before)
    localStorage.setItem = original
  } finally { mock.restore() }
})


test('一键置顶保持所有链接完整次序、图片不变，刷新后顺序持久化', () => {
  const mock = useFakeStorage()
  try {
    const store = useCommonLinks()
    store.load()
    const icon = 'data:image/png;base64,iVBORw0KGgo='
    assert.equal(store.save({ id: 'orpheus', name: '网易云音乐', target: 'orpheus://', icon }), true)
    assert.equal(store.pin('orpheus'), true)
    assert.deepEqual(store.links.value.map((item) => item.id), ['orpheus', 'obsidian', 'vscode', 'weixin'])
    assert.equal(store.links.value[0].icon, icon)
    assert.equal(store.pin('orpheus'), false)
    assert.equal(store.pin('missing'), false)
    const loaded = useCommonLinks()
    loaded.load()
    assert.deepEqual(loaded.links.value.map((item) => item.id), store.links.value.map((item) => item.id))
    assert.equal(loaded.links.value[0].icon, icon)
    assert.equal(JSON.parse(store.exportJSON()).items[0].id, 'orpheus')
  } finally { mock.restore() }
})

test('localStorage 写入失败时置顶不会改变内存、图标和原持久化内容', () => {
  const mock = useFakeStorage()
  try {
    const store = useCommonLinks()
    store.load()
    const before = JSON.stringify(store.links.value)
    const persisted = localStorage.getItem('s2u_common_links_v1')
    const originalSet = localStorage.setItem
    localStorage.setItem = () => { throw new Error('QuotaExceededError') }
    assert.equal(store.pin('weixin'), false)
    assert.equal(JSON.stringify(store.links.value), before)
    assert.equal(localStorage.getItem('s2u_common_links_v1'), persisted)
    assert.match(store.storageError.value, /保存失败/)
    localStorage.setItem = originalSet
    assert.equal(store.pin('weixin'), true)
    assert.equal(store.links.value[0].id, 'weixin')
  } finally { mock.restore() }
})

test('标签可保存、编辑、持久化和随 JSON 备份恢复', () => {
  const fake = useFakeStorage()
  try {
    const store = useCommonLinks()
    store.load()
    assert.equal(store.save({ name: '带标签链接', target: 'https://docs.example.com', tags: ['开发', '效率', '开发'] }), true)
    assert.deepEqual(store.links.value.at(-1).tags, ['开发', '效率'])
    assert.equal(store.save({ id: store.links.value.at(-1).id, name: '新版', target: 'https://docs.example.com', tags: ['笔记'] }), true)
    const exported = JSON.parse(store.exportJSON())
    assert.deepEqual(exported.items.at(-1).tags, ['笔记'])
    const reloaded = useCommonLinks()
    reloaded.load()
    assert.deepEqual(reloaded.links.value.at(-1).tags, ['笔记'])
    assert.equal(reloaded.remove(reloaded.links.value.at(-1).id), true)
    assert.equal(reloaded.importJSON(exported), 1)
    assert.deepEqual(reloaded.links.value.at(-1).tags, ['笔记'])
  } finally { fake.restore() }
})

test('非法标签被拒绝，不改变现有链接；旧版不带 tags 的 JSON 兼容', () => {
  const fake = useFakeStorage()
  try {
    const store = useCommonLinks()
    store.load()
    const original = JSON.stringify(store.links.value)
    assert.throws(() => store.save({ name: '错误标签', target: 'https://example.org', tags: ['x'.repeat(19)] }), /标签/)
    assert.throws(() => store.save({ name: '过多标签', target: 'https://example.org', tags: ['1','2','3','4','5','6'] }), /标签/)
    assert.equal(JSON.stringify(store.links.value), original)
    const previous = JSON.parse(store.exportJSON())
    assert.equal(previous.items.every((item) => !('tags' in item)), true)
  } finally { fake.restore() }
})
