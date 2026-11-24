import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { useCloudSync } from '../src/composables/useCloudSync.js'
import { parseGistId, readFile, encodeFile } from '../src/domain/sync/gistClient.js'
import { samePayload, mergeWorkspace } from '../src/domain/sync/syncEngine.js'

const storage = new Map(), session = new Map()
const makeStorage = store => ({ getItem: key => store.get(key) ?? null, setItem: (key,value) => store.set(key,String(value)), removeItem: key => store.delete(key) })
globalThis.localStorage = makeStorage(storage)
globalThis.sessionStorage = makeStorage(session)
const originalFetch = globalThis.fetch
const ID = 'abcde12345', FILE = 'scheme-history.json'
const history = revision => ({ format:'s2u-history', version:2, records: revision ? [{ scheme:'https://example.com/'+revision, count:1, recently:1000, updatedAt:1000 }] : [], tombstones:[] })
const reply = value => ({ ok:true, status:200, json:async()=>value })
const gist = data => ({ id:ID, public:false, owner:{login:'test-user'}, files:{[FILE]:{content:JSON.stringify(data)}} })
function setup() {
  const sync=useCloudSync()
  sync.cloudToken.value='test-token'; sync.cloudGistId.value=ID; sync.account.value='test-user'
  return sync
}
afterEach(()=>{ globalThis.fetch=originalFetch; storage.clear(); session.clear() })

test('无变化不写入，忽略快照顶层时间戳', async()=>{
  const sync=setup(); let patches=0
  globalThis.fetch=async(_url,opts)=>{ if(opts.method==='PATCH') patches++; return reply(gist({...history(0),updatedAt:1})) }
  await sync.pullFromGist()
  assert.equal(await sync.pushToGist({...history(0),updatedAt:2}),true)
  assert.equal(patches,0); assert.equal(sync.pending.value,false); assert.equal(sync.syncStatus.value,'connected')
})
test('先备份再写入并重新读取验证，备份不含 Token', async()=>{
  const sync=setup(); let data=history(0), patches=0
  globalThis.fetch=async(_url,opts)=>{ if(opts.method==='PATCH'){ patches++; assert.ok(sync.getLatestRecovery()); data=JSON.parse(JSON.parse(opts.body).files[FILE].content) } return reply(gist(data)) }
  await sync.pullFromGist()
  assert.equal(await sync.pushToGist(history(1)),true)
  assert.equal(patches,1); assert.deepEqual(data,history(1)); assert.deepEqual(sync.getLatestRecovery(),history(0))
  assert.doesNotMatch(JSON.stringify([...storage]),/test-token/)
})
test('写入验证失败保留待同步状态', async()=>{
  const sync=setup(); globalThis.fetch=async()=>reply(gist(history(0)))
  await sync.pullFromGist()
  await assert.rejects(sync.pushToGist(history(1)),/写入后验证失败/)
  assert.equal(sync.pending.value,true); assert.equal(storage.get('s2u_gist_pending_'+ID),'1')
})
test('主动取消不误报错误', async()=>{
  const sync=setup(); globalThis.fetch=async()=>reply(gist(history(0)))
  await sync.pullFromGist()
  globalThis.fetch=(_url,opts)=>new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))
  const task=sync.pushToGist(history(1)); sync.cleanup()
  await assert.rejects(task,/请求已取消/); assert.notEqual(sync.syncStatus.value,'error')
})
test('远端发生变化拒绝 PATCH',async()=>{
  const sync=setup();let data=history(0),patches=0
  globalThis.fetch=async(_url,opts)=>{if(opts.method==='PATCH')patches++;return reply(gist(data))}
  await sync.pullFromGist();data=history(2)
  await assert.rejects(sync.pushToGist(history(1)),/已被其它设备修改/)
  assert.equal(patches,0)
})
test('备份失败停止写入',async()=>{
  const sync=setup();let patches=0
  globalThis.fetch=async(_url,opts)=>{if(opts.method==='PATCH')patches++;return reply(gist(history(0)))}
  await sync.pullFromGist()
  const set=localStorage.setItem
  localStorage.setItem=()=>{throw new Error('quota')}
  try{await assert.rejects(sync.pushToGist(history(1)),/无法保存同步前备份/);assert.equal(patches,0)}finally{localStorage.setItem=set}
})
test('截断文件与公开或其他账户 Gist 拒绝写入',async()=>{
  const sync=setup(); let patches=0
  globalThis.fetch=async(_url,opts)=>{if(opts.method==='PATCH')patches++;const g=gist(history(0));g.files[FILE].truncated=true;return reply(g)}
  assert.equal(await sync.pullFromGist(),null);assert.match(sync.syncError.value,/截断/)
  globalThis.fetch=async()=>reply({...gist(history(0)),public:true})
  assert.equal(await sync.pullFromGist(),null)
  globalThis.fetch=async()=>reply({...gist(history(0)),owner:{login:'other'}})
  assert.equal(await sync.pullFromGist(),null);assert.equal(patches,0)
})
test('发现与手动连接不自动创建新文件，断开仅清除会话 Token',async()=>{
  const sync=useCloudSync();let posts=0
  globalThis.fetch=async(url,opts)=>{if(opts.method==='POST')posts++;if(url.endsWith('/user'))return reply({login:'test-user'});if(url.includes('/gists?'))return reply([gist(history(0)),{...gist(history(0)),public:true}]);return reply(gist(history(0)))}
  const candidates=await sync.discover('test-token')
  assert.equal(candidates.length,1)
  await sync.connect(history(0),{token:'test-token',id:ID})
  assert.equal(session.get('cloud_token_session'),'test-token')
  assert.equal(posts,0)
  sync.disconnect();assert.equal(session.has('cloud_token_session'),false);assert.equal(storage.get('cloud_gist_id'),ID)
})
test('Gist ID 与文件安全限制',()=>{
  assert.equal(parseGistId('https://gist.github.com/user/'+ID),ID)
  assert.throws(()=>parseGistId('https://evil.example/'+ID))
  assert.throws(()=>parseGistId('https://gist.github.com@evil.example/'+ID))
  assert.throws(()=>readFile({files:{[FILE]:{content:'{}',truncated:true}}},FILE),/截断/)
  assert.throws(()=>encodeFile({x:'a'.repeat(900001)}),/900 KB/)
})
test('收藏快照三方合并保留单端删除，双端冲突停止',()=>{
  const base={items:[{id:'a'},{id:'b'}]},local={items:[{id:'b'}]},remote={items:[{id:'a'},{id:'c'}]}
  assert.deepEqual(mergeWorkspace(local,base,base),local)
  assert.deepEqual(mergeWorkspace(base,remote,base),remote)
  assert.throws(()=>mergeWorkspace(local,remote,base),/双端冲突/)
  assert.throws(()=>mergeWorkspace(local,remote,null),/双端冲突/)
  assert.equal(samePayload({version:1,items:[1,2]},{version:1,items:[2,1]}),false)
})
test('推送失败后仍处理同连接最新排队快照',async()=>{
  const sync=setup();let data=history(0),patches=0,resolveFirst
  globalThis.fetch=async(_url,opts)=>{
    if(opts.method==='PATCH'){
      patches++
      if(patches===1)return new Promise(resolve=>{resolveFirst=resolve})
      data=JSON.parse(JSON.parse(opts.body).files[FILE].content)
    }
    return reply(gist(data))
  }
  await sync.pullFromGist()
  const first=sync.pushToGist(history(1))
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(patches,1)
  const second=sync.pushToGist(history(2))
  resolveFirst({ok:false,status:500})
  assert.equal(await first,true);assert.equal(await second,true)
  assert.equal(patches,2);assert.deepEqual(data,history(2))
})


test('拉取失败清除旧观察状态，禁止使用旧快照推送',async()=>{
  const sync=setup(); let patches=0
  globalThis.fetch=async()=>reply(gist(history(0)))
  await sync.pullFromGist()
  globalThis.fetch=async(_url,opts)=>{if(opts.method==='PATCH')patches++;return {ok:false,status:503}}
  assert.equal(await sync.pullFromGist(),null)
  await assert.rejects(sync.pushToGist(history(1)),/禁止写入/)
  assert.equal(patches,0)
})
test('只读连接测试不写入 Gist',async()=>{
  const sync=setup();let writes=0
  globalThis.fetch=async(url,opts)=>{if(opts.method!=='GET')writes++;return reply(url.endsWith('/user')?{login:'test-user'}:gist(history(0)))}
  assert.deepEqual(await sync.testConnection(),history(0))
  assert.equal(writes,0)
})
