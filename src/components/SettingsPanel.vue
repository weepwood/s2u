<template>
  <dialog ref="dialog" class="cloud-dialog" aria-labelledby="sync-title" @close="$emit('close')" @click="onBackdrop">
    <header class="cloud-head">
      <div><h2 id="sync-title">云端同步</h2><span>GitHub Gist</span></div>
      <button type="button" class="cloud-close" aria-label="关闭云端同步" @click="dialog.close()">×</button>
    </header>
    <nav class="cloud-tabs" aria-label="同步管理">
      <button v-for="item in tabs" :key="item.id" type="button" :aria-pressed="tab === item.id" @click="switchTab(item.id)">{{ item.label }}</button>
    </nav>
    <p v-if="error || cloud.syncError.value" class="cloud-error" role="alert">{{ error || cloud.syncError.value }}</p>
    <section v-if="tab === 'connection'" class="cloud-body">
      <template v-if="!editing && cloud.cloudToken.value">
        <div class="cloud-account"><strong>{{ cloud.account.value || 'GitHub' }}</strong><span class="cloud-status" :data-status="cloud.syncStatus.value" role="status">{{ status }}</span></div>
        <dl class="cloud-details"><dt>Gist</dt><dd>{{ cloud.cloudGistId.value }}</dd><dt>最近同步</dt><dd>{{ cloud.lastSyncTime.value ? date(cloud.lastSyncTime.value) : '尚未验证' }}</dd></dl>
        <button type="button" class="cloud-primary" :disabled="busy" @click="$emit('sync', {})">立即同步</button>
        <div class="cloud-actions">
          <a :href="'https://gist.github.com/' + encodeURIComponent(cloud.cloudGistId.value)" target="_blank" rel="noopener noreferrer">打开 Gist ↗</a>
          <button type="button" :disabled="busy" @click="$emit('test')">测试连接</button>
          <button type="button" :disabled="busy" @click="editing = true; token = ''; gist = cloud.cloudGistId.value; mode = 'manual'">更换 Token / Gist</button>
          <button type="button" @click="disconnect">断开连接</button>
        </div>
        <div v-if="cloud.syncError.value.includes('双端冲突')" class="cloud-actions">
          <button type="button" @click="resolve('local')">保留本机收藏/设置</button>
          <button type="button" @click="resolve('remote')">保留云端收藏/设置</button>
        </div>
      </template>
      <template v-else>
        <div class="cloud-label">
          <label for="gist-token">GitHub Token</label>
          <a href="https://github.com/settings/personal-access-tokens/new?name=S2U%20Gist%20Sync&amp;description=S2U%20workspace%20sync&amp;expires_in=90&amp;gists=write" target="_blank" rel="noopener noreferrer">创建最小权限 Token ↗</a>
        </div>
        <input id="gist-token" v-model="token" :disabled="finding || busy" type="password" autocomplete="off" placeholder="粘贴 GitHub Token" aria-describedby="gist-token-note"/>
        <p id="gist-token-note" class="cloud-note">只需 Gist 读写权限，Token 仅保存在当前标签页会话。</p>
        <details class="token-guide">
          <summary>如何创建 Token？</summary>
          <div class="token-guide-body">
            <strong>推荐：Fine-grained token</strong>
            <ol>
              <li>点击上方创建入口，名称和 Gists 权限会预填。</li>
              <li>Resource owner 选择自己的账号，有效期建议 90 天。</li>
              <li>Repository access 选择 Public repositories（仅公开仓库），不要添加仓库权限。</li>
              <li>Permissions → Account permissions：仅添加 Gists，选择 Read and write。GitHub 自动附带的只读权限保持默认。</li>
              <li>确认权限后点击 Generate token，复制生成的 Token，返回本页粘贴。</li>
            </ol>
            <div class="token-guide-permission"><span>Gists</span><strong>Read and write</strong></div>
            <p>不需要 Contents、Actions、组织或其他账号权限。Gists 权限可访问该账号的 Gist，并非只限于 S2U 的单个 Gist。</p>
            <div class="token-guide-divider"></div>
            <strong>兼容：Tokens (classic)</strong>
            <p>仅勾选 <code>gist</code>，其余 scope 留空（包括 repo、workflow、user、admin:org）。</p>
            <a href="https://github.com/settings/tokens/new?description=S2U%20Gist%20Sync&amp;scopes=gist" target="_blank" rel="noopener noreferrer">创建 Classic Token ↗</a>
            <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener noreferrer">管理或撤销细粒度 Token ↗</a>
            <p>创建后请立即复制，不要分享 Token、截图或提交到代码仓库。读取成功不代表具备写权限。</p>
          </div>
        </details>
        <p class="cloud-note">Secret Gist 知道地址的人仍可能读取，请勿同步敏感链接。</p>
        <label for="gist-mode">连接方式</label>
        <select id="gist-mode" v-model="mode" :disabled="finding || busy"><option value="existing">查找已有 Gist</option><option value="manual">输入 Gist ID / 地址</option><option value="new">创建新的 Gist</option></select>
        <template v-if="mode === 'existing'">
          <button type="button" :disabled="!token.trim() || finding || busy" @click="discover">{{ finding ? '正在查找…' : '查找已有 Gist' }}</button>
          <select v-if="cloud.candidates.value.length" v-model="gist" aria-label="选择已有 Gist"><option value="">请选择同步文件</option><option v-for="item in cloud.candidates.value" :key="item.id" :value="item.id">{{ item.description }} · {{ item.id.slice(0,8) }}</option></select>
          <p v-if="searched && !cloud.candidates.value.length" class="cloud-note">未找到匹配文件，可手动指定或创建新的 Gist。</p>
        </template>
        <input v-if="mode === 'manual'" v-model="gist" aria-label="Gist ID 或地址" placeholder="Gist ID 或完整地址" autocomplete="off"/>
        <p v-if="mode === 'new'" class="cloud-note">将创建一个新的 Secret Gist，上传本机历史记录。</p>
        <button type="button" class="cloud-primary" :disabled="!token.trim() || busy || finding || (mode !== 'new' && !gist.trim())" @click="connect">{{ busy ? '处理中…' : '连接 Gist' }}</button>
        <button v-if="cloud.cloudToken.value" type="button" @click="editing = false; token = ''">取消更换</button>
        <button v-if="busy" type="button" @click="disconnect">取消连接</button>
      </template>
    </section>
    <section v-else-if="tab === 'preferences'" class="cloud-body">
      <label class="cloud-option"><span>自动同步</span><input type="checkbox" :checked="cloud.preferences.value.auto" @change="pref('auto', $event.target.checked)"/></label>
      <label class="cloud-option"><span>同步延迟</span><select :value="cloud.preferences.value.delay" @change="pref('delay', Number($event.target.value))"><option :value="3000">3 秒</option><option :value="5000">5 秒</option><option :value="10000">10 秒</option></select></label>
      <div class="cloud-divider"></div>
      <strong>同步内容</strong>
      <label class="cloud-option"><span>历史记录</span><input type="checkbox" checked disabled/></label>
      <label class="cloud-option"><span>常用链接、标签与排序</span><input type="checkbox" :checked="cloud.preferences.value.common" :disabled="busy" @change="pref('common', $event.target.checked)"/></label>
      <label class="cloud-option"><span>自定义应用图标</span><input type="checkbox" :disabled="!cloud.preferences.value.common || busy" :checked="cloud.preferences.value.icons" @change="pref('icons', $event.target.checked)"/></label>
      <label class="cloud-option"><span>深浅主题</span><input type="checkbox" :checked="cloud.preferences.value.theme" :disabled="busy" @change="pref('theme', $event.target.checked)"/></label>
      <p class="cloud-note">收藏及主题为可选同步。双端冲突会暂停；图标关闭不会删除云端已有图标。每份文件限制 900 KB。</p>
    </section>
    <section v-else class="cloud-body">
      <strong>本地同步前备份</strong>
      <p v-if="!cloud.backups.value.length" class="cloud-note">暂无备份</p>
      <div v-for="(item, index) in cloud.backups.value" :key="index" class="cloud-backup">
        <span>{{ date(item.savedAt) }} · {{ Math.ceil(item.bytes / 1024) }} KB</span>
        <div class="cloud-actions"><button type="button" @click="$emit('export-backup', index)">导出历史</button><button type="button" @click="$emit('export-bundle', index)">完整备份</button><button type="button" :disabled="busy" @click="$emit('restore', { index })">合并恢复</button></div>
      </div>
      <div class="cloud-divider"></div>
      <button type="button" :disabled="!cloud.cloudToken.value || busy" @click="loadVersions">查看云端版本历史</button>
      <div v-for="item in cloud.revisions.value" :key="item.version" class="cloud-backup"><span>{{ date(item.committedAt) }} · {{ item.version.slice(0,8) }}</span><button type="button" :disabled="busy" @click="$emit('restore', { version: item.version })">合并恢复</button></div>
      <p class="cloud-note">恢复会先保存当前历史，只合并本机记录，不直接覆盖远端。</p>
    </section>
  </dialog>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
const props = defineProps({ cloud: { type: Object, required: true } })
const emit = defineEmits(['close','connect','sync','disconnect','export-backup','export-bundle','restore','test'])
const cloud = props.cloud
const dialog = ref(null), tab = ref('connection'), token = ref(''), gist = ref(cloud.cloudGistId.value), mode = ref(gist.value ? 'manual' : 'existing')
const editing = ref(false), finding = ref(false), searched = ref(false), error = ref('')
const tabs = [{id:'connection',label:'连接'},{id:'preferences',label:'同步设置'},{id:'backup',label:'备份恢复'}]
const busy = computed(() => ['connecting','syncing'].includes(cloud.syncStatus.value))
const status = computed(() => ({connecting:'连接中',syncing:'同步中',connected:'已同步',error:'同步异常',ready:'待验证'}[cloud.syncStatus.value] || '未连接'))
const date = value => new Date(value).toLocaleString('zh-CN')
onMounted(() => dialog.value?.showModal())
function onBackdrop(event) { if (event.target === dialog.value) { const rect = dialog.value.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.value.close() } }
function switchTab(value) { tab.value = value; error.value = ''; if (value === 'backup') { try { cloud.refreshBackups() } catch (e) { error.value = e.message } } }
async function discover() { finding.value = true; error.value = ''; searched.value = false; gist.value = ''; try { await cloud.discover(token.value.trim()); searched.value = true } catch (e) { error.value = e.message } finally { finding.value = false } }
function connect() {
  const extra = [cloud.preferences.value.common && '收藏/标签/排序', cloud.preferences.value.icons && '图标', cloud.preferences.value.theme && '主题'].filter(Boolean)
  if (!confirm('连接后将合并本机历史' + (extra.length ? '及已开启的' + extra.join('、') : '') + '，并可能上传本机数据至选定 Gist。确认继续？')) return
  const options = { token: token.value, id: gist.value, create: mode.value === 'new' }
  editing.value = false; token.value = ''; error.value = ''
  emit('connect', options)
}
function disconnect() { emit('disconnect'); token.value = ''; editing.value = false; gist.value = cloud.cloudGistId.value; mode.value = gist.value ? 'manual' : 'existing' }
function pref(key, value) {
  if (value === true && ['common','icons','theme'].includes(key) && !confirm('开启后将同步此类数据到 Secret Gist，确认？')) return
  try {
    cloud.setPreferences({ [key]: value, ...(key === 'common' && !value ? { icons: false } : {}) })
    if (value === true && cloud.cloudToken.value && cloud.preferences.value.auto && !busy.value) emit('sync', {})
  } catch (e) { error.value = e.message }
}
function resolve(value) { if (confirm('将按所选方向处理收藏及主题冲突。请确认已备份数据，继续？')) emit('sync', { resolve: value }) }
async function loadVersions() { try { await cloud.loadRevisions() } catch (e) { error.value = e.message } }
</script>
<style scoped>
.cloud-dialog { box-sizing:border-box; width:min(540px,calc(100vw - 24px)); max-width:none; max-height: min(88vh, 760px); margin:auto; padding:22px; overflow:auto; border:1px solid var(--hairline-strong); border-radius:20px; color:var(--card-text); background:var(--card-bg-solid); box-shadow:0 24px 70px rgba(20,30,60,.28); }
.cloud-dialog::backdrop { background:rgba(17,25,44,.42); backdrop-filter:blur(5px); }
.cloud-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
.cloud-head h2 { margin:0; font-size:21px; letter-spacing:-.025em; }.cloud-head span { font-size:12px; color:var(--card-text-muted); }
.cloud-dialog :is(button,input,select) { font:inherit; color:inherit; }
.cloud-dialog button,.cloud-actions a { min-height:36px; box-sizing:border-box; border:1px solid var(--hairline); border-radius:10px; padding:7px 12px; background:var(--surface-elevated); font-size:13px; cursor:pointer; }
.cloud-dialog button:hover:not(:disabled) { background:var(--surface-hover); }.cloud-dialog button:disabled { opacity:.5; cursor:not-allowed; }
.cloud-dialog .cloud-close { width:34px; height:34px; min-height:34px; padding:0; font-size:23px; line-height:1; }
.cloud-tabs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; padding:4px; border:1px solid var(--hairline); border-radius:13px; background:var(--surface-soft); margin-bottom:18px; }
.cloud-tabs button { border-color:transparent; background:transparent; padding:6px 4px; white-space:nowrap; }
.cloud-tabs button[aria-pressed=true] { background:var(--card-bg-solid); border-color:var(--hairline); color:var(--card-text); box-shadow:0 2px 6px rgba(20,30,60,.08); }
.cloud-body { display:grid; gap:13px; font-size:13px; min-width:0; }.cloud-label,.cloud-account,.cloud-option,.cloud-backup { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.cloud-label a,.cloud-actions a { color:var(--accent); text-decoration:none; }
.cloud-body input:not([type=checkbox]),.cloud-body select { box-sizing:border-box; width:100%; min-width:0; min-height:44px; background:var(--surface-elevated); border:1px solid var(--hairline); border-radius:12px; padding:0 12px; font-size:14px; }
.cloud-option select { width:auto; min-height:36px; }.cloud-option input { accent-color:var(--accent); width:18px; height:18px; }
.cloud-note,.cloud-error { margin:0; font-size:12px; line-height:1.6; overflow-wrap:anywhere; color:var(--card-text-muted); }.cloud-error { color:var(--danger); margin-bottom:12px; }
.cloud-status { color:var(--card-text-muted); font-size:12px; }.cloud-status[data-status=connected] { color:var(--success); }
.cloud-details { display:grid; grid-template-columns:auto minmax(0,1fr); gap:9px 14px; margin:0; padding:14px; background:var(--surface-soft); border-radius:12px; }.cloud-details dt { color:var(--card-text-muted); }.cloud-details dd { margin:0; overflow-wrap:anywhere; text-align:right; }
.cloud-actions { display:flex; flex-wrap:wrap; gap:6px; }.cloud-dialog .cloud-primary { background:var(--accent); border-color:var(--accent); color:var(--on-accent,#fff); min-height:42px; }.cloud-dialog .cloud-primary:hover:not(:disabled) { background:var(--accent-hover); }
.cloud-divider { height:1px; background:var(--hairline); }.cloud-backup { padding:10px; background:var(--surface-soft); border-radius:10px; }
.token-guide { border:1px solid var(--hairline); border-radius:12px; background:var(--surface-soft); min-width:0; }
.token-guide summary { cursor:pointer; padding:11px 12px; color:var(--card-text-soft); font-size:12px; font-weight:650; }
.token-guide[open] summary { border-bottom:1px solid var(--hairline); }
.token-guide-body { display:grid; gap:9px; padding:12px; font-size:12px; line-height:1.6; overflow-wrap:anywhere; }
.token-guide-body ol { margin:0; padding-inline-start:20px; display:grid; gap:5px; }
.token-guide-body p { margin:0; color:var(--card-text-muted); }
.token-guide-body a { width:fit-content; color:var(--accent); font-weight:600; text-decoration:none; }
.token-guide-body a:hover { text-decoration:underline; }
.token-guide-permission { display:flex; flex-wrap:wrap; justify-content:space-between; gap:6px; background:var(--surface-elevated); border:1px solid var(--hairline); border-radius:8px; padding:8px 10px; }
.token-guide-permission strong { color:var(--accent); }
.token-guide-divider { height:1px; background:var(--hairline); margin-block:2px; }
.cloud-dialog :is(button,input,select,a,summary):focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
@media(max-width:420px) { .cloud-dialog { padding:16px; } .cloud-actions button { font-size:12px; } }
</style>
