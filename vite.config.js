import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

function resolvePublicPath(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const baseUrl = env.VITE_PUBLIC_BASE_URL?.trim()
  if (!baseUrl) return '/'

  let url
  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error('VITE_PUBLIC_BASE_URL 必须是完整的 HTTP/HTTPS URL')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash) {
    throw new Error('VITE_PUBLIC_BASE_URL 只允许不带账户信息、查询参数及 Hash 的 HTTP/HTTPS 地址')
  }

  return url.pathname.endsWith('/') ? url.pathname : url.pathname + '/'
}

export default defineConfig(({ mode }) => ({
  // Vite 资源地址与公开分享链接使用同一个路径前缀。
  base: resolvePublicPath(mode),
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src',
      components: '/src/components',
    },
  },
}))
