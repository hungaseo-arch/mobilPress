// vite.config.ts — 독립 실행형 Vue 3 클라이언트 (MobilPress)
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * neon 모드 빌드에서 Neon SDK 청크(neon / neon-auth / neon-api)를 <link rel="modulepreload"> 로
 * 미리 내려받게 합니다. 이 청크들은 mock 번들을 가볍게 하려고 동적 import 로 분리돼 있지만,
 * neon 모드에서는 첫 화면(로그인 게이트)이 반드시 필요로 하므로, index 청크를 파싱한 뒤에야
 * 요청이 시작되는 "폭포"를 없애는 편이 빠릅니다(docs/CHANGELOG.md 2026-09-06).
 */
function preloadNeonChunks(dataMode: string): Plugin {
  const NEON_CHUNKS = new Set(['neon', 'neon-auth', 'neon-api'])
  let base = '/'
  return {
    name: 'mobilpress:preload-neon-chunks',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (dataMode !== 'neon' || !ctx.bundle) return []
        return Object.values(ctx.bundle)
          .filter((c) => c.type === 'chunk' && NEON_CHUNKS.has(c.name))
          .map((c) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: base + c.fileName },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

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
    plugins: [vue(), tailwindcss(), preloadNeonChunks(env.VITE_DATA_MODE ?? 'mock')],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (/[\\/](@neondatabase|@better-auth|zod)[\\/]/.test(id)) return 'neon'
            if (/[\\/](vue|@vue|vue-router|pinia|vue-demi)[\\/]/.test(id)) return 'vue'
            if (id.includes('lucide')) return 'icons'
            return 'vendor'
          },
        },
      },
    },
  }
})
