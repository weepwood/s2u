import { createApp } from 'vue'
import App from './App.vue'
import { installCardHeightTransition } from './utils/cardHeightTransition.js'
import { installInterfaceMotion } from './utils/interfaceMotion.js'
import { installDialogLightDismiss } from './utils/dialogLightDismiss.js'
import './styles/interface-refresh.css'
import './styles/long-link-guards.css'
import './styles/workspace-polish.css'

createApp(App).mount('#app')

const disposeCardHeightTransition = installCardHeightTransition()
const disposeInterfaceMotion = installInterfaceMotion()
const disposeDialogLightDismiss = installDialogLightDismiss()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeCardHeightTransition()
    disposeInterfaceMotion()
    disposeDialogLightDismiss()
  })
}
