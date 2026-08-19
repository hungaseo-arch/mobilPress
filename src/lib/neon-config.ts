// Neon 설정 여부만 판정하는 모듈 — SDK(@neondatabase/neon-js)는 import 하지 않습니다.
// mock/proxy 모드에서 Neon SDK 청크가 전혀 요청되지 않도록, 이 값을 참조하는
// auth-state.ts 등은 반드시 이 파일만 정적 import 해야 합니다.
export const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL ?? ''
export const NEON_DATA_API_URL = import.meta.env.VITE_NEON_DATA_API_URL ?? ''
export const isNeonConfigured = Boolean(NEON_AUTH_URL && NEON_DATA_API_URL)
