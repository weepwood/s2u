import { test, expect } from '@playwright/test'

const base = process.env.S2U_SUBPATH_TEST === '1' ? '/s2u/' : '/'
const share = (target) => base + '#target=' + encodeURIComponent(target)

test('普通网址自动跳转，完整传递查询与片段且不发送 Referer', async ({ page }) => {
  const target = 'https://example.com/s2u-test?q=100%25#chapter'
  let referer
  await page.route('https://example.com/s2u-test?**', async (route) => {
    referer = route.request().headers().referer
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>目标网页</h1>' })
  })
  await page.goto(share(target), { waitUntil: 'commit' })
  await expect(page).toHaveURL(target)
  await expect(page.getByRole('heading', { name: '目标网页' })).toBeVisible()
  expect(referer).toBeUndefined()
})

test('未知 Scheme 必须确认，刷新、复制、返回和同页 Hash 导航均可用', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const target = 'testunknown://open?value=%25&name=中文'
  await page.goto(share(target))
  await expect(page.getByRole('heading', { name: '确认打开外部应用' })).toBeVisible()
  await expect(page.getByRole('button', { name: '确认并打开' })).toBeVisible()
  await expect(page.locator('.target-preview code')).toHaveText(target)
  await page.reload()
  await expect(page.getByRole('heading', { name: '确认打开外部应用' })).toBeVisible()
  await page.getByRole('button', { name: '复制原始链接' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(target)
  await page.getByRole('button', { name: '返回创建页' }).click()
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()
  expect(new URL(page.url()).hash).toBe('')
  await page.evaluate(() => { window.location.hash = 'testunknown://legacy?x=1' })
  await expect(page.locator('.target-preview code')).toHaveText('testunknown://legacy?x=1')
  await page.getByRole('button', { name: '确认并打开' }).click()
  await expect(page.getByRole('button', { name: '手动重新打开' })).toBeVisible()
})

test('已知应用自动尝试后保留可见的重试与复制入口及本地图标', async ({ page }) => {
  await page.goto(share('obsidian://open?vault=Notes'))
  await expect(page.getByRole('heading', { name: '打开 Obsidian' })).toBeVisible()
  await expect(page.getByRole('button', { name: '手动重新打开' })).toBeVisible()
  await expect(page.getByRole('button', { name: '复制原始链接' })).toBeVisible()
  const icon = page.locator('.app-icon img')
  await expect.poll(() => icon.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  expect(new URL(await icon.getAttribute('src'), page.url()).pathname).toBe(base + 'icons/common-obsidian.png')
  await expect(page.getByRole('status').filter({ hasText: '已尝试打开目标' })).toBeVisible()
})

test('危险协议分享链接不会执行或进入跳转面板', async ({ page }) => {
  await page.goto(share('javascript:window.__s2uUnsafe=1'))
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()
  await expect(page.locator('.redirect-panel')).toHaveCount(0)
  expect(await page.evaluate(() => window.__s2uUnsafe)).toBeUndefined()
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.getByText('还没有创建过链接')).toBeVisible()
})
