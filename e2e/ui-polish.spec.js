import { test, expect } from '@playwright/test'

test('真实触屏窄屏操作尺寸、历史删除常驻与双主题截图', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', colorScheme: 'light' })
  try {
    const page = await context.newPage()
    await page.addInitScript(() => {
      localStorage.setItem('scheme_history', JSON.stringify([{ scheme:'https://example.com/long-history-link', count:1, recently:Date.now(), updatedAt:Date.now() }]))
    })
    await page.goto('/')
    await expect(page.locator('#url')).toHaveCSS('font-size','16px')
    for (const locator of await page.locator('.header-actions > button, .header-actions > a').all()) {
      const rect = await locator.boundingBox()
      expect(rect.height).toBeGreaterThanOrEqual(44)
    }
    await page.locator('#url').fill('https://example.com/demo')
    await page.screenshot({ path:testInfo.outputPath('ui-mobile-light-create.png'), animations:'disabled' })
    await page.getByRole('tab',{name:/历史记录/}).tap()
    const row = page.locator('.history-item').first()
    await expect(row).toBeVisible()
    await expect(row.locator('.delete-btn')).toHaveCSS('opacity','1')
    expect((await row.locator('.delete-btn').boundingBox()).width).toBeGreaterThanOrEqual(44)
    await page.screenshot({path:testInfo.outputPath('ui-mobile-light-history.png'),animations:'disabled'})
    await page.getByRole('tab',{name:/常用链接/}).tap()
    const card=page.locator('.common-card').first()
    await expect(card).toBeVisible()
    for(const button of await card.locator('.card-actions button').all()) {
      const rect=await button.boundingBox(); expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
    await page.getByRole('button',{name:'切换到深色模式'}).tap()
    await expect(page.locator('.app-shell')).toHaveClass(/dark/)
    await page.setViewportSize({width:390,height:844})
    await page.screenshot({path:testInfo.outputPath('ui-mobile-dark-common.png'),animations:'disabled'})
    await page.setViewportSize({width:900,height:800})
    await page.getByRole('tab',{name:/历史记录/}).tap()
    await expect(page.locator('.history-item .delete-btn').first()).toHaveCSS('opacity','1')
  } finally { await context.close() }
})

test('桌面玻璃双主题、隐藏工具不拦截鼠标且键盘可达',async({page},testInfo)=>{
  await page.setViewportSize({width:1280,height:850})
  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'})
  await page.goto('/')
  await page.locator('#url').fill('https://example.com/demo')
  await page.screenshot({path:testInfo.outputPath('ui-desktop-light-create.png'),animations:'disabled'})
  await page.getByRole('tab',{name:/常用链接/}).click()
  const card=page.locator('.common-card').first()
  await page.mouse.move(1,1)
  await expect(card.locator('.card-actions')).toHaveCSS('pointer-events','none')
  const edit=card.getByRole('button',{name:'编辑 Obsidian'})
  await edit.focus()
  await expect(edit).toBeFocused()
  await expect(card.locator('.card-actions')).toHaveCSS('pointer-events','auto')
  await page.getByRole('button',{name:'切换到深色模式'}).click()
  await page.mouse.move(1,1)
  await page.screenshot({path:testInfo.outputPath('ui-desktop-dark-common.png'),animations:'disabled'})
  await page.getByRole('button',{name:'打开云同步设置'}).click()
  await expect(page.getByRole('dialog',{name:'云端同步'})).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('ui-desktop-dark-dialog.png'),animations:'disabled'})
})
