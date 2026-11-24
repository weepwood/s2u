import { test, expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

async function seed(page) {
  await page.addInitScript(() => {
    const now=Date.now()
    const records=Array.from({length:8},(_,i)=>({scheme:'https://example.com/sample-'+i,count:i+1,recently:now-i*86400000,updatedAt:now-i*86400000}))
    localStorage.setItem('scheme_history',JSON.stringify({format:'s2u-history',version:2,records,tombstones:[]}))
  })
}
const panels=[['创建链接','create','输入目标地址'],['历史记录','history','历史记录'],['常用链接','common','常用链接']]
async function capture(page,testInfo,width,theme) {
  for(const [name,id,heading] of panels){
    await page.getByRole('tab',{name:new RegExp(name)}).click()
    await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible()
    if(id==='create') await page.locator('#url').fill('https://example.com/share?q=demo')
    await expect.poll(()=>page.locator('.content-card > .panel-leave-active').count()).toBe(0)
    await expect.poll(()=>page.evaluate(()=>{
      const card=document.querySelector('.content-card'),panel=card.querySelector('[role=tabpanel]:not(.panel-leave-active)')
      if(!panel)return false
      return Number(getComputedStyle(panel).opacity)>=.99 && !panel.classList.contains('panel-enter-active') && card.clientHeight+2>=panel.offsetHeight+parseFloat(getComputedStyle(card).paddingTop)+parseFloat(getComputedStyle(card).paddingBottom)
    })).toBe(true)
    if(id==='history'&&theme==='dark'){
      const select=page.getByRole('combobox',{name:'按协议筛选'})
      await expect(select).toHaveJSProperty('tagName','BUTTON')
      await expect(select).toHaveCSS('background-color','rgb(32, 44, 61)')
      await expect(select).toHaveCSS('color','rgb(237, 243, 255)')
    }
    const bounds=await page.evaluate(()=>{
      const head=document.querySelector('.app-header').getBoundingClientRect()
      const tabs=document.querySelector('.workspace-head').getBoundingClientRect()
      const card=document.querySelector('.content-card').getBoundingClientRect()
      return {overflow:document.documentElement.scrollWidth-innerWidth,aligned:Math.abs(head.left-tabs.left),cardAligned:Math.abs(card.left-tabs.left),cardRight:card.right}
    })
    expect(bounds.overflow).toBeLessThanOrEqual(1)
    expect(bounds.aligned).toBeLessThanOrEqual(1.5)
    expect(bounds.cardAligned).toBeLessThanOrEqual(1.5)
    expect(bounds.cardRight).toBeLessThanOrEqual(width+1)
    await page.screenshot({path:testInfo.outputPath('ui-'+width+'-'+theme+'-'+id+'.png'),animations:'disabled'})
    await expect(page.locator('select')).toHaveCount(0)
    if(id==='history'){
      const select=page.getByRole('combobox',{name:'历史排序'})
      await select.click()
      await expect(page.getByRole('listbox')).toBeVisible()
      const menu=await page.getByRole('listbox').boundingBox()
      const viewport=page.viewportSize()
      expect(menu.x).toBeGreaterThanOrEqual(0)
      expect(menu.y).toBeGreaterThanOrEqual(0)
      expect(menu.x+menu.width).toBeLessThanOrEqual(viewport.width+1)
      expect(menu.y+menu.height).toBeLessThanOrEqual(viewport.height+1)
      await page.screenshot({path:testInfo.outputPath('ui-'+width+'-'+theme+'-select.png'),animations:'disabled'})
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      await expect(select).toContainText('使用频率')
      await select.click()
      await page.keyboard.press('Home')
      await page.keyboard.press('Enter')
      await expect(select).toContainText('最近使用')
    }
    if(id==='common'){
      await page.getByRole('button',{name:'列表视图'}).click()
      const copy=page.getByRole('button',{name:'复制 Obsidian 分享链接'})
      await expect(copy).toHaveCSS('white-space','nowrap')
      expect(await copy.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
      await page.screenshot({path:testInfo.outputPath('ui-'+width+'-'+theme+'-common-list.png'),animations:'disabled'})
      await page.getByRole('button',{name:'网格视图'}).click()
    }
  }
}
test('三页浅深主题真实截图及弹窗焦点',async({page},testInfo)=>{
  await seed(page)
  await page.setViewportSize({width:1280,height:900})
  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'})
  await page.goto('/')
  await capture(page,testInfo,1280,'light')
  await page.getByRole('button',{name:'切换到深色模式'}).click()
  await expect(page.locator('.app-shell')).toHaveClass(/dark/)
  await capture(page,testInfo,1280,'dark')
  const trigger=page.getByRole('button',{name:'打开云同步设置'})
  await trigger.click()
  const dialog=page.getByRole('dialog',{name:'云端同步'})
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('#gist-mode')).toHaveJSProperty('tagName','BUTTON')
  await expect(dialog.locator('#gist-mode')).toHaveCSS('background-color','rgb(32, 44, 61)')
  await dialog.locator('#gist-mode').click()
  await expect(dialog.getByRole('listbox')).toBeVisible()
  await expect(dialog.getByRole('option',{name:'创建新的 Gist'})).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('ui-1280-dark-select.png'),animations:'disabled'})
  await page.keyboard.press('Escape')
  await expect(dialog.getByRole('listbox')).toHaveCount(0)
  await expect(dialog).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('ui-1280-dark-dialog.png'),animations:'disabled'})
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
test('触屏窄视口与缩短视口三页、模板弹窗',async({browser,browserName},testInfo)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,...(browserName==='firefox'?{}:{isMobile:true}),colorScheme:'light',reducedMotion:'reduce'})
  try{
    const page=await context.newPage()
    await seed(page);await page.goto('/')
    await capture(page,testInfo,390,'light')
    await page.getByRole('button',{name:'切换到深色模式'}).click()
    await capture(page,testInfo,390,'dark')
    await page.setViewportSize({width:320,height:420})
    await page.getByRole('tab',{name:/创建链接/}).click()
    await page.getByRole('button',{name:'链接模板',exact:true}).click()
    const dialog=page.getByRole('dialog',{name:'链接模板',exact:true})
    await expect(dialog).toBeVisible()
    const box=await dialog.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x+box.width).toBeLessThanOrEqual(321)
    expect(box.y+box.height).toBeLessThanOrEqual(421)
    await page.screenshot({path:testInfo.outputPath('ui-320-dark-template.png'),animations:'disabled'})
    await dialog.getByRole('button',{name:'取消',exact:true}).click()
    await expect(dialog).toHaveCount(0)
  } finally{await context.close()}
})
test('预热后五轮反向切换采样及最终落位',async({page},testInfo)=>{
  test.setTimeout(120000)
  await seed(page)
  await page.setViewportSize({width:1280,height:850})
  await page.goto('/')
  const tabs=page.getByRole('tablist',{name:'页面模式'}).getByRole('tab')
  for(const i of [2,1,0]){
    await tabs.nth(i).click()
    await expect(page.locator('.content-card > [role=tabpanel]:not(.panel-leave-active)')).toHaveCount(1)
  }
  const reports=[]
  for(const reducedMotion of ['no-preference','reduce']){
    await page.emulateMedia({reducedMotion})
    const report=await page.evaluate(async()=>{
      const nav=document.querySelector('.mode-tabs'),buttons=[...nav.querySelectorAll('button')]
      const card=document.querySelector('.content-card')
      const samples=[],tasks=[]
      const supported=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('longtask')
      const observer=supported?new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>e.duration))):null
      observer?.observe({type:'longtask'})
      const start=performance.now()
      const next=()=>new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{cancelAnimationFrame(raf);reject(new Error('rAF 未在 4 秒内返回，不能形成有效采样'))},4000)
        const raf=requestAnimationFrame(time=>{clearTimeout(timer);resolve(time)})
      })
      let previous=await next()
      for(let cycle=0;cycle<5;cycle++){
        for(const index of [2,0,1,2,0]){
          buttons[index].click()
          for(let j=0;j<3;j++){
            const time=await next()
            // 每帧记录时间，隔三帧才读几何，避免测量本身强制布局。
            samples.push({dt:time-previous,cycle,...(j===2?{x:new DOMMatrixReadOnly(getComputedStyle(nav,'::before').transform).m41,height:card.getBoundingClientRect().height}: {})})
            previous=time
          }
        }
      }
      await new Promise(resolve=>setTimeout(resolve,650))
      await next()
      if(observer)tasks.push(...observer.takeRecords().map(e=>e.duration))
      observer?.disconnect()
      const sorted=samples.map(s=>s.dt).sort((a,b)=>a-b)
      return {durationMs:performance.now()-start,frames:samples.length,p95:sorted[Math.floor((sorted.length-1)*.95)],max:sorted.at(-1),longTaskSupported:supported,longTaskCount:tasks.length,longTaskTotalMs:tasks.reduce((a,b)=>a+b,0),samples,finalX:new DOMMatrixReadOnly(getComputedStyle(nav,'::before').transform).m41,targetX:buttons[0].offsetLeft}
    })
    expect(Math.abs(report.finalX-report.targetX)).toBeLessThan(2)
    expect(report.samples).toHaveLength(75)
    expect(report.samples.filter(s=>s.x!==undefined)).toHaveLength(25)
    expect(report.samples.every(s=>Number.isFinite(s.dt)&&s.dt>=0&&(s.x===undefined||Number.isFinite(s.height)&&Number.isFinite(s.x)))).toBe(true)
    await expect.poll(()=>page.locator('.content-card').evaluate(el=>el.style.overflow)).toBe('')
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected','true')
    reports.push({reducedMotion,...report})
  }
  await writeFile(testInfo.outputPath('motion-report.json'),JSON.stringify(reports,null,2))
  console.log('S2U_MOTION_REPORT '+JSON.stringify(reports.map(report=>({reducedMotion:report.reducedMotion,frames:report.frames,durationMs:report.durationMs,p95:report.p95,max:report.max,longTaskSupported:report.longTaskSupported,longTaskCount:report.longTaskCount,longTaskTotalMs:report.longTaskTotalMs,finalX:report.finalX,targetX:report.targetX}))))
})
