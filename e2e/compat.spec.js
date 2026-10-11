import { test, expect } from '@playwright/test'

test('基础功能在 Firefox / WebKit 中可使用', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('tab', { name: /常用链接/ })).toBeVisible()
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.getByRole('button', { name: '打开 Obsidian' })).toBeVisible()
  await page.getByRole('button', { name: '编辑 Obsidian' }).click()
  await expect(page.getByRole('dialog', { name: '编辑常用链接' })).toBeVisible()
  await page.getByRole('button', { name: '关闭弹窗' }).click()
  await expect(page.getByRole('dialog', { name: '编辑常用链接' })).not.toBeVisible()
  await page.getByRole('tab', { name: /创建链接/ }).click()
  await page.locator('#url').fill('https://example.com/weekly')
  await expect(page.getByRole('button', { name: '复制链接' })).toBeEnabled()
  expect(errors).toEqual([])
})
