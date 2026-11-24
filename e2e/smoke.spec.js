import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('首页渲染与特殊字符分享链接预览', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()
  await page.locator('#url').fill('https://example.com/path?q=100%25#章节')
  await expect(page.getByText('可以分享')).toBeVisible()
  await expect(page.locator('.preview-url')).toContainText('example.com')
  await page.getByRole('button', { name: '复制链接' }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(new URLSearchParams(new URL(copied).hash.slice(1)).get('target'))
    .toBe('https://example.com/path?q=100%25#%E7%AB%A0%E8%8A%82')
})


test('慢速帮助弹窗可取消，迟到的资源不会重新打开弹窗', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/assets/ShortcutHelp-*.js', async route => {
    await gate
    await route.continue()
  })
  try {
    await page.goto('/')
    await page.locator('#url').fill('https://example.com/draft')
    await page.getByRole('button', { name: '查看快捷键' }).click()
    const loading = page.getByRole('dialog', { name: '加载键盘快捷键' })
    await expect(loading.getByRole('status')).toContainText('正在加载')
    await loading.getByRole('button', { name: '取消' }).click()
    await expect(loading).toHaveCount(0)
    release()
    await expect(page.locator('#url')).toHaveValue('https://example.com/draft')
    await page.getByRole('tab', { name: /历史记录/ }).click()
    await expect(page.locator('#history-panel').getByText('还没有创建过链接')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: '查看快捷键' }).click()
    await expect(page.getByRole('dialog', { name: '键盘快捷键' })).toBeVisible()
  } finally { release() }
})

test('历史界面资源失败显示局部恢复，创建页输入仍保留', async ({ page }) => {
  await page.route('**/assets/HistoryWorkspace-*.js', route => route.abort())
  await page.goto('/')
  await page.locator('#url').fill('https://example.com/draft')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByRole('alert').filter({ hasText: '界面加载失败' })).toBeVisible()
  await expect(page.getByRole('button', { name: '重试加载' })).toBeVisible()
  await page.getByRole('tab', { name: /创建链接/ }).click()
  await expect(page.locator('#url')).toHaveValue('https://example.com/draft')
})

test('危险协议必须被拒绝且不得写入历史记录', async ({ page }) => {
  await page.goto('/')
  await page.locator('#url').fill('javascript:alert(1)')
  await page.getByRole('button', { name: '复制链接' }).click()
  await expect(page.getByRole('alert')).toContainText('不支持 javascript:')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByText('还没有创建过链接')).toBeVisible()
})

test('生成、复制、搜索与删除历史记录', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.locator('#url').fill('example.com/hello')
  await page.getByRole('button', { name: '复制链接' }).click()
  await expect(page.getByRole('button', { name: '已复制' })).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('#target=https%3A%2F%2Fexample.com%2Fhello')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.locator('#history-panel').getByText('https://example.com/hello')).toBeVisible()
  await page.getByRole('textbox', { name: '搜索历史记录' }).fill('not-found')
  await expect(page.getByText('没有找到匹配记录')).toBeVisible()
  await page.locator('.search-clear').click()
  await page.getByRole('button', { name: /删除 https:\/\/example.com\/hello/ }).click()
  await expect(page.getByText('还没有创建过链接')).toBeVisible()
})

test('模拟 Gist 同步不接触真实 Token/API', async ({ page }) => {
  let patched = 0
  let remoteData
  await page.route('https://api.github.com/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/user') {
      return route.fulfill({ json: { login: 'test-user' } })
    }
    if (url.pathname === '/gists' && request.method() === 'POST') {
      const body = request.postDataJSON()
      remoteData = JSON.parse(body.files['scheme-history.json'].content)
      return route.fulfill({ json: { id: 'abcde12345' } })
    }
    if (url.pathname === '/gists/abcde12345' && request.method() === 'GET') {
      return route.fulfill({ json: { public: false, owner: { login: 'test-user' }, files: { 'scheme-history.json': { content: JSON.stringify(remoteData) } } } })
    }
    if (url.pathname === '/gists/abcde12345' && request.method() === 'PATCH') {
      patched++
      remoteData = JSON.parse(request.postDataJSON().files['scheme-history.json'].content)
      return route.fulfill({ json: { id: 'abcde12345' } })
    }
    return route.fulfill({ status: 404, json: { message: 'Unexpected API request' } })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await page.getByRole('button', { name: '云端同步' }).click()
  await page.locator('#gist-token').fill('fake-token-for-test')
  await page.locator('#gist-mode').selectOption('new')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '连接 Gist' }).click()
  await expect(page.getByRole('button', { name: '立即同步' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: '已同步' })).toBeVisible()
  expect(patched).toBe(0)
  const stored = await page.evaluate(() => ({
    local: JSON.stringify(localStorage),
    token: sessionStorage.getItem('cloud_token_session'),
  }))
  expect(stored.token).toBe('fake-token-for-test')
  expect(stored.local).not.toContain('fake-token-for-test')
  await page.getByRole('button', { name: '断开连接' }).click()
  await expect(page.getByRole('button', { name: '连接 Gist' })).toBeVisible()
})


test('常用链接展示图标并可单独复制 Scheme 分享链接', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByRole('heading', { name: '常用链接' })).toBeVisible()
  await expect(page.locator('img[alt="Obsidian 图标"]')).toBeVisible()
  await expect(page.locator('img[alt="微信 图标"]')).toBeVisible()
  await expect(page.locator('img[alt="网易云音乐 图标"]')).toBeVisible()
  for (const app of ['Obsidian', '微信', '网易云音乐']) {
    const img = page.locator('img[alt="' + app + ' 图标"]')
    await expect.poll(() => img.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0)
  }
  await expect(page.getByRole('button', { name: '打开 Obsidian' })).toBeVisible()
  await page.getByRole('button', { name: '复制 Obsidian 分享链接' }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(new URLSearchParams(new URL(copied).hash.slice(1)).get('target')).toBe('obsidian://')
  await expect(page.getByRole('heading', { name: '常用链接' })).toBeVisible()
})

test('点击打开直接导航到保存的原始网址，而不经过 s2u 分享链接', async ({ page }) => {
  const destination = 'https://example.com/common-link-open?source=s2u#test'
  await page.route('https://example.com/common-link-open**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Opened directly</title><main>Opened directly</main>',
    }),
  )
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: /添加常用链接/ }).click()
  await page.getByPlaceholder('例如：我的 Obsidian 笔记库').fill('测试网站')
  await page.getByPlaceholder('obsidian:// 或 https://example.com').fill(destination)
  await page.getByRole('button', { name: '保存链接' }).click()
  await expect(page.getByRole('dialog', { name: '添加常用链接' })).not.toBeVisible()
  await page.getByRole('button', { name: '打开 测试网站' }).click()
  await expect(page).toHaveURL(destination)
  await expect(page.getByText('Opened directly')).toBeVisible()
})

test('自定义常用链接可添加、编辑、删除且刷新后仍保留', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: /添加常用链接/ }).click()
  await expect(page.getByRole('dialog', { name: '添加常用链接' })).toBeVisible()
  await page.getByPlaceholder('例如：我的 Obsidian 笔记库').fill('我的笔记')
  await page.getByPlaceholder('obsidian:// 或 https://example.com').fill('obsidian://open?vault=notes')
  await page.getByRole('button', { name: '保存链接' }).click()
  await expect(page.getByText('我的笔记')).toBeVisible()
  await page.reload()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByText('我的笔记')).toBeVisible()
  await page.getByRole('button', { name: '编辑 我的笔记' }).click()
  await expect(page.getByRole('dialog', { name: '编辑常用链接' })).toBeVisible()
  await page.getByPlaceholder('例如：我的 Obsidian 笔记库').fill('资料库')
  await page.getByRole('button', { name: '保存链接' }).click()
  await expect(page.getByText('资料库')).toBeVisible()
  await page.getByRole('button', { name: '复制 资料库 分享链接' }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('obsidian%3A%2F%2Fopen')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除 资料库' }).click()
  await expect(page.getByText('资料库')).toHaveCount(0)
})

test('常用链接拒绝危险协议且不能影响历史记录', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: /添加常用链接/ }).click()
  await page.getByPlaceholder('例如：我的 Obsidian 笔记库').fill('危险链接')
  await page.getByPlaceholder('obsidian:// 或 https://example.com').fill('javascript:alert(1)')
  await page.getByRole('button', { name: '保存链接' }).click()
  await expect(page.getByRole('alert')).toContainText('不支持 javascript:')
  const editor = page.getByRole('dialog', { name: '添加常用链接' })
  await expect(editor).toBeVisible()
  await editor.getByRole('button', { name: '取消' }).click()
  await expect(editor).not.toBeVisible()
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByText('还没有创建过链接')).toBeVisible()
})

test('320px 移动端页签不溢出且深色模式仍可使用常用链接', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByRole('heading', { name: '常用链接' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  await page.getByRole('button', { name: '切换到深色模式' }).click()
  await expect(page.getByRole('button', { name: '切换到浅色模式' })).toBeVisible()
  await expect(page.getByRole('button', { name: '复制 Obsidian 分享链接' })).toBeVisible()
})


test('应用名称与 URL 位于图标右侧，编辑弹窗支持 ESC 和取消', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  const firstCard = page.locator('.common-card').first()
  const image = await firstCard.locator('.app-icon').boundingBox()
  const title = await firstCard.locator('.card-meta strong').boundingBox()
  const url = await firstCard.locator('.card-meta > span').boundingBox()
  expect(image).not.toBeNull()
  expect(title).not.toBeNull()
  expect(url).not.toBeNull()
  expect(title.x).toBeGreaterThan(image.x + image.width - 1)
  expect(url.x).toBeGreaterThan(image.x + image.width - 1)

  await page.getByRole('button', { name: '编辑 Obsidian' }).click()
  const dialog = page.getByRole('dialog', { name: '编辑常用链接' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByPlaceholder('例如：我的 Obsidian 笔记库')).toHaveValue('Obsidian')
  await expect(dialog.getByPlaceholder('obsidian:// 或 https://example.com')).toHaveValue('obsidian://')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: '编辑 Obsidian' }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '取消' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(firstCard.locator('.card-meta strong')).toHaveText('Obsidian')
})

test('320px 手机视口中编辑弹窗不超出边界', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: '编辑 Obsidian' }).click()
  const dialog = page.getByRole('dialog', { name: '编辑常用链接' })
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(321)
  await dialog.getByRole('button', { name: '关闭弹窗' }).click()
  await expect(dialog).not.toBeVisible()
})


test('编辑弹窗快捷键不触发隐藏创建页复制或历史页切换', async ({ page }) => {
  await page.goto('/')
  await page.locator('#url').fill('https://example.com/should-not-be-copied')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: '编辑 Obsidian' }).click()
  const modal = page.getByRole('dialog', { name: '编辑常用链接' })
  await expect(modal).toBeVisible()
  await modal.getByRole('button', { name: '关闭弹窗' }).focus()
  await page.keyboard.press('Control+Enter')
  await page.keyboard.press('h')
  await expect(modal).toBeVisible()
  await expect(page.getByRole('tab', { name: /常用链接/ })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Escape')
  await expect(modal).not.toBeVisible()
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByText('还没有创建过链接')).toBeVisible()
})

test('本地历史落盘失败时 Gist 合并停止，绝不 PATCH 远端', async ({ page }) => {
  let patchCount = 0
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'scheme_history') {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      return original.call(this, key, value)
    }
  })
  await page.route('https://api.github.com/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname === '/user') return route.fulfill({ json: { login: 'test-user' } })
    if (url.pathname === '/gists' && method === 'POST') {
      return route.fulfill({ json: { id: 'abcde12346' } })
    }
    if (url.pathname === '/gists/abcde12346' && method === 'GET') {
      return route.fulfill({ json: {
        public: false, owner: { login: 'test-user' },
        files: {
          'scheme-history.json': {
            content: JSON.stringify({
              format: 's2u-history',
              version: 2,
              records: [{ scheme: 'https://example.com/', count: 1, recently: Date.now() }],
              tombstones: [],
            }),
          },
        },
      } })
    }
    if (method === 'PATCH') {
      patchCount++
      return route.fulfill({ json: { id: 'abcde12346' } })
    }
    return route.fulfill({ status: 404, json: { message: 'unexpected request' } })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await page.getByRole('button', { name: '云端同步' }).click()
  await page.locator('#gist-token').fill('fake-token-for-test')
  await page.locator('#gist-mode').selectOption('new')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '连接 Gist' }).click()
  // 首次访问时历史工作区需按需下载，云端同步错误提示允许完整异步流程结束。
  await expect(page.getByRole('alert')).toContainText('本地存储空间不足', { timeout: 12000 })
  expect(patchCount).toBe(0)
})


test('连接后远端被另一设备修改时不会覆盖 Gist', async ({ page }) => {
  let reads = 0
  let patches = 0
  const history = (url) => JSON.stringify({
    format: 's2u-history', version: 2,
    records: [{ scheme: url, count: 1, recently: Date.now() }],
    tombstones: [],
  })
  await page.route('https://api.github.com/**', (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (pathname === '/user') return route.fulfill({ json: { login: 'test-user' } })
    if (pathname === '/gists' && request.method() === 'POST') {
      return route.fulfill({ json: { id: 'abcde12347' } })
    }
    if (pathname === '/gists/abcde12347' && request.method() === 'GET') {
      reads++
      return route.fulfill({ json: { public: false, owner: { login: 'test-user' }, files: {
        'scheme-history.json': { content: history(reads > 1 ? 'https://external.example/new' : 'https://initial.example/') },
      } } })
    }
    if (request.method() === 'PATCH') patches++
    return route.fulfill({ status: 200, json: { id: 'abcde12347' } })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await page.getByRole('button', { name: '云端同步' }).click()
  await page.locator('#gist-token').fill('fake-token-for-test')
  await page.locator('#gist-mode').selectOption('new')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '连接 Gist' }).click()
  await expect(page.getByRole('alert')).toContainText('已被其它设备修改')
  expect(patches).toBe(0)
})


test('常用链接可以搜索、持久化排序及安全追加导入 JSON', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('searchbox', { name: '搜索常用链接' }).fill('obsidian')
  await expect(page.locator('.common-card')).toHaveCount(1)
  await page.getByRole('searchbox', { name: '搜索常用链接' }).fill('')
  await page.getByRole('button', { name: '下移 Obsidian' }).click()
  await expect(page.locator('.common-card').first().locator('.card-meta strong')).toHaveText('Visual Studio Code')
  await page.reload()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.locator('.common-card').first().locator('.card-meta strong')).toHaveText('Visual Studio Code')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^s2u-common-links-.*\.json$/)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByLabel('选择常用链接备份文件').setInputFiles({
    name: 'links.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      format: 's2u-common-links',
      version: 1,
      items: [{ id: 'import-safe', name: '我的网页', target: 'https://example.com/import' }],
    })),
  })
  await expect(page.getByText('我的网页')).toBeVisible()
})

test('未知自定义 Scheme 打开前提示风险，取消不会跳转，可复制原始地址', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: /添加常用链接/ }).click()
  await page.getByPlaceholder('例如：我的 Obsidian 笔记库').fill('陌生应用')
  await page.getByPlaceholder('obsidian:// 或 https://example.com').fill('unknownapp://open?x=1')
  await page.getByRole('button', { name: '保存链接' }).click()
  await page.getByRole('button', { name: '打开 陌生应用' }).click()
  const dialog = page.getByRole('dialog', { name: '打开未知应用协议？' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('unknownapp://open?x=1')
  await dialog.getByRole('button', { name: '复制原始链接' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('unknownapp://open?x=1')
  await dialog.getByRole('button', { name: '取消' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page).toHaveURL('http://127.0.0.1:4173/')
})

test('已知应用可复制原始 Scheme，危险 Scheme 不能添加', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: '复制 Obsidian 原始链接' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('obsidian://')
  await page.getByRole('button', { name: /添加常用链接/ }).click()
  await page.getByPlaceholder('例如：我的 Obsidian 笔记库').fill('不安全')
  await page.getByPlaceholder('obsidian:// 或 https://example.com').fill('file:///etc/passwd')
  await page.getByRole('button', { name: '保存链接' }).click()
  await expect(page.getByRole('alert')).toContainText('不支持 file:')
})


test('上传应用图标后刷新持久化，并可携带图标导出及重新导入', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: '编辑 Obsidian' }).click()
  const editor = page.getByRole('dialog', { name: '编辑常用链接' })
  await editor.getByLabel('上传应用图标').setInputFiles('public/icons/common-obsidian.png')
  await expect.poll(async () =>
    editor.locator('img[alt="应用图标预览"]').getAttribute('src')
  ).toMatch(/^data:image\/(png|webp);base64,/)
  await editor.getByRole('button', { name: '保存链接' }).click()
  await expect(editor).not.toBeVisible()
  await expect(page.locator('img[alt="Obsidian 图标"]')).toHaveAttribute('src', /^data:image\/(png|webp);base64,/)
  await page.reload()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.locator('img[alt="Obsidian 图标"]')).toHaveAttribute('src', /^data:image\/(png|webp);base64,/)

  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 JSON' }).click()
  const backupFile = await downloaded
  const backup = JSON.parse(await readFile(await backupFile.path(), 'utf8'))
  expect(backup.items.find((item) => item.id === 'obsidian').icon).toMatch(/^data:image\/(png|webp);base64,/)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除 Obsidian' }).click()
  await expect(page.getByRole('button', { name: '打开 Obsidian' })).not.toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByLabel('选择常用链接备份文件').setInputFiles({
    name: 's2u-icons.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  await expect(page.locator('img[alt="Obsidian 图标"]')).toHaveAttribute('src', /^data:image\/(png|webp);base64,/)
})

test('上传 SVG 文件时拒绝并保留原应用图标', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: '编辑 Obsidian' }).click()
  const editor = page.getByRole('dialog', { name: '编辑常用链接' })
  await editor.getByLabel('上传应用图标').setInputFiles({
    name: 'danger.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
  })
  await expect(editor.getByRole('alert')).toContainText('只允许 PNG、JPEG 或 WebP')
  await expect(editor.locator('img[alt="应用图标预览"]')).toHaveAttribute('src', /\/icons\/common-obsidian\.png/)
  await editor.getByRole('button', { name: '取消' }).click()
  await expect(page.locator('img[alt="Obsidian 图标"]')).toHaveAttribute('src', /\/icons\/common-obsidian\.png/)
})


test('搜索筛选的卡片仍可一键置顶，刷新后首位保持且不会更改其它顺序', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('searchbox', { name: '搜索常用链接' }).fill('weixin')
  // 这里名称为「微信」，使用 URL Scheme 搜索验证筛选后仍可操作。
  await expect(page.locator('.common-card')).toHaveCount(1)
  await page.getByRole('button', { name: '置顶 微信' }).click()
  await expect(page.getByRole('button', { name: '置顶 微信' })).not.toBeVisible()
  await page.getByRole('searchbox', { name: '搜索常用链接' }).fill('')
  await expect(page.locator('.common-card').first().locator('.card-meta strong')).toHaveText('微信')
  await expect(page.locator('.common-card').nth(1).locator('.card-meta strong')).toHaveText('Obsidian')
  await page.reload()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.locator('.common-card').first().locator('.card-meta strong')).toHaveText('微信')
})

test('320px 窄屏下置顶按钮可见，卡片不会横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  const button = page.getByRole('button', { name: '置顶 Visual Studio Code' })
  await expect(button).toBeVisible()
  const box = await button.boundingBox()
  expect(box).not.toBeNull()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(321)
  await button.click()
  await expect(page.locator('.common-card').first().locator('.card-meta strong')).toHaveText('Visual Studio Code')
})


test('三个标签的滑块连续移动，快速切换后面板和方向一致', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('tablist', { name: '页面模式' })
  const tabs = nav.getByRole('tab')
  await expect(tabs).toHaveCount(3)
  await expect(nav).toHaveClass(/tabs-ready/)
  const indicatorX = () => nav.evaluate((node) => {
    const style = getComputedStyle(node, '::before')
    return new DOMMatrixReadOnly(style.transform).m41
  })
  const initialX = await indicatorX()

  await tabs.nth(2).click()
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.app-shell')).toHaveAttribute('data-switch-direction', 'forward')
  await expect(page.getByRole('heading', { name: '常用链接' })).toBeVisible()
  await expect.poll(indicatorX).toBeGreaterThan(initialX + 30)

  await tabs.nth(1).click()
  await expect(page.locator('.app-shell')).toHaveAttribute('data-switch-direction', 'backward')
  await tabs.nth(0).click()
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()
  // 字体加载会改变按钮宽度；始终与当前 DOM 布局位置比较，而非首屏旧坐标。
  await expect.poll(async () => {
    const currentX = await tabs.nth(0).evaluate((button) => button.offsetLeft)
    return Math.abs((await indicatorX()) - currentX)
  }).toBeLessThan(1.5)
  await expect(page.locator('.content-card > .panel-leave-active')).toHaveCount(0)
  await expect(page.locator('.content-card')).toHaveCount(1)
})

test('标签支持左右方向键与 Home/End，移除底部说明但原快捷键仍生效', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.workspace-footer')).toHaveCount(0)
  await expect(page.getByLabel('快捷键提示')).toHaveCount(0)
  const create = page.getByRole('tab', { name: /创建链接/ })
  const history = page.getByRole('tab', { name: /历史记录/ })
  const common = page.getByRole('tab', { name: /常用链接/ })
  await create.focus()
  await page.keyboard.press('ArrowRight')
  await expect(history).toBeFocused()
  await expect(history).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(common).toBeFocused()
  await page.keyboard.press('Home')
  await expect(create).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(common).toBeFocused()
  await common.press('h')
  await expect(history).toHaveAttribute('aria-selected', 'true')
  await history.press('h')
  await expect(create).toHaveAttribute('aria-selected', 'true')
})

test('减少动态效果时标签指示器与面板无运动过渡', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const nav = page.getByRole('tablist', { name: '页面模式' })
  await expect(nav).toHaveClass(/tabs-ready/)
  const duration = await nav.evaluate((node) => getComputedStyle(node, '::before').transitionDuration)
  expect(duration.split(',').every((entry) => parseFloat(entry) < 0.001)).toBe(true)
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByRole('heading', { name: '常用链接' })).toBeVisible()
  await page.getByRole('tab', { name: /创建链接/ }).click()
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()
})

test('320px 窄屏下连续切换没有横向溢出或双面板残留', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  for (const name of ['常用链接', '历史记录', '创建链接', '常用链接']) {
    await page.getByRole('tab', { name: new RegExp(name) }).click()
    await expect(page.locator('.content-card > [role="tabpanel"]')).toHaveCount(1, { timeout: 2000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  }
})


test('退场内容在交叠动画期间不可交互，快速反向切换会恢复活动面板', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.locator('#common-panel')).toBeVisible()
  await page.getByRole('tab', { name: /历史记录/ }).click()
  const leaving = page.locator('#common-panel')
  // 退场节点可存在一小段时间，但不能再成为可聚焦/可读的交互区域。
  if (await leaving.count()) {
    await expect(leaving).toHaveAttribute('aria-hidden', 'true')
    await expect(leaving).toHaveAttribute('inert', '')
  }
  await page.getByRole('tab', { name: /常用链接/ }).click()
  const active = page.locator('#common-panel')
  await expect(active).toBeVisible()
  await expect(active).not.toHaveAttribute('aria-hidden', 'true')
  await expect(active).not.toHaveAttribute('inert', '')
  await expect(page.getByRole('button', { name: '打开 Obsidian' })).toBeVisible()
})


test('冷启动不加载非首屏面板和第三方字体，首次访问后按需下载', async ({ page }) => {
  const resources = []
  page.on('request', (request) => resources.push(request.url()))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(resources.some((url) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url))).toBe(false)
  expect(resources.some((url) => /(?:HistoryWorkspace|CommonLinksPanel)-[^/]+\.js/.test(url))).toBe(false)
  expect(resources.some((url) => url.includes('/icons/common-obsidian.png'))).toBe(false)

  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByRole('heading', { name: '历史记录' })).toBeVisible()
  expect(resources.some((url) => /HistoryWorkspace-[^/]+\.js/.test(url))).toBe(true)
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByRole('heading', { name: '常用链接' })).toBeVisible()
  expect(resources.some((url) => /CommonLinksPanel-[^/]+\.js/.test(url))).toBe(true)
})

test('非默认页签首次加载及快速反向切换不破坏可用性', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('tab', { name: /创建链接/ }).click()
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByRole('button', { name: '打开 Obsidian' })).toBeVisible()
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByRole('heading', { name: '历史记录' })).toBeVisible()
  await page.getByRole('button', { name: '云端同步' }).click()
  await expect(page.getByRole('button', { name: '连接 Gist' })).toBeVisible()
})

test('常用链接标签可编辑、筛选并在刷新后保留', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: /添加常用链接/ }).click()
  await page.getByPlaceholder('例如：我的 Obsidian 笔记库').fill('测试标签收藏')
  await page.getByPlaceholder('obsidian:// 或 https://example.com').fill('https://example.com/tags')
  await page.getByRole('textbox', { name: '分类标签' }).fill('开发, 笔记')
  await page.getByRole('button', { name: '保存链接' }).click()
  await expect(page.getByRole('button', { name: '笔记', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '笔记', exact: true }).click()
  await expect(page.locator('.common-card')).toHaveCount(1)
  await expect(page.locator('.common-card').first()).toContainText('测试标签收藏')
  await page.reload()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.locator('.common-card').filter({ hasText: '测试标签收藏' })).toContainText('开发')
})

test('删除筛选标签最后一条收藏时自动返回全部列表', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('s2u_common_links_v1', JSON.stringify({
    version: 1,
    items: [
      { id: 'only', name: '唯一收藏', target: 'https://unique.example', tags: ['唯一标签'] },
      { id: 'other', name: '普通收藏', target: 'https://other.example' },
    ],
  })))
  await page.reload()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: '唯一标签', exact: true }).click()
  await expect(page.locator('.common-card')).toHaveCount(1)
  page.once('dialog', async (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除 唯一收藏' }).click()
  await expect(page.locator('.common-card')).toHaveCount(1)
  await expect(page.locator('.common-card').first()).toContainText('普通收藏')
  await expect(page.getByRole('button', { name: '唯一标签', exact: true })).toHaveCount(0)
})

test('Ctrl+K 命令面板支持搜索与键盘导航，并在 Esc 关闭后恢复主界面', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: '快捷启动命令面板' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('searchbox', { name: '搜索命令' }).fill('Obsidian')
  await expect(dialog.getByRole('option')).toHaveCount(1)
  await expect(dialog.getByRole('option').first()).toContainText('Obsidian')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('命令面板未知自定义协议先确认，不会立即打开', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('s2u_common_links_v1', JSON.stringify({
    version: 1, items: [{ id: 'unsafe-but-valid', name: '测试未知应用', target: 'exampleapp://launch' }],
  })))
  await page.reload()
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: '快捷启动命令面板' })
  await dialog.getByRole('searchbox', { name: '搜索命令' }).fill('测试未知应用')
  await page.keyboard.press('Enter')
  await expect(dialog.getByText('确认打开未知应用协议？')).toBeVisible()
  await dialog.getByRole('button', { name: '返回' }).click()
  await expect(dialog.getByRole('option').first()).toContainText('测试未知应用')
})

test('命令面板方向键移动时更新辅助技术的选中项', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: '快捷启动命令面板' })
  const input = dialog.getByRole('searchbox', { name: '搜索命令' })
  await expect(input).toHaveAttribute('aria-activedescendant', 'command-item-0')
  await input.press('ArrowDown')
  await expect(input).toHaveAttribute('aria-activedescendant', 'command-item-1')
  await expect(dialog.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true')
  await input.press('ArrowUp')
  await expect(input).toHaveAttribute('aria-activedescendant', 'command-item-0')
})

test('命令面板按标签多关键词和来源筛选，外壳稳定并恢复焦点',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('s2u_common_links_v1',JSON.stringify({version:1,items:[
      {id:'editor',name:'Visual Studio Code',target:'vscode://',tags:['开发']},
      {id:'notes',name:'Obsidian',target:'obsidian://',tags:['笔记']}
    ]}))
    localStorage.setItem('scheme_history',JSON.stringify({format:'s2u-history',version:2,records:[{scheme:'https://history.example/',count:1,recently:1000,updatedAt:1000}],tombstones:[]}))
  })
  await page.setViewportSize({width:320,height:740})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  const trigger=page.getByRole('button',{name:'打开快捷启动命令面板'})
  await trigger.click()
  const dialog=page.getByRole('dialog',{name:'快捷启动命令面板'})
  const input=dialog.getByRole('searchbox',{name:'搜索命令'})
  await expect(input).toBeFocused()
  const before=await dialog.boundingBox()
  await input.fill('visual 开发')
  await expect(dialog.getByRole('option')).toHaveCount(1)
  await expect(dialog.getByRole('option').first()).toContainText('Visual Studio Code')
  await input.fill('')
  await dialog.getByRole('button',{name:'历史记录',exact:true}).click()
  await expect(dialog.getByRole('option')).toHaveCount(1)
  await expect(dialog.getByRole('option').first()).toContainText('https://history.example/')
  await input.fill('missing')
  await expect(dialog.getByText('没有找到匹配项')).toBeVisible()
  const after=await dialog.boundingBox()
  expect(Math.abs(before.height-after.height)).toBeLessThan(1)
  expect(Math.abs(before.y-after.y)).toBeLessThan(1)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('二维码分享本地生成，保留特殊字符分享链接，并能关闭弹窗', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('weixin://open 或 example.com').fill('obsidian://open?vault=笔记&file=A%20B')
  await page.getByRole('button', { name: '生成分享二维码' }).click()
  const dialog = page.getByRole('dialog', { name: '分享二维码' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('canvas')).toBeVisible()
  await expect(dialog.locator('canvas')).toHaveJSProperty('width', 288)
  await expect(dialog.locator('.qr-share-url')).toContainText('target=')
  await expect(dialog.locator('.qr-share-url')).toContainText('%E7%AC%94')
  await expect(dialog.getByRole('button', { name: '保存 PNG' })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('二维码过长时给出错误提示而不产生空白下载', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('weixin://open 或 example.com').fill('https://example.com/?q=' + 'x'.repeat(3500))
  await page.getByRole('button', { name: '生成分享二维码' }).click()
  const dialog = page.getByRole('dialog', { name: '分享二维码' })
  await expect(dialog.getByRole('alert')).toContainText('太长')
  await expect(dialog.getByRole('button', { name: '保存 PNG' })).toBeDisabled()
})

test('二维码编码后生成非空黑白图片，并能下载 PNG', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('weixin://open 或 example.com').fill('https://example.com/scan-test')
  await page.getByRole('button', { name: '生成分享二维码' }).click()
  const modal = page.getByRole('dialog', { name: '分享二维码' })
  const save = modal.getByRole('button', { name: '保存 PNG' })
  await expect(save).toBeEnabled()
  const colors = await modal.locator('canvas').evaluate((canvas) => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    let dark = 0
    let light = 0
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue
      if (pixels[i] < 128) dark++
      if (pixels[i] > 240) light++
    }
    return { dark, light }
  })
  expect(colors.dark).toBeGreaterThan(100)
  expect(colors.light).toBeGreaterThan(100)
  const downloadPromise = page.waitForEvent('download')
  await save.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('s2u-share-qr.png')
})

test('帮助按钮展示快捷键，Esc 后焦点回到按钮', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '查看快捷键' }).click()
  const dialog = page.getByRole('dialog', { name: '键盘快捷键' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('复制当前分享链接')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: '查看快捷键' })).toBeFocused()
})

test('问号快捷键不会在正在输入目标网址时抢占焦点', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('weixin://open 或 example.com').focus()
  await page.keyboard.type('?')
  await expect(page.getByRole('dialog', { name: '键盘快捷键' })).not.toBeVisible()
  await page.getByPlaceholder('weixin://open 或 example.com').blur()
  await page.locator('.app-shell').focus()
  await page.keyboard.type('?')
  await expect(page.getByRole('dialog', { name: '键盘快捷键' })).toBeVisible()
})

test('快捷键帮助包含已发布命令面板的 Ctrl/Cmd+K 说明', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '查看快捷键' }).click()
  const dialog = page.getByRole('dialog', { name: '键盘快捷键' })
  await expect(dialog).toContainText('打开快捷启动命令面板')
  await expect(dialog).toContainText('K')
})

test('右上角快捷启动保留功能，首页冗余介绍文案已移除', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.workspace-intro')).toHaveCount(0)
  await expect(page.getByText('LOCAL-FIRST LINK WORKSPACE')).toHaveCount(0)
  await expect(page.getByText('让每一个应用链接')).toHaveCount(0)
  const launch = page.getByRole('button', { name: '打开快捷启动命令面板' })
  await expect(launch).toBeVisible()
  await expect(page.locator('.app-header .header-actions').getByRole('button', { name: '打开快捷启动命令面板' })).toBeVisible()
  await page.getByRole('button', { name: '填入Obsidian示例' }).click()
  await expect(page.locator('#url')).toHaveValue('obsidian://open')
  await expect(page.locator('#url')).toBeFocused()
  await expect(page.getByRole('button', { name: '填入Obsidian示例' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByText('还没有创建过链接')).toBeVisible()
  await page.getByRole('button', { name: '打开快捷启动命令面板' }).click()
  await expect(page.getByRole('dialog', { name: '快捷启动命令面板' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '快捷启动命令面板' })).not.toBeVisible()
})

test('快速填入示例可清除错误状态，保留既有复制流程', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.locator('#url').fill('javascript:alert(1)')
  await page.getByRole('button', { name: '复制链接' }).click()
  await expect(page.getByRole('alert')).toContainText('不支持 javascript:')
  await page.getByRole('button', { name: '填入网页示例' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('#url')).toHaveValue('https://example.com')
  await page.getByRole('button', { name: '复制链接' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('#target=https%3A%2F%2Fexample.com%2F')
})

test('320/375px 下新工作区和结果预览无可见横向溢出', async ({ page }) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 760 })
    await page.goto('/')
    await page.getByRole('button', { name: '填入网页示例' }).click()
    await expect(page.locator('.preview-card')).toBeVisible()
    const clipped = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth
      const selectors = ['.app-header', '.header-actions', '.launch-trigger', '.workspace', '.mode-tabs', '.content-card',
        '.url-input-panel', '.input-row', '.preview-card', '.preview-actions', '.starter-links']
      return selectors.flatMap((selector) => [...document.querySelectorAll(selector)].filter((node) => {
        const r = node.getBoundingClientRect()
        return r.left < -1 || r.right > viewport + 1
      }).map(() => selector))
    })
    expect(clipped).toEqual([])
    await page.getByRole('tab', { name: /常用链接/ }).click()
    await expect(page.getByRole('heading', { name: '常用链接' })).toBeVisible()
    const cards = await page.locator('.common-card').evaluateAll((nodes) =>
      nodes.every((node) => {
        const r = node.getBoundingClientRect()
        return r.left >= -1 && r.right <= document.documentElement.clientWidth + 1
      }))
    expect(cards).toBe(true)
  }
})

test('暗色模式与减少动态效果下仍保留可见的操作入口', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: '切换到深色模式' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: '打开快捷启动命令面板' })).toBeVisible()
  const style = await page.locator('.launch-trigger').evaluate((node) => ({
    bg: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
    transition: getComputedStyle(node).transitionDuration,
  }))
  expect(style.bg).not.toBe('rgba(0, 0, 0, 0)')
  expect(style.color).not.toBe(style.bg)
  await page.getByRole('button', { name: '填入网页示例' }).click()
  await expect(page.getByRole('button', { name: '生成分享二维码' })).toBeVisible()
})

test('常用链接卡片管理操作仅在鼠标悬停或卡片内获得键盘焦点时显现', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  const cards = page.locator('.common-card')
  const first = cards.first()
  const second = cards.nth(1)
  await page.mouse.move(1, 1)
  await expect(first.locator('.card-actions')).toHaveCSS('opacity', '0')
  await expect(second.locator('.card-actions')).toHaveCSS('opacity', '0')
  // 主要使用操作不折叠；只隐藏管理工具条。
  await expect(first.getByRole('button', { name: '打开 Obsidian' })).toBeVisible()
  await expect(first.getByRole('button', { name: '复制 Obsidian 分享链接' })).toBeVisible()

  await first.hover()
  await expect(first.locator('.card-actions')).toHaveCSS('opacity', '1')
  await expect(second.locator('.card-actions')).toHaveCSS('opacity', '0')
  await page.mouse.move(1, 1)
  await expect(first.locator('.card-actions')).toHaveCSS('opacity', '0')

  // 可通过键盘 Tab 获取工具按钮，即使悬停前处于透明状态。
  await first.getByRole('button', { name: '编辑 Obsidian' }).focus()
  await expect(first.locator('.card-actions')).toHaveCSS('opacity', '1')
  await expect(first.getByRole('button', { name: '编辑 Obsidian' })).toBeFocused()
})

test('触屏设备常用链接卡片管理操作始终可用', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  try {
    await page.goto('/')
    await page.getByRole('tab', { name: /常用链接/ }).click()
    const card = page.locator('.common-card').filter({ hasText: 'Visual Studio Code' }).first()
    await expect(card).toBeVisible()
    const pointer = await page.evaluate(() =>
      matchMedia('(hover: none)').matches || matchMedia('(pointer: coarse)').matches)
    expect(pointer).toBe(true)
    await expect(card.locator('.card-actions')).toHaveCSS('opacity', '1')
    await expect(card.getByRole('button', { name: '置顶 Visual Studio Code' })).toBeVisible()
    await card.getByRole('button', { name: '置顶 Visual Studio Code' }).click()
    await expect(page.locator('.common-card').first().locator('.card-meta strong')).toHaveText('Visual Studio Code')
  } finally {
    await context.close()
  }
})

test('快捷启动在 320/375px 手机宽度仍位于右上角且可点开', async ({ page }) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 740 })
    await page.goto('/')
    const header = page.locator('.app-header')
    const button = header.getByRole('button', { name: '打开快捷启动命令面板' })
    await expect(button).toBeVisible()
    await expect(page.locator('.workspace-intro')).toHaveCount(0)
    const geometry = await page.evaluate(() => {
      const header = document.querySelector('.app-header').getBoundingClientRect()
      const trigger = document.querySelector('.app-header .launch-trigger').getBoundingClientRect()
      const tools = document.querySelector('.app-header .header-actions').getBoundingClientRect()
      return { viewport: document.documentElement.clientWidth, headerLeft: header.left,
        headerRight: header.right, triggerLeft: trigger.left, triggerRight: trigger.right,
        toolsRight: tools.right }
    })
    expect(geometry.headerLeft).toBeGreaterThanOrEqual(0)
    expect(geometry.headerRight).toBeLessThanOrEqual(geometry.viewport + 1)
    expect(geometry.triggerLeft).toBeGreaterThan(geometry.headerLeft)
    expect(geometry.triggerRight).toBeLessThanOrEqual(geometry.viewport + 1)
    expect(geometry.toolsRight).toBeLessThanOrEqual(geometry.viewport + 1)
    await button.click()
    await expect(page.getByRole('dialog', { name: '快捷启动命令面板' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '快捷启动命令面板' })).not.toBeVisible()
  }
})

test('顶部导航与工作区页签在桌面及移动端左右对齐', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  for (const width of [320, 375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 800 })
    const bounds = await page.evaluate(() => {
      const header = document.querySelector('.app-header').getBoundingClientRect()
      const workspaceHead = document.querySelector('.workspace-head').getBoundingClientRect()
      return {
        leftDelta: Math.abs(header.left - workspaceHead.left),
        rightDelta: Math.abs(header.right - workspaceHead.right),
        widthDelta: Math.abs(header.width - workspaceHead.width),
      }
    })
    expect(bounds.leftDelta).toBeLessThanOrEqual(1)
    expect(bounds.rightDelta).toBeLessThanOrEqual(1)
    expect(bounds.widthDelta).toBeLessThanOrEqual(1)
  }
})


test('云同步是独立弹窗，支持全局入口、窄屏、Escape 和焦点恢复', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: '打开云同步设置' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '云端同步' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('#create-link-title')).toBeVisible()
  const rect = await dialog.boundingBox()
  expect(rect.x).toBeGreaterThanOrEqual(0)
  expect(rect.x + rect.width).toBeLessThanOrEqual(321)
  await dialog.getByRole('button', { name: '同步设置' }).click()
  await expect(dialog.getByLabel('自动同步')).toBeChecked()
  await dialog.getByLabel('自动同步').uncheck()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await dialog.getByRole('button', { name: '同步设置' }).click()
  await expect(dialog.getByLabel('自动同步')).not.toBeChecked()
  await dialog.getByRole('button', { name: '关闭云端同步' }).click()
  await expect(dialog).toHaveCount(0)
})


test('Token 创建向导默认折叠，只提供最小 Gist 权限入口', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  await page.getByRole('button', { name: '打开云同步设置' }).click()
  const dialog = page.getByRole('dialog', { name: '云端同步' })
  const link = dialog.getByRole('link', { name: '创建最小权限 Token' })
  const url = new URL(await link.getAttribute('href'))
  expect(url.origin + url.pathname).toBe('https://github.com/settings/personal-access-tokens/new')
  expect(url.searchParams.get('gists')).toBe('write')
  expect([...url.searchParams.keys()].sort()).toEqual(['description','expires_in','gists','name'])
  const guide = dialog.locator('.token-guide')
  await expect(guide).not.toHaveAttribute('open', '')
  await guide.locator('summary').click()
  await expect(guide).toHaveAttribute('open', '')
  const classic = new URL(await dialog.getByRole('link', { name: '创建 Classic Token' }).getAttribute('href'))
  expect(classic.searchParams.get('scopes')).toBe('gist')
  await expect(dialog.getByText('Gists', { exact: true })).toBeVisible()
  const overflow = await dialog.evaluate(node => node.scrollWidth - node.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await guide.locator('summary').click()
  await expect(dialog.locator('#gist-token')).toBeVisible()
})


test('云端同步页签共用滑动胶囊且外壳不随内容改变',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  for(const width of [1280,320]){
    await page.setViewportSize({width,height:740})
    await page.getByRole('button',{name:'打开云同步设置'}).click()
    const dialog=page.getByRole('dialog',{name:'云端同步'})
    const nav=dialog.locator('.cloud-tabs')
    await expect(nav).toHaveClass(/tabs-ready/)
    const original=await dialog.boundingBox()
    const header=await nav.boundingBox()
    for(const name of ['同步设置','备份恢复','连接']){
      await nav.getByRole('button',{name,exact:true}).click()
      await expect.poll(()=>nav.evaluate(node=>{
        const selected=node.querySelector('[aria-pressed="true"]')
        return Math.abs(new DOMMatrixReadOnly(getComputedStyle(node,'::before').transform).m41-selected.offsetLeft)
      })).toBeLessThan(2)
      const rect=await dialog.boundingBox(), next=await nav.boundingBox()
      expect(Math.abs(rect.y-original.y)).toBeLessThan(1)
      expect(Math.abs(rect.height-original.height)).toBeLessThan(1)
      expect(Math.abs(next.y-header.y)).toBeLessThan(1)
    }
    await dialog.locator('.token-guide summary').click()
    expect(Math.abs((await dialog.boundingBox()).height-original.height)).toBeLessThan(1)
    await expect(dialog.locator('.cloud-scroll')).toHaveCSS('overflow-y','auto')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  }
})


test('原版玻璃主题保持渐变、半透明主卡片及胶囊选中态', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  await page.goto('/')
  const shell = page.locator('.app-shell')
  const card = page.locator('.content-card')
  const nav = page.getByRole('tablist', { name: '页面模式' })
  await expect(nav).toHaveClass(/tabs-ready/)
  await expect(shell).toHaveCSS('background-image', /radial-gradient/)
  await expect(card).toHaveCSS('border-radius', '23px')
  await expect(card).toHaveCSS('backdrop-filter', /blur\(20px\)/)
  await expect(card).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.89)')
  await expect(page.locator('.ambient-one')).toHaveCSS('animation-name', 'none')
  const indicator = await nav.evaluate(node => {
    const css = getComputedStyle(node, '::before')
    return { radius: css.borderRadius, height: parseFloat(css.height) }
  })
  expect(indicator.radius).toBe('11px')
  expect(indicator.height).toBeGreaterThan(30)
  await page.getByRole('button', { name: '切换到深色模式' }).click()
  await expect(shell).toHaveClass(/dark/)
  await expect(shell).toHaveCSS('background-image', /radial-gradient/)
  await expect(card).toHaveCSS('background-color', 'rgba(21, 29, 44, 0.9)')
  await page.getByRole('button', { name: '填入网页示例' }).click()
  await expect(page.locator('.copy-btn')).toHaveCSS('color', 'rgb(23, 34, 60)')
  await page.setViewportSize({ width: 320, height: 740 })
  await expect(card).toHaveCSS('backdrop-filter', /blur\(14px\)/)
  await expect(card).toHaveCSS('border-radius', '19px')
})

test('同页跳转确认返回后重新绑定胶囊指示器', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const nav = page.getByRole('tablist', { name: '页面模式' })
  await expect(nav).toHaveClass(/tabs-ready/)
  await page.evaluate(() => { location.hash = 'target=' + encodeURIComponent('testunknown://open') })
  await expect(page.getByRole('heading', { name: '确认打开外部应用' })).toBeVisible()
  await expect(nav).toHaveCount(0)
  await page.getByRole('button', { name: '返回创建页' }).click()
  await expect(nav).toHaveClass(/tabs-ready/)
  await nav.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByRole('heading', { name: '常用链接' })).toBeVisible()
  await expect.poll(() => nav.evaluate(node => {
    const selected = node.querySelector('[aria-selected="true"]')
    const x = new DOMMatrixReadOnly(getComputedStyle(node, '::before').transform).m41
    return Math.abs(x - selected.offsetLeft)
  })).toBeLessThan(1.5)
})


test('分享结果使用轻量内嵌链接行，浅深主题与 320px 窄屏保持完整操作', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')
  const input = page.getByLabel('网址或 URL Scheme')
  await input.fill('https://example.com/?q=' + 'a'.repeat(600))
  const card = page.locator('.preview-card')
  const link = card.locator('.preview-url')
  await expect(card).toBeVisible()
  await expect(card.getByText('可以分享')).toBeVisible()
  await expect(link.locator('.preview-link-icon')).toBeVisible()
  await expect(link).toHaveCSS('border-top-width', '0px')
  await expect(link.locator('.preview-url-text')).toHaveCSS('-webkit-line-clamp', '2')
  await expect(card.getByRole('button', { name: '打开测试' })).toBeVisible()
  await page.getByRole('button', { name: '切换到深色模式' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/dark/)
  await page.setViewportSize({ width: 320, height: 740 })
  await expect(link.locator('.preview-url-text')).toHaveCSS('-webkit-line-clamp', '3')
  for (const item of [card, link, card.getByRole('button', { name: '打开测试' }), card.getByRole('button', { name: '生成分享二维码' })]) {
    const rect = await item.boundingBox()
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(321)
  }
  await card.getByRole('button', { name: '生成分享二维码' }).click()
  await expect(page.getByRole('dialog', { name: '分享二维码' })).toBeVisible()
})


test('三个页面共享输入尺寸和工具栏基线，窄屏仍可操作', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  await page.setViewportSize({ width: 1280, height: 840 })
  await page.goto('/')
  const measures = async () => {
    const values = []
    for (const name of ['创建链接', '历史记录', '常用链接']) {
      await page.getByRole('tab', { name: new RegExp(name) }).click()
      const field = page.locator('.content-card > :not([aria-hidden="true"]) .control-field')
      await expect(field).toBeVisible()
      await expect(field).toHaveCSS('height', '54px')
      await expect(field).toHaveCSS('border-radius', '12px')
      await expect(field.locator('.control-field__icon svg')).toHaveCSS('width', '18px')
      await expect(page.locator('.content-card .panel-enter-active, .content-card .panel-leave-active')).toHaveCount(0)
      const box = await field.evaluate(node => {
        const rect = node.getBoundingClientRect(), card = node.closest('.content-card').getBoundingClientRect()
        return { x:rect.x-card.x, y:rect.y-card.y, width:rect.width }
      })
      values.push(box)
    }
    for (const value of values.slice(1)) {
      expect(Math.abs(value.x - values[0].x)).toBeLessThan(2)
      expect(Math.abs(value.y - values[0].y)).toBeLessThan(2)
      expect(Math.abs(value.width - values[0].width)).toBeLessThan(2)
    }
  }
  await measures()
  await page.getByRole('button', { name: '切换到深色模式' }).click()
  await measures()
  const commonSearch = page.getByRole('searchbox', { name: '搜索常用链接' })
  await commonSearch.fill('missing-app')
  await expect(page.getByText('没有匹配的链接')).toBeVisible()
  await page.getByRole('button', { name: '清除筛选' }).click()
  await expect(commonSearch).toHaveValue('')
  await page.setViewportSize({ width: 320, height: 740 })
  await measures()
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByRole('button', { name: '导入', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '导出', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '云端同步' })).toBeVisible()
})


test('共享开关取消授权不改变实际状态，页签支持方向键与 Home/End', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/')
  const trigger = page.getByRole('button',{name:'打开云同步设置'})
  await trigger.click()
  const dialog = page.getByRole('dialog',{name:'云端同步'})
  const settings = dialog.getByRole('button',{name:'同步设置',exact:true})
  await settings.click()
  const common = dialog.getByLabel('常用链接、标签与排序')
  await expect(common).not.toBeChecked()
  page.once('dialog', prompt => prompt.dismiss())
  await common.click()
  await expect(common).not.toBeChecked()
  await settings.focus()
  await page.keyboard.press('End')
  await expect(dialog.getByRole('button',{name:'备份恢复',exact:true})).toBeFocused()
  await page.keyboard.press('Home')
  await expect(dialog.getByRole('button',{name:'连接',exact:true})).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})


test('快捷启动键盘选中项保持在结果可视区域', async ({ page }) => {
  await page.setViewportSize({width:390,height:540})
  await page.goto('/')
  await page.getByRole('button',{name:'打开快捷启动命令面板'}).click()
  const dialog = page.getByRole('dialog',{name:'快捷启动命令面板'})
  const search = dialog.getByLabel('搜索命令')
  await expect(search).toBeFocused()
  await page.keyboard.press('ArrowUp')
  const selected = dialog.locator('[role=option][aria-selected=true]')
  await expect(selected).toBeVisible()
  await expect.poll(()=>selected.evaluate(node=>{
    const row=node.getBoundingClientRect(), list=node.parentElement.getBoundingClientRect()
    return Math.max(row.bottom-list.bottom,list.top-row.top,0)
  })).toBeLessThan(2)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('快速切换三页后只保留最终活动面板',async({page})=>{
  await page.goto('/')
  const nav=page.getByRole('tablist',{name:'页面模式'})
  await nav.getByRole('tab',{name:/历史记录/}).click()
  await nav.getByRole('tab',{name:/常用链接/}).click()
  await nav.getByRole('tab',{name:/创建链接/}).click()
  await expect(page.locator('#create-panel')).toBeVisible()
  await expect(page.locator('.content-card .panel-enter-active,.content-card .panel-leave-active')).toHaveCount(0)
  await expect(nav.getByRole('tab',{name:/创建链接/})).toHaveAttribute('aria-selected','true')
})


test('工作区备份先预览再合并，保留已有收藏并暂停自动同步',async({page})=>{
  await page.goto('/')
  await page.getByRole('button',{name:'打开云同步设置'}).click()
  const dialog=page.getByRole('dialog',{name:'云端同步'})
  await dialog.getByRole('button',{name:'备份恢复',exact:true}).click()
  const input=dialog.getByLabel('导入工作区备份文件')
  const backup={format:'s2u-workspace-backup',version:1,savedAt:1,
    history:{format:'s2u-history',version:2,records:[{scheme:'https://backup.example/',count:1,recently:1000,updatedAt:1000}],tombstones:[]},
    commonLinks:{format:'s2u-common-links',version:1,items:[{id:'backup-link',name:'备份链接',target:'https://backup.example/'}]},
    settings:{version:1,darkMode:true}}
  await input.setInputFiles({name:'workspace.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))})
  await expect(dialog.getByText('恢复预览',{exact:true})).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('s2u_workspace_before_restore_v1'))).toBe(null)
  page.once('dialog',prompt=>prompt.accept())
  await dialog.getByRole('button',{name:'确认合并恢复'}).click()
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('s2u_common_links_v1')||'{}').items?.map(i=>i.id)||[])).toContain('backup-link')
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('s2u_common_links_v1')).items.map(i=>i.id))).toContain('obsidian')
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('scheme_history')).records.map(i=>i.scheme))).toContain('https://backup.example/')
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('s2u_gist_preferences_v1')).auto)).toBe(false)
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('s2u_workspace_before_restore_v1')).commonLinks.items.map(i=>i.id))).not.toContain('backup-link')
  await expect(page.locator('.app-shell')).not.toHaveClass(/dark/)
  await expect(dialog.getByText('恢复预览',{exact:true})).toHaveCount(0)
})


test('Gist 收藏冲突预览逐条确认，保留两端无冲突修改',async({page})=>{
  const id='abcde12345', commonFile='s2u-common-links.json'
  const snap=items=>({format:'s2u-common-links',version:1,items})
  const a={id:'a',name:'共同 A',target:'https://example.com/a'},b={id:'b',name:'共同 B',target:'https://example.com/b'}
  const base=snap([a,b]), local=snap([{...a,name:'本机 A'},b])
  let remote=snap([{...a,name:'云端 A'},{...b,name:'云端 B'}]), patches=0
  await page.addInitScript(({id,base,local})=>{
    localStorage.setItem('cloud_gist_id',id)
    localStorage.setItem('s2u_gist_owner','test-user')
    sessionStorage.setItem('cloud_token_session','fake-token')
    localStorage.setItem('s2u_gist_preferences_v1',JSON.stringify({auto:false,common:true,icons:false,theme:false}))
    localStorage.setItem('s2u_common_links_v1',JSON.stringify(local))
    localStorage.setItem('s2u_gist_baseline_'+id+':s2u-common-links.json',JSON.stringify(base))
  },{id,base,local})
  await page.route('https://api.github.com/**',async route=>{
    const request=route.request()
    if(request.url().endsWith('/user'))return route.fulfill({json:{login:'test-user'}})
    if(request.method()==='PATCH'){patches++;remote=JSON.parse(request.postDataJSON().files[commonFile].content)}
    return route.fulfill({json:{id,public:false,owner:{login:'test-user'},files:{
      'scheme-history.json':{content:JSON.stringify({format:'s2u-history',version:2,records:[],tombstones:[]})},
      [commonFile]:{content:JSON.stringify(remote)}
    }}})
  })
  await page.setViewportSize({width:320,height:740})
  await page.goto('/')
  await page.getByRole('button',{name:'打开云同步设置'}).click()
  const dialog=page.getByRole('dialog',{name:'云端同步'})
  await dialog.getByRole('button',{name:'立即同步'}).click()
  const review=dialog.getByRole('region',{name:'同步冲突处理'})
  await expect(review).toBeVisible()
  expect(patches).toBe(0)
  await review.getByLabel('处理方式').selectOption('records')
  const confirm=review.getByRole('button',{name:'确认处理冲突'})
  await expect(confirm).toBeDisabled()
  await review.getByRole('radio',{name:'保留本机',exact:true}).check()
  await expect(confirm).toBeEnabled()
  page.once('dialog',prompt=>prompt.accept())
  await confirm.click()
  await expect(dialog.getByRole('status').filter({hasText:'已同步'})).toBeVisible()
  expect(patches).toBe(1)
  expect(remote.items.map(item=>item.name)).toEqual(['本机 A','云端 B'])
  await expect(review).toHaveCount(0)
  expect(await page.evaluate(()=>!!localStorage.getItem('s2u_workspace_before_conflict_v1'))).toBe(true)
})


test('账号工作区切换保留旧数据，且新工作区不继承旧连接',async({page})=>{
  await page.addInitScript(()=>{
    if(!localStorage.getItem('s2u_account_test_seed')){
      localStorage.setItem('s2u_account_test_seed','1')
      localStorage.setItem('scheme_history',JSON.stringify({format:'s2u-history',version:2,records:[{scheme:'https://legacy.example/',count:1,recently:1000,updatedAt:1000}],tombstones:[]}))
      localStorage.setItem('cloud_gist_id','abcde12345')
      localStorage.setItem('s2u_gist_owner','legacy-user')
    }
  })
  await page.goto('/')
  const open=async()=>{
    await page.getByRole('button',{name:'打开云同步设置'}).click()
    const dialog=page.getByRole('dialog',{name:'云端同步'})
    await dialog.getByText('切换或新建工作区',{exact:true}).click()
    return dialog
  }
  let dialog=await open()
  await dialog.getByLabel('新账号工作区').fill('alice')
  page.once('dialog',prompt=>prompt.accept())
  await Promise.all([page.waitForEvent('load'),dialog.getByRole('button',{name:'新建并切换'}).click()])
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('s2u_active_workspace_v1'))).toBe('account:alice')
  await page.getByRole('tab',{name:/历史记录/}).click()
  await expect(page.getByText('https://legacy.example/',{exact:true})).toHaveCount(0)
  dialog=await open()
  await expect(dialog.getByText('@alice',{exact:true}).first()).toBeVisible()
  await expect(dialog.getByLabel('GitHub Token')).toHaveValue('')
  await dialog.getByLabel('已保存工作区').selectOption('legacy')
  page.once('dialog',prompt=>prompt.accept())
  await Promise.all([page.waitForEvent('load'),dialog.getByRole('button',{name:'切换工作区',exact:true}).click()])
  await page.getByRole('tab',{name:/历史记录/}).click()
  await expect(page.getByText('https://legacy.example/',{exact:true}).first()).toBeVisible()
  expect(await page.evaluate(()=>localStorage.getItem('cloud_gist_id'))).toBe('abcde12345')
})


test('收藏拖拽排序、切换列表视图及筛选时禁止拖动',async({page})=>{
  await page.setViewportSize({width:1280,height:900})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  await page.getByRole('tab',{name:/常用链接/}).click()
  const cards=page.locator('.common-card')
  const handle=cards.filter({has:page.getByRole('button',{name:'打开 Obsidian',exact:true})}).locator('.common-drag-handle')
  const target=cards.filter({has:page.getByRole('button',{name:'打开 微信',exact:true})})
  const rect=await target.boundingBox()
  await handle.dragTo(target,{targetPosition:{x:Math.floor(rect.width/2),y:Math.floor(rect.height*.75)}})
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('s2u_common_links_v1')||'{}').items?.map(i=>i.id))).toEqual(['vscode','weixin','obsidian','orpheus'])
  await page.getByRole('button',{name:'列表视图',exact:true}).click()
  await expect(page.locator('.common-grid')).toHaveClass(/common-list-view/)
  await page.getByRole('searchbox',{name:'搜索常用链接'}).fill('visual vscode')
  await expect(cards).toHaveCount(1)
  await expect(page.locator('.common-drag-handle')).toHaveCount(0)
  await page.getByRole('button',{name:'清除常用链接搜索'}).click()
  await page.getByRole('button',{name:'网格视图',exact:true}).click()
  await expect(cards).toHaveCount(4)
  await page.reload()
  await page.getByRole('tab',{name:/常用链接/}).click()
  await expect(cards.first()).toContainText('Visual Studio Code')
})
test('统一标签管理合并大小写重复分类并保留收藏',async({page})=>{
  await page.addInitScript(()=>{
    if(!localStorage.getItem('s2u_common_links_v1'))localStorage.setItem('s2u_common_links_v1',JSON.stringify({version:1,items:[
      {id:'a',name:'A',target:'https://example.com/a',tags:['Work','笔记']},
      {id:'b',name:'B',target:'https://example.com/b',tags:['work','项目']}
    ]}))
  })
  await page.goto('/')
  await page.getByRole('tab',{name:/常用链接/}).click()
  await page.getByRole('button',{name:'Work',exact:true}).click()
  await expect(page.locator('.common-card')).toHaveCount(2)
  await page.getByText('管理标签',{exact:true}).click()
  await page.getByLabel('选择标签').selectOption('Work')
  await page.getByLabel('标签名称').fill('项目')
  page.once('dialog',prompt=>prompt.accept())
  await page.getByRole('button',{name:'重命名标签'}).click()
  await expect(page.getByRole('button',{name:'Work',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'项目',exact:true})).toHaveAttribute('aria-pressed','true')
  await page.getByLabel('选择标签').selectOption('项目')
  page.once('dialog',prompt=>prompt.accept())
  await page.getByRole('button',{name:'移除标签'}).click()
  await expect(page.getByRole('button',{name:'项目',exact:true})).toHaveCount(0)
  await expect(page.locator('.common-card')).toHaveCount(2)
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('s2u_common_links_v1')).items.map(i=>i.tags||[]))).toEqual([['笔记'],[]])
})


test('历史协议筛选、频率排序和转收藏不改变历史数据',async({page})=>{
  await page.addInitScript(()=>{
    const now=Date.now()
    localStorage.setItem('scheme_history',JSON.stringify({format:'s2u-history',version:2,records:[
      {scheme:'https://example.com/notes',count:2,recently:now,updatedAt:now},
      {scheme:'obsidian://open?vault=Notes',count:8,recently:now-1000,updatedAt:now-1000},
      {scheme:'https://example.com/work',count:3,recently:now-86400000,updatedAt:now-86400000}
    ],tombstones:[]}))
  })
  await page.setViewportSize({width:320,height:740})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  await page.getByRole('tab',{name:/历史记录/}).click()
  const cards=page.locator('.history-item')
  await expect(cards).toHaveCount(3)
  await expect(page.locator('.history-day-heading').first()).toHaveText('今天')
  await page.getByLabel('历史排序').selectOption('count')
  await expect(cards.first()).toContainText('obsidian://')
  await page.getByLabel('按协议筛选').selectOption('https:')
  await expect(cards).toHaveCount(2)
  await page.getByRole('textbox',{name:'搜索历史记录'}).fill('example notes')
  await expect(cards).toHaveCount(1)
  const before=await page.evaluate(()=>localStorage.getItem('scheme_history'))
  await page.getByRole('button',{name:'收藏 https://example.com/notes',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'添加到常用链接'})
  await expect(dialog.getByLabel('应用名称')).toHaveValue('example.com')
  await dialog.getByLabel('应用名称').fill('笔记网页')
  await dialog.getByRole('button',{name:'保存收藏'}).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button',{name:'已收藏 https://example.com/notes',exact:true})).toBeDisabled()
  expect(await page.evaluate(()=>localStorage.getItem('scheme_history'))).toBe(before)
  await page.getByRole('tab',{name:/常用链接/}).click()
  await expect(page.locator('.common-card').filter({hasText:'笔记网页'})).toBeVisible()
})

test('收藏弹窗可反复打开关闭，取消与 Escape 恢复焦点',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.setViewportSize({width:320,height:740})
  await page.goto('/')
  await page.getByRole('tab',{name:/常用链接/}).click()
  const add=page.getByRole('button',{name:/添加常用链接/})
  for(let i=0;i<2;i++){
    await add.click()
    const dialog=page.getByRole('dialog',{name:'添加常用链接'})
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('应用名称').fill('临时收藏')
    if(i===0)await page.keyboard.press('Escape')
    else await dialog.getByRole('button',{name:'取消',exact:true}).click()
    await expect(dialog).not.toBeVisible()
    await expect(add).toBeFocused()
  }
  await add.click()
  await expect(page.getByRole('dialog',{name:'添加常用链接'}).getByLabel('应用名称')).toHaveValue('')
  await page.keyboard.press('Escape')
})
test('两页统一搜索栏清除后回到输入焦点',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  for(const [tab,label,clear,role] of [['历史记录','搜索历史记录','清除搜索','textbox'],['常用链接','搜索常用链接','清除常用链接搜索','searchbox']]){
    await page.getByRole('tab',{name:new RegExp(tab)}).click()
    const input=page.getByRole(role,{name:label})
    await input.fill('no match')
    await page.locator('.ui-search-field').getByRole('button',{name:clear,exact:true}).click()
    await expect(input).toHaveValue('')
    await expect(input).toBeFocused()
    await expect(input.locator('..')).toHaveCSS('height','54px')
  }
})


test('最近复制展示真实目标，点击仍复制和打开完整分享链接', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const targets = ['weixin://', 'vscode://file/C:/My%20Project/main.js:12', 'https://example.com/path?q=100%25#section', 'customapp://open?x=%26%23', 'https://example.com/' + 'a'.repeat(300)]
  await page.addInitScript(targets => {
    const now = Date.now()
    localStorage.setItem('scheme_history', JSON.stringify({format:'s2u-history',version:2,records:targets.map((scheme,i)=>({scheme,count:1,recently:now-i,updatedAt:now-i})),tombstones:[]}))
    window.open = (url, target, features) => {
      window.__recentOpen = {url,target,features}
      return null
    }
  }, targets)
  await page.setViewportSize({width:1280,height:900})
  await page.goto('/')
  const cards = page.locator('.recent-item')
  await expect(cards).toHaveCount(targets.length)
  await expect(cards.locator('.recent-url')).toHaveText(targets)
  for (const [index,target] of targets.entries()) {
    await expect(cards.nth(index)).toHaveAttribute('title',target)
  }
  const original = await page.evaluate(()=>localStorage.getItem('scheme_history'))
  await cards.nth(2).click()
  const opened = await page.evaluate(()=>window.__recentOpen)
  expect(new URLSearchParams(new URL(opened.url).hash.slice(1)).get('target')).toBe(targets[2])
  expect(new URL(opened.url).origin).toBe(new URL(page.url()).origin)
  expect(opened.target).toBe('_blank')
  expect(opened.features).toBe('noopener,noreferrer')
  await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toBe(opened.url)
  expect(await page.evaluate(()=>localStorage.getItem('scheme_history'))).toBe(original)
  await page.setViewportSize({width:320,height:740})
  await expect(cards.last()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  const lastText=cards.last().locator('.recent-url')
  expect(await lastText.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true)
  await expect(lastText).toHaveCSS('text-overflow','ellipsis')
})


test('历史、收藏和快捷启动统一空状态，保留原有操作',async({page})=>{
  await page.setViewportSize({width:320,height:740})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  await page.getByRole('tab',{name:/历史记录/}).click()
  await expect(page.locator('.ui-empty-state')).toContainText('还没有创建过链接')
  await page.getByRole('tab',{name:/常用链接/}).click()
  await page.getByRole('searchbox',{name:'搜索常用链接'}).fill('not-matching-any-link')
  await expect(page.locator('.ui-empty-state')).toContainText('没有匹配的链接')
  await page.getByRole('button',{name:'清除筛选',exact:true}).click()
  await expect(page.locator('.common-card')).toHaveCount(4)
  await page.getByRole('button',{name:'打开快捷启动命令面板'}).click()
  await page.getByRole('searchbox',{name:'搜索命令'}).fill('not-matching-any-link')
  await expect(page.getByRole('dialog').locator('.ui-empty-state--compact')).toContainText('没有找到匹配项')
})


test('链接模板仅填入经校验的地址，取消与切换不写历史',async({page})=>{
  await page.setViewportSize({width:320,height:740})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.goto('/')
  const input=page.locator('#url')
  await input.fill('https://original.example/')
  await page.getByRole('button',{name:'链接模板',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'链接模板'})
  await dialog.getByLabel('笔记库').fill('个人 笔记')
  await dialog.getByLabel('笔记路径').fill('日志/#今日.md')
  await expect(dialog.locator('.template-preview code')).toContainText('obsidian://open?vault=')
  await dialog.getByRole('button',{name:'取消',exact:true}).click()
  await expect(input).toHaveValue('https://original.example/')
  await page.getByRole('button',{name:'链接模板',exact:true}).click()
  await dialog.getByRole('button',{name:'网页',exact:true}).click()
  await dialog.getByLabel('网址',{exact:true}).fill('javascript:alert(1)')
  await expect(dialog.getByRole('button',{name:'填入目标地址'})).toBeDisabled()
  await dialog.getByRole('button',{name:'Obsidian',exact:true}).click()
  await dialog.getByLabel('笔记库').fill('Notes')
  await dialog.getByLabel('笔记路径').fill('日志/今日.md')
  await dialog.getByRole('button',{name:'填入目标地址'}).click()
  await expect(input).toHaveValue('obsidian://open?vault=Notes&file='+encodeURIComponent('日志/今日.md'))
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('scheme_history')||'{"records":[]}').records.length)).toBe(0)
  await expect(page.getByText('可以分享',{exact:true})).toBeVisible()
})

