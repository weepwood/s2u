<template>
  <dialog ref="dialog" class="qr-share-dialog" aria-labelledby="qr-share-title" @close="emit('close')" @click="onBackdrop">
    <div class="qr-share-inner">
      <header class="qr-share-heading">
        <div><h2 id="qr-share-title">分享二维码</h2><p>仅在本地生成，不会上传目标地址</p></div>
        <button type="button" class="qr-share-close" aria-label="关闭二维码" @click="dialog?.close()">×</button>
      </header>
      <div class="qr-share-preview">
        <canvas ref="canvas" width="288" height="288" role="img" aria-label="分享链接二维码"></canvas>
      </div>
      <p v-if="error" class="qr-share-error" role="alert">{{ error }}</p>
      <p v-else class="qr-share-hint">使用手机相机扫码，打开的是 s2u 分享链接。是否能启动目标应用取决于系统及浏览器。</p>
      <p class="qr-share-url" :title="shareUrl">{{ shareUrl }}</p>
      <div class="qr-share-actions">
        <button type="button" :disabled="!!error || busy" @click="download">保存 PNG</button>
        <button type="button" class="qr-share-primary" @click="copy">复制链接</button>
      </div>
      <p v-if="message" class="qr-share-message" role="status">{{ message }}</p>
    </div>
  </dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ shareUrl: { type: String, required: true } })
const emit = defineEmits(['close'])
const dialog = ref(null)
const canvas = ref(null)
const error = ref('')
const message = ref('')
const busy = ref(true)

function onBackdrop(event) {
  if (event.target === dialog.value) dialog.value.close()
}

async function renderQr() {
  busy.value = true
  try {
    const { default: QrCreator } = await import('../vendor/qr-creator.js')
    if (!canvas.value) return
    QrCreator.render({
      text: props.shareUrl,
      size: 288,
      ecLevel: 'M',
      quiet: 4,
      fill: '#172033',
      background: '#ffffff',
      radius: 0,
    }, canvas.value)
    // The encoder returns no matrix when the URL exceeds QR capacity.
    const pixels = canvas.value.getContext('2d').getImageData(0, 0, 288, 288).data
    if (!pixels.some((value, index) => index % 4 === 3 && value > 0)) {
      throw new Error('链接太长，无法容纳到二维码中，请改用复制链接')
    }
  } catch (cause) {
    error.value = cause?.message || '二维码生成失败，请复制分享链接'
  } finally {
    busy.value = false
  }
}

function download() {
  if (!canvas.value || error.value || busy.value) return
  busy.value = true
  try {
    const anchor = document.createElement('a')
    anchor.href = canvas.value.toDataURL('image/png')
    anchor.download = 's2u-share-qr.png'
    anchor.click()
    message.value = '二维码已准备下载'
  } catch {
    error.value = '无法保存图片，请检查浏览器设置'
  } finally {
    busy.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(props.shareUrl)
    message.value = '分享链接已复制'
  } catch {
    message.value = '复制失败，请手动选中链接'
  }
}

onMounted(() => {
  dialog.value?.showModal()
  renderQr()
})
</script>

<style scoped>
.qr-share-dialog { border: 1px solid var(--hairline, #dce1e9); border-radius: 20px; padding: 0; background: var(--card-bg-solid, #fff); color: var(--card-text, #172033); width: min(420px, calc(100vw - 32px)); max-height: 90dvh; box-shadow: 0 22px 72px #0003; }
.qr-share-dialog::backdrop { background: #0a122080; backdrop-filter: blur(5px); }
.qr-share-inner { padding: 22px; display: grid; gap: 16px; min-width: 0; }
.qr-share-heading { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
.qr-share-heading h2 { margin: 0; font-size: 21px; }
.qr-share-heading p, .qr-share-hint { margin: 6px 0 0; font-size: 12px; line-height: 1.6; color: var(--card-text-muted, #7c879b); }
.qr-share-close { background: transparent; border: 0; font-size: 28px; cursor: pointer; color: inherit; }
.qr-share-preview { display: grid; place-items: center; background: #fff; border-radius: 14px; padding: 14px; width: fit-content; max-width: 100%; justify-self: center; }
.qr-share-preview canvas { width: min(288px, calc(100vw - 110px)); height: auto; aspect-ratio: 1; display: block; }
.qr-share-url { font-size: 12px; padding: 10px; margin: 0; border-radius: 9px; word-break: break-all; max-height: 75px; overflow: auto; background: var(--surface-soft, #f5f7fa); }
.qr-share-error { color: var(--danger, #d84b55); font-size: 13px; }
.qr-share-actions { display: flex; gap: 10px; }
.qr-share-actions button { border: 1px solid var(--hairline, #dce1e9); border-radius: 10px; padding: 10px 12px; font: inherit; cursor: pointer; flex: 1; color: inherit; background: var(--surface-elevated, #fff); }
.qr-share-actions button:disabled { opacity: .5; cursor: not-allowed; }
.qr-share-actions .qr-share-primary { background: var(--accent, #4f6ef7); border-color: var(--accent, #4f6ef7); color: #fff; }
.qr-share-message { font-size: 12px; margin: 0; }
@media (prefers-reduced-motion: reduce) { .qr-share-dialog::backdrop { backdrop-filter: none; } }
</style>
