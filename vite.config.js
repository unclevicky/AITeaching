import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    // 关键：增加请求体大小限制，音频 base64 数据可能达到 200KB+
    // Vite 底层使用 connect bodyParser，默认限制可能导致 413
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        configure: (proxy) => {
          // 不限制请求体大小
          proxy.on('proxyReq', (proxyReq, req) => {
            // 移除可能导致 413 的 content-length 检查
            proxyReq.removeHeader('content-length')
          })
          proxy.on('error', (err) => {
            console.error('[vite api proxy error]', err.message)
          })
        }
      },
      '/ws': {
        target: 'ws://localhost:3003',
        ws: true,
        onError: (err) => {
          if (err.code === 'ECONNABORTED') return
          console.error('[vite ws proxy]', err)
        }
      }
    }
  }
})
