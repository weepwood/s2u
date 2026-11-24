import { defineAsyncComponent, defineComponent, h, shallowRef } from 'vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { createResourceLoader } from '../utils/resourceLoader.js'

// Vue 保留异步组件原生 ref/props/emit 转发。反馈组件不接收业务属性。
export function createAsyncView(importer, { label, panelId, labelledBy, cancel } = {}) {
  const load = createResourceLoader(importer)
  const view = shallowRef()
  const retry = () => { view.value = makeView() }

  function feedback(failed) {
    return defineComponent({
      inheritAttrs: false,
      setup() {
        const message = () => h('p', { role: failed ? 'alert' : 'status' },
          failed ? '界面加载失败。请检查网络后重试；如仍失败，请保留输入后刷新页面。' : '正在加载界面…')
        const actions = () => h('div', { class: 'lazy-view-actions' }, [
          failed && h(BaseButton, { onClick: retry, variant: 'primary' }, () => '重试加载'),
          cancel && h(BaseButton, { onClick: cancel }, () => '取消'),
        ])
        if (cancel) {
          return () => h(BaseDialog, {
            class: 'editor-dialog lazy-view-dialog', 'aria-label': '加载' + label, onClose: cancel,
          }, () => [h('h2', label), message(), actions()])
        }
        return () => h('div', {
          class: 'lazy-panel-loading', id: panelId, role: panelId ? 'tabpanel' : undefined,
          'aria-labelledby': labelledBy, 'aria-busy': !failed,
        }, [message(), failed && actions()])
      },
    })
  }

  function makeView() {
    return defineAsyncComponent({
      loader: load, loadingComponent: feedback(false), errorComponent: feedback(true),
      delay: cancel ? 0 : 120, suspensible: false,
    })
  }
  view.value = makeView()
  return { view, warm: () => load().catch(() => {}) }
}
