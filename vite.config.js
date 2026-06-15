import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/s2u/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src',
      'components': '/src/components',
    }
  }
})
