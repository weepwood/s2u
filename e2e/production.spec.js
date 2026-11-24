import { test, expect } from '@playwright/test'
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'

test('线上实际构建、三页交互与链接历史回归',async({page,context},testInfo)=>{
  test.setTimeout(120000)
  await context.grantPermissions(['clipboard-read','clipboard-write'])
  const expectedHtml=await readFile('dist/index.html','utf8')
  const assetPattern=/\/s2u\/assets\/[^"'\s<>]+\.(?:js|css)/g
  const expected=[...new Set(expectedHtml.match(assetPattern)||[])].sort()
  expect(expected.some(x=>x.endsWith('.js'))).toBe(true)
  // CDN may briefly serve the previous deployment. Wait for the exact artifact,
  // never accept a different entry hash as a successful release.
  await expect.poll(async()=>{
    const response=await page.request.get('./',{headers:{'Cache-Control':'no-cache'}})
    if(!response.ok())return []
    return [...new Set((await response.text()).match(assetPattern)||[])].sort()
  },{timeout:60000,intervals:[1000,2000,5000]}).toEqual(expected)
  const response=await page.goto('./',{waitUntil:'domcontentloaded'})
  expect(response.status()).toBe(200)
  expect(await response.text()).toBe(expectedHtml)
  const publicFiles=['favicon.svg',...(await readdir('dist/assets')).map(name=>'assets/'+name),...(await readdir('dist/icons')).map(name=>'icons/'+name)]
  const hash=buffer=>createHash('sha256').update(buffer).digest('hex')
  for(const file of publicFiles){
    const asset=await page.request.get(new URL(file,page.url()).href)
    expect(asset.ok(),file).toBe(true)
    expect(hash(await asset.body()),file).toBe(hash(await readFile('dist/'+file)))
  }
  console.log('S2U_PRODUCTION_ARTIFACT_VERIFIED '+JSON.stringify({index:true,publicFiles:publicFiles.length,entries:expected}))
  const target='https://example.com/release-v2?q=100%25#check'
  const input=page.locator('#url')
  await expect(input).toBeVisible()
  await input.fill(target)
  await expect(page.locator('.preview-url')).toContainText('example.com/release-v2')
  await page.getByRole('button',{name:'复制链接',exact:true}).click()
  const copied=await page.evaluate(()=>navigator.clipboard.readText())
  const share=new URL(copied)
  expect(share.origin+share.pathname).toBe('https://weepwood.github.io/s2u/')
  expect(new URLSearchParams(share.hash.slice(1)).get('target')).toBe(target)
  await page.getByRole('tab',{name:/历史记录/}).click()
  await expect(page.locator('#history-panel .history-item')).toHaveCount(1)
  await expect(page.locator('#history-panel')).toContainText('release-v2')
  await page.getByRole('tab',{name:/常用链接/}).click()
  await expect(page.locator('#common-panel .common-card')).toHaveCount(4)
  await page.reload()
  await page.getByRole('tab',{name:/历史记录/}).click()
  await expect(page.locator('#history-panel')).toContainText('release-v2')
  await page.getByRole('tab',{name:/创建链接/}).click()
  await expect(input).toBeVisible()
  await input.fill('javascript:alert(1)')
  await page.getByRole('button',{name:'复制链接',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('不支持 javascript')
  await page.screenshot({path:testInfo.outputPath('production-smoke.png'),animations:'disabled'})
  // 线上分享链接应将浏览器导航到目标；拦截合成目标，不向外部站点发送请求。
  await context.route(url=>url.origin==='https://example.com'&&url.pathname==='/release-v2',route=>route.fulfill({status:200,contentType:'text/plain',body:'release redirect verified'}))
  await page.goto(copied,{waitUntil:'commit'})
  await expect(page).toHaveURL(target)
  await expect(page.locator('body')).toContainText('release redirect verified')
})
