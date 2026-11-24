import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

test('500 条历史的分批渲染、快速切换与真实帧间隔', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const now = Date.now()
    const records = Array.from({ length: 500 }, (_, i) => ({
      scheme: 'https://bench.example/item-' + String(i).padStart(3, '0'),
      count: i + 1, recently: now - i * 1000, updatedAt: now - i * 1000,
    }))
    localStorage.setItem('scheme_history', JSON.stringify({ format: 's2u-history', version: 2, records, tombstones: [] }))
    const frames = [], tasks = []
    let previous = 0, active = false, start = 0, raf
    const supported = PerformanceObserver.supportedEntryTypes.includes('longtask')
    const observer = supported ? new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (active && entry.startTime >= start) tasks.push(entry.duration)
    }) : null
    observer?.observe({ type: 'longtask', buffered: true })
    window.__renderBench = {
      start() {
        active = true; start = performance.now(); previous = 0
        const tick = time => {
          if (!active) return
          if (previous) frames.push(time - previous)
          previous = time; raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      stop() {
        if (observer) for (const entry of observer.takeRecords()) if (entry.startTime >= start) tasks.push(entry.duration)
        active = false; cancelAnimationFrame(raf); observer?.disconnect()
        return { frames, longTasks: tasks, longTaskSupported: supported, duration: performance.now() - start }
      },
    }
  })
  await page.goto('/')
  const history = page.getByRole('tab', { name: /历史记录/ })
  const create = page.getByRole('tab', { name: /创建链接/ })
  const common = page.getByRole('tab', { name: /常用链接/ })
  const items = page.locator('#history-panel .history-item')
  await page.evaluate(() => window.__renderBench.start())
  const start = Date.now()
  await history.click()
  await expect(items).toHaveCount(60)
  const firstRenderMs = Date.now() - start
  await expect(page.getByText('已显示 60 / 500 条')).toBeVisible()
  await page.getByRole('button', { name: '显示更多记录' }).click()
  await expect(items).toHaveCount(120)
  const search = page.locator('#history-panel input').first()
  await search.fill('item-499')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('item-499')
  await search.fill('')
  await expect(items).toHaveCount(60)
  // 连续切换同一个真实渲染环境中的标签；不人为等待每次动效结束。
  for (let i = 0; i < 3; i++) {
    await create.click()
    await common.click()
    await history.click()
  }
  await expect(items).toHaveCount(60)
  await expect(history).toHaveAttribute('aria-selected', 'true')
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const sample = await page.evaluate(() => window.__renderBench.stop())
  const sorted = [...sample.frames].sort((a,b) => a-b)
  const quantile = q => sorted.length ? sorted[Math.min(sorted.length-1, Math.floor(q*(sorted.length-1)))] : null
  const report = { records: 500, initialDomRows: 60, firstRenderMs, frameCount: sorted.length, frameP50Ms: quantile(.5), frameP95Ms: quantile(.95), frameMaxMs: sorted.at(-1) ?? null, longTaskSupported: sample.longTaskSupported, longTaskCount: sample.longTasks.length, longTaskTotalMs: sample.longTasks.reduce((a,b)=>a+b,0), durationMs: sample.duration }
  expect(report.frameCount).toBeGreaterThan(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('scheme_history')).records.length)).toBe(500)
  console.log('S2U_RENDER_PERF ' + JSON.stringify(report))
  const output = testInfo.outputPath('render-performance.json')
  await writeFile(output, JSON.stringify(report,null,2))
  await testInfo.attach('render-performance', { path: output, contentType: 'application/json' })
})
