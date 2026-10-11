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


test('常用链接展示图标、填入后切换创建页并复制', async ({ page, context }) => {
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
  await page.getByRole('button', { name: '填入 Obsidian' }).click()
  await expect(page.locator('#url')).toHaveValue('obsidian://')
  await page.getByRole('button', { name: '复制链接' }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(new URLSearchParams(new URL(copied).hash.slice(1)).get('target')).toBe('obsidian://')
})

test('自定义常用链接可添加、编辑、删除且刷新后仍保留', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await page.getByRole('button', { name: /添加常用链接/ }).click()
  await page.getByPlaceholder('例如：我的 Obsidian 笔记库').fill('我的笔记')
  await page.getByPlaceholder('obsidian:// 或 https://example.com').fill('obsidian://open?vault=notes')
  await page.getByRole('button', { name: '保存链接' }).click()
  await expect(page.getByText('我的笔记')).toBeVisible()
  await page.reload()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByText('我的笔记')).toBeVisible()
  await page.getByRole('button', { name: '编辑 我的笔记' }).click()
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
