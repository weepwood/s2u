import test from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'
import { useShareRedirect } from '../src/composables/workspace/useShareRedirect.js'
import { useHistoryActions } from '../src/composables/workspace/useHistoryActions.js'

function redirectFixture() {
  const originalWindow=globalThis.window, originalDocument=globalThis.document
  const navigated=[], history=[], messages=[], listeners=new Map(), timers=new Map()
  let id=0, syncs=0, errors=0
  globalThis.window={
    location:{hash:'',pathname:'/s2u/',search:'',replace:target=>navigated.push(target)},
    history:{replaceState:()=>{globalThis.window.location.hash=''}},
    addEventListener:(name,fn)=>listeners.set(name,fn),
    removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name)},
    setTimeout:fn=>{timers.set(++id,fn);return id},
    clearTimeout:key=>timers.delete(key),
  }
  globalThis.document={readyState:'loading'}
  const showCloseMsg=ref(false),urlError=ref('')
  const redirect=useShareRedirect({
    showCloseMsg,urlError,addHistory:target=>{history.push(target);return true},
    autoSync:()=>{syncs++},notifyStorageError:()=>{errors++},showToast:message=>messages.push(message),
  })
  function hash(target){window.location.hash='#target='+encodeURIComponent(target);redirect.readShareHash()}
  function restore(){redirect.stopRedirectLifecycle();globalThis.window=originalWindow;globalThis.document=originalDocument}
  return {redirect,hash,restore,showCloseMsg,urlError,navigated,history,messages,listeners,timers,get syncs(){return syncs},get errors(){return errors}}
}
test('分享模块拒绝危险协议，未知协议在明确操作前不导航不记录',()=>{
  const f=redirectFixture()
  try {
    f.hash('javascript:alert(1)')
    assert.equal(f.showCloseMsg.value,false)
    assert.match(f.urlError.value,/不支持/)
    assert.equal(f.history.length,0)
    f.hash('customapp://open')
    assert.equal(f.showCloseMsg.value,true)
    assert.equal(f.redirect.redirectPolicy.value.needsConfirmation,true)
    assert.equal(f.navigated.length,0)
    assert.equal(f.history.length,0)
    f.redirect.attemptRedirect();f.redirect.attemptRedirect()
    assert.deepEqual(f.navigated,['customapp://open','customapp://open'])
    assert.deepEqual(f.history,['customapp://open'])
    assert.equal(f.syncs,1)
  }finally{f.restore()}
})
test('分享模块取消时清除待跳转定时器，卸载移除监听',()=>{
  const f=redirectFixture()
  try{
    f.redirect.startRedirectLifecycle()
    f.hash('obsidian://open')
    assert.ok(f.listeners.has('hashchange'));assert.ok(f.listeners.has('load'))
    assert.equal(f.timers.size,1)
    f.redirect.cancelClose()
    assert.equal(f.timers.size,0);assert.equal(f.listeners.has('load'),false)
    assert.equal(f.showCloseMsg.value,false);assert.equal(f.navigated.length,0)
    f.redirect.stopRedirectLifecycle()
    assert.equal(f.listeners.size,0)
  }finally{f.restore()}
})
test('历史操作模块仅在删除成功后安排同步',()=>{
  let saved=false, syncs=0, errors=0
  const notices=[]
  const actions=useHistoryActions({historyStore:{remove:()=>saved,clear:()=>false,inspectImport:()=>{},mergeImport:()=>{}},
    showToast:message=>notices.push(message),notifyStorageError:()=>{errors++},autoSync:()=>{syncs++}})
  actions.deleteHistoryItem('https://example.com/')
  assert.equal(syncs,0);assert.equal(errors,1)
  saved=true;actions.deleteHistoryItem('https://example.com/')
  assert.equal(syncs,1);assert.deepEqual(notices,['已删除记录'])
})
