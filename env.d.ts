/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 데이터 소스 모드: 'mock'(기본) | 'neon' | 'proxy'
  readonly VITE_DATA_MODE?: string
  // /api 요청을 프록시할 실제 백엔드 주소 (vite dev 서버에서만 사용).
  readonly VITE_API_PROXY_TARGET?: string
  // Neon Data API 엔드포인트 (Neon 콘솔 → Data API 활성화 후 발급)
  readonly VITE_NEON_DATA_API_URL?: string
  // Neon Auth (Stack Auth) 클라이언트 키
  readonly VITE_STACK_PROJECT_ID?: string
  readonly VITE_STACK_PUBLISHABLE_CLIENT_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
