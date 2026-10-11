import { test, expect } from '@playwright/test'

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
  await expect(page.getByText('https://example.com/hello')).toBeVisible()
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
      return route.fulfill({ json: { id: 'test-gist-id' } })
    }
    if (url.pathname === '/gists/test-gist-id' && request.method() === 'GET') {
      return route.fulfill({ json: { files: { 'scheme-history.json': { content: JSON.stringify(remoteData) } } } })
    }
    if (url.pathname === '/gists/test-gist-id' && request.method() === 'PATCH') {
      patched++
      return route.fulfill({ json: { id: 'test-gist-id' } })
    }
    return route.fulfill({ status: 404, json: { message: 'Unexpected API request' } })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await page.getByRole('button', { name: '云端同步' }).click()
  await page.locator('#gist-token').fill('fake-token-for-test')
  await page.getByRole('button', { name: '连接 Gist' }).click()
  await expect(page.getByRole('button', { name: '立即同步' })).toBeVisible()
  await expect.poll(() => patched).toBeGreaterThan(0)
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
  const url = await firstCard.locator('.card-meta span').boundingBox()
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
      return route.fulfill({ json: { id: 'test-sync-id' } })
    }
    if (url.pathname === '/gists/test-sync-id' && method === 'GET') {
      return route.fulfill({ json: {
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
      return route.fulfill({ json: { id: 'test-sync-id' } })
    }
    return route.fulfill({ status: 404, json: { message: 'unexpected request' } })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await page.getByRole('button', { name: '云端同步' }).click()
  await page.locator('#gist-token').fill('fake-token-for-test')
  await page.getByRole('button', { name: '连接 Gist' }).click()
  await expect(page.getByRole('alert')).toContainText('本地存储空间不足')
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
      return route.fulfill({ json: { id: 'test-race' } })
    }
    if (pathname === '/gists/test-race' && request.method() === 'GET') {
      reads++
      return route.fulfill({ json: { files: {
        'scheme-history.json': { content: history(reads > 1 ? 'https://external.example/new' : 'https://initial.example/') },
      } } })
    }
    if (request.method() === 'PATCH') patches++
    return route.fulfill({ status: 200, json: { id: 'test-race' } })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await page.getByRole('button', { name: '云端同步' }).click()
  await page.locator('#gist-token').fill('fake-token-for-test')
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
