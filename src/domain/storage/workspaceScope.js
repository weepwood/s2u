// 原工作区继续使用旧键；账号工作区使用固定命名空间，切换需完整重新挂载。
export const ACTIVE_WORKSPACE_KEY = 's2u_active_workspace_v1'
const PROFILE_PREFIX = 's2u_workspace_profile_v1:'
const DATA_PREFIX = 's2u_workspace_data_v1:'
export const LEGACY_WORKSPACE = 'legacy'
const TOKEN_KEYS = ['cloud_token_session','s2u_gist_session_binding_v1']
const local = {
  getItem: key => globalThis.localStorage.getItem(key),
  setItem: (key,value) => globalThis.localStorage.setItem(key,value),
  removeItem: key => globalThis.localStorage.removeItem(key),
  key: index => globalThis.localStorage.key(index),
  get length() { return globalThis.localStorage.length },
}
const session = {
  getItem: key => globalThis.sessionStorage.getItem(key),
  setItem: (key,value) => globalThis.sessionStorage.setItem(key,value),
  removeItem: key => globalThis.sessionStorage.removeItem(key),
}

export function accountWorkspace(login) {
  if (typeof login !== 'string') throw new Error('请输入 GitHub 用户名')
  const name = login.trim().toLowerCase()
  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/.test(name) || name.includes('--')) throw new Error('请输入有效的 GitHub 用户名')
  return 'account:' + name
}
function ownerOf(id) {
  if (id === LEGACY_WORKSPACE) return ''
  if (typeof id !== 'string' || !id.startsWith('account:') || accountWorkspace(id.slice(8)) !== id) throw new Error('工作区标识无效')
  return id.slice(8)
}
function scoped(raw,id) {
  ownerOf(id)
  const key = name => id === LEGACY_WORKSPACE ? name : DATA_PREFIX + id + ':' + name
  return Object.freeze({
    getItem: name => raw.getItem(key(name)),
    setItem: (name,value) => raw.setItem(key(name),value),
    removeItem: name => raw.removeItem(key(name)),
  })
}
export function openWorkspace({localStorage=local,sessionStorage=session}={}) {
  let id = LEGACY_WORKSPACE
  try {
    const saved = sessionStorage.getItem(ACTIVE_WORKSPACE_KEY)
    if (saved !== null) { ownerOf(saved); id = saved }
  } catch {
    // 无法读取/验证标签页工作区时，不回退到可能含他人数据的旧工作区。
    // 此隔离空间不读取历史凭据，连接与切换由界面明确提示。
    return Object.freeze({
      id:'unavailable',owner:'',unavailable:true,
      storage:blockedStorage(),session:blockedStorage(),
    })
  }
  return Object.freeze({id,owner:ownerOf(id),unavailable:false,storage:scoped(localStorage,id),session:scoped(sessionStorage,id)})
}
function blockedStorage() {
  function reject() { throw new Error('无法读取工作区，请检查浏览器存储权限') }
  return Object.freeze({getItem:reject,setItem:reject,removeItem:reject})
}
export function listWorkspaces(storage=local) {
  const profiles=[{id:LEGACY_WORKSPACE,label:'原工作区'}]
  for(let index=0;index<storage.length;index++){
    const key=storage.key(index)
    if(!key?.startsWith(PROFILE_PREFIX))continue
    const id=key.slice(PROFILE_PREFIX.length)
    try {
      const owner=ownerOf(id)
      const marker=JSON.parse(storage.getItem(key))
      if(owner && marker?.version===1 && marker.id===id) profiles.push({id,label:'@'+owner})
    } catch { /* 损坏的注册项不影响原数据 */ }
  }
  return [profiles[0],...profiles.slice(1).sort((a,b)=>a.label.localeCompare(b.label))]
}
export function createWorkspace(login,storage=local) {
  const id=accountWorkspace(login), key=PROFILE_PREFIX+id
  const marker=storage.getItem(key)
  if(marker===null) storage.setItem(key,JSON.stringify({version:1,id}))
  else {
    const value=JSON.parse(marker)
    if(value?.version!==1 || value.id!==id) throw new Error('工作区注册信息损坏，请先导出已有数据')
  }
  return id
}
export function activateWorkspace(id,{localStorage=local,sessionStorage=session}={}) {
  const owner=ownerOf(id)
  if(owner && !listWorkspaces(localStorage).some(profile=>profile.id===id)) throw new Error('请选择已创建的工作区')
  const current=openWorkspace({localStorage,sessionStorage})
  if(current.unavailable) throw new Error('当前工作区无法读取，请检查浏览器存储权限')
  if(current.id===id)return false
  // 切换前清理源和目的的会话凭据；保留所有业务数据及本地连接配置。
  for(const store of [current.session,scoped(sessionStorage,id)]) {
    for(const key of TOKEN_KEYS)store.removeItem(key)
  }
  sessionStorage.setItem(ACTIVE_WORKSPACE_KEY,id)
  return true
}

// 新账号首次连接绑定 GitHub 不可变数字 ID；改名/用户名被他人重新注册不会静默复用。
export function assertWorkspaceIdentity(workspace,user) {
  if(workspace.unavailable)throw new Error('当前工作区不可用')
  if(!workspace.owner)return
  if(typeof user?.login!=='string'||user.login.toLowerCase()!==workspace.owner)throw new Error('Token 所属账号与当前工作区不一致')
  if(!Number.isSafeInteger(user.id)||user.id<=0)throw new Error('无法验证 GitHub 账号 ID')
  const key='s2u_workspace_account_id_v1', previous=workspace.storage.getItem(key), identity=String(user.id)
  if(previous!==null && previous!==identity)throw new Error('GitHub 账号 ID 与工作区不一致，请勿继续同步')
  if(previous===null)workspace.storage.setItem(key,identity)
}
