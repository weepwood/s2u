import { test, expect } from '@playwright/test'

const fixtures = [
  { id: 'obsidian', name: 'Obsidian', target: 'obsidian://open?vault=Notes', tags: ['笔记'] },
  { id: 'vscode', name: 'Visual Studio Code', target: 'vscode://', tags: ['开发'] },
  { id: 'weixin', name: '微信', target: 'weixin://' },
  ...Array.from({ length: 10 }, (_, i) => ({ id: 'site-' + i, name: '示例网站 ' + (i + 1), target: 'https://example.com/' + i })),
]

test('视觉审查截图：桌面浅深主题与窄屏关键界面', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 840 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')
  await page.evaluate((items) => {
    localStorage.setItem('s2u_common_links_v1', JSON.stringify({ version: 1, items }))
    localStorage.setItem('scheme_history', JSON.stringify(items.slice(0, 4).map(item => ({
      scheme: item.target, count: 2, recently: Date.now() - 60000,
    }))))
  }, fixtures)
  await page.reload()
  await page.getByLabel('网址或 URL Scheme').fill('obsidian://open?vault=Notes')
  await expect(page.locator('.preview-card')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('visual-desktop-create.png'), animations: 'disabled' })
  await page.getByRole('tab', { name: /历史记录/ }).click()
  await expect(page.locator('.history-item')).toHaveCount(4)
  await expect(page.locator('.history-item img').first()).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('visual-desktop-history.png'), animations: 'disabled' })
  await page.getByRole('tab', { name: /常用链接/ }).click()
  await expect(page.locator('.common-card')).toHaveCount(fixtures.length)
  await page.screenshot({ path: testInfo.outputPath('visual-desktop-favorites.png'), animations: 'disabled' })
  await page.getByRole('button', { name: '切换到深色模式' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/dark/)
  await page.screenshot({ path: testInfo.outputPath('visual-dark-favorites.png'), animations: 'disabled' })
  await page.getByRole('button', { name: '打开快捷启动命令面板' }).click()
  const dialog = page.getByRole('dialog', { name: '快捷启动命令面板' })
  const input = dialog.getByRole('searchbox', { name: '搜索命令' })
  await expect(dialog.getByRole('option')).toHaveCount(12)
  await expect(dialog.locator('.command-glyph img').first()).toBeVisible()
  await input.press('ArrowUp')
  await expect(dialog.getByRole('option').last()).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => dialog.locator('.command-results').evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await input.fill('Obsidian')
  await expect(dialog.getByRole('option')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath('visual-dark-command.png'), animations: 'disabled' })
  await dialog.getByRole('button', { name: '关闭快捷启动' }).click()
  await expect(dialog).not.toBeVisible()
  await page.setViewportSize({ width: 320, height: 740 })
  await page.getByRole('button', { name: '切换到浅色模式' }).click()
  await page.getByRole('tab', { name: '创建链接' }).click()
  await expect(page.getByRole('heading', { name: '输入目标地址' })).toBeVisible()
  await expect(page.locator('.copy-btn')).toBeVisible()
  const bounds = await page.locator('.copy-btn').boundingBox()
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(321)
  await page.screenshot({ path: testInfo.outputPath('visual-mobile-create.png'), animations: 'disabled' })
  await page.getByRole('button', { name: '打开快捷启动命令面板' }).click()
  await expect(dialog).toBeVisible()
  const rect = await dialog.boundingBox()
  expect(rect.x).toBeGreaterThanOrEqual(0)
  expect(rect.x + rect.width).toBeLessThanOrEqual(321)
  await page.screenshot({ path: testInfo.outputPath('visual-mobile-command.png'), animations: 'disabled' })
})

test('浅深主题的主操作文字对比度达到 4.5:1', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByLabel('网址或 URL Scheme').fill('https://example.com')
  const contrast = () => page.locator('.copy-btn').evaluate(el => {
    const style = getComputedStyle(el)
    const luminance = color => {
      const channels = color.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(x => {
        const v = Number(x) / 255
        return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
      })
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
    }
    const a = luminance(style.color), b = luminance(style.backgroundColor)
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
  })
  expect(await contrast()).toBeGreaterThanOrEqual(4.5)
  await page.getByRole('button', { name: '切换到深色模式' }).click()
  expect(await contrast()).toBeGreaterThanOrEqual(4.5)
})
