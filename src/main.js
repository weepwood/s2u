import { createApp } from 'vue'
import App from './App.vue'
import { installCardHeightTransition } from './utils/cardHeightTransition.js'

createApp(App).mount('#app')

const disposeCardHeightTransition = installCardHeightTransition()

if (import.meta.hot) {
  import.meta.hot.dispose(disposeCardHeightTransition)
}
