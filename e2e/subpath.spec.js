import { test, expect } from '@playwright/test'

test('子路径构建的页面、favicon、应用图标和分享链接均保留 /s2u/ 前缀', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/s2u/')
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()

  const favicon = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(new URL(favicon, page.url()).pathname).toBe('/s2u/favicon.svg')

  await page.getByRole('tab', { name: /常用链接/ }).click()
  const obsidian = page.locator('img[alt="Obsidian 图标"]')
  await expect(obsidian).toBeVisible()
  await expect.poll(() => obsidian.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  const imageSrc = await obsidian.getAttribute('src')
  expect(new URL(imageSrc, page.url()).pathname).toBe('/s2u/icons/common-obsidian.png')

  await page.getByRole('tab', { name: /创建链接/ }).click()
  await page.locator('#url').fill('https://example.com/target')
  await page.getByRole('button', { name: '复制链接' }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(new URL(link).pathname).toBe('/s2u/')
  expect(new URLSearchParams(new URL(link).hash.slice(1)).get('target')).toBe('https://example.com/target')
  expect(errors).toEqual([])
})
