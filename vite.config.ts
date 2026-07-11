// vite.config.ts — 독립 실행형 Vue 3 클라이언트 (MobilPress)
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env 값 로드 (VITE_ 접두사 변수는 클라이언트 번들에 노출됨).
  const env = loadEnv(mode, __dirname, '')
  // 실제 백엔드로 프록시할 대상. 비어 있으면 프록시를 붙이지 않고
  // 앱은 내장 mock API(src/lib/mock-api.ts)로 완전 독립 동작합니다.
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? ''

  return {
    // GitHub Pages 배포 경로 (https://hungaseo-arch.github.io/mobilPress/)
    base: mode === 'production' ? '/mobilPress/' : '/',
    server: {
      host: '::',
      port: 5173,
      // VITE_API_PROXY_TARGET 를 지정하면 /api 요청을 실제 백엔드로 전달합니다.
      // (예: VITE_API_PROXY_TARGET=http://localhost:3100)
      proxy: apiProxyTarget
        ? {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
