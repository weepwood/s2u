import test from 'node:test'
import assert from 'node:assert/strict'
import { openWorkspace, accountWorkspace, createWorkspace, listWorkspaces, activateWorkspace, assertWorkspaceIdentity, ACTIVE_WORKSPACE_KEY } from '../src/domain/storage/workspaceScope.js'
import { useCloudSync } from '../src/composables/useCloudSync.js'
import { useHistory } from '../src/composables/useHistory.js'
import { useCommonLinks } from '../src/composables/useCommonLinks.js'

function memory() {
  const map=new Map()
  return {get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}
}
function fixture(){return {localStorage:memory(),sessionStorage:memory()}}
test('账号标识规范化且不能注入任意存储键',()=>{
  assert.equal(accountWorkspace(' Alice '),'account:alice')
  for(const name of ['','a:b','../a','a--b','-a','a-','__proto__','a'.repeat(40)])assert.throws(()=>accountWorkspace(name))
})
test('原工作区与两个账号隔离，切换不删除旧数据、不复制数据',()=>{
  const env=fixture(),legacy=openWorkspace(env)
  legacy.storage.setItem('scheme_history','legacy')
  legacy.storage.setItem('s2u_common_links_v1','old')
  legacy.session.setItem('cloud_token_session','old-token')
  const a=createWorkspace('Alice',env.localStorage), b=createWorkspace('Bob',env.localStorage)
  assert.equal(listWorkspaces(env.localStorage).length,3)
  assert.equal(activateWorkspace(a,env),true)
  const one=openWorkspace(env)
  assert.equal(one.storage.getItem('scheme_history'),null)
  assert.equal(one.session.getItem('cloud_token_session'),null)
  assert.equal(legacy.session.getItem('cloud_token_session'),null)
  one.storage.setItem('scheme_history','alice')
  one.storage.setItem('s2u_workspace_before_restore_v1','alice-backup')
  one.session.setItem('cloud_token_session','alice-token')
  activateWorkspace(b,env)
  const two=openWorkspace(env)
  assert.equal(two.storage.getItem('scheme_history'),null)
  assert.equal(two.storage.getItem('s2u_workspace_before_restore_v1'),null)
  assert.equal(two.session.getItem('cloud_token_session'),null)
  two.storage.setItem('scheme_history','bob')
  activateWorkspace(a,env)
  assert.equal(openWorkspace(env).storage.getItem('scheme_history'),'alice')
  assert.equal(openWorkspace(env).session.getItem('cloud_token_session'),null)
  activateWorkspace('legacy',env)
  assert.equal(openWorkspace(env).storage.getItem('scheme_history'),'legacy')
  assert.equal(openWorkspace(env).storage.getItem('s2u_common_links_v1'),'old')
  assert.equal(one.storage.getItem('scheme_history'),'alice')
})
test('两个标签页选择独立，已打开的适配器保持固定工作区',()=>{
  const env=fixture(), second={...env,sessionStorage:memory()}
  const a=createWorkspace('alice',env.localStorage)
  activateWorkspace(a,env)
  const first=openWorkspace(env), other=openWorkspace(second)
  first.storage.setItem('dark_mode','true')
  assert.equal(other.storage.getItem('dark_mode'),null)
  other.storage.setItem('dark_mode','false')
  activateWorkspace('legacy',env)
  first.storage.setItem('dark_mode','true')
  assert.equal(other.storage.getItem('dark_mode'),'false')
})
test('无效工作区不回退到原工作区；未注册工作区不能切换',()=>{
  const env=fixture()
  env.localStorage.setItem('scheme_history','private')
  assert.throws(()=>activateWorkspace('account:unknown',env),/已创建/)
  env.sessionStorage.setItem(ACTIVE_WORKSPACE_KEY,'invalid')
  const scope=openWorkspace(env)
  assert.equal(scope.unavailable,true)
  assert.throws(()=>scope.storage.getItem('scheme_history'),/无法读取/)
})
test('工作区匹配账号且绑定不可变数字 ID',()=>{
  const env=fixture()
  activateWorkspace(createWorkspace('alice',env.localStorage),env)
  const scope=openWorkspace(env)
  assert.throws(()=>assertWorkspaceIdentity(scope,{login:'bob',id:1}),/不一致/)
  assert.throws(()=>assertWorkspaceIdentity(scope,{login:'alice'}),/账号 ID/)
  assertWorkspaceIdentity(scope,{login:'Alice',id:123})
  assertWorkspaceIdentity(scope,{login:'alice',id:123})
  assert.throws(()=>assertWorkspaceIdentity(scope,{login:'alice',id:124}),/账号 ID 与工作区不一致/)
})
test('实际历史、收藏与连接设置使用同一工作区适配器',()=>{
  const env=fixture(),legacy=openWorkspace(env)
  const old=useHistory(legacy.storage);old.add('https://legacy.example/')
  const a=createWorkspace('alice',env.localStorage)
  activateWorkspace(a,env)
  const scope=openWorkspace(env),history=useHistory(scope.storage),common=useCommonLinks(scope.storage),cloud=useCloudSync(scope)
  history.load();assert.equal(history.history.value.length,0)
  history.add('https://alice.example/')
  common.load();assert.equal(common.links.value.length,4)
  cloud.setPreferences({common:true,auto:false})
  assert.equal(legacy.storage.getItem('s2u_gist_preferences_v1'),null)
  assert.match(legacy.storage.getItem('scheme_history'),/legacy.example/)
  assert.doesNotMatch(legacy.storage.getItem('scheme_history'),/alice.example/)
})
test('连接错误账号不会创建 Gist 或保存 Token',async()=>{
  const env=fixture()
  activateWorkspace(createWorkspace('alice',env.localStorage),env)
  const scope=openWorkspace(env),cloud=useCloudSync(scope)
  const original=globalThis.fetch
  let posts=0
  globalThis.fetch=async(_url,opts)=>{if(opts.method==='POST')posts++;return {ok:true,status:200,json:async()=>({login:'bob',id:456})}}
  try{
    await assert.rejects(cloud.connect({records:[]},{token:'test-token',create:true}),/不一致/)
    assert.equal(posts,0);assert.equal(scope.session.getItem('cloud_token_session'),null)
  }finally{globalThis.fetch=original}
})
