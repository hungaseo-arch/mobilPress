import { mockFetch } from '@/lib/mock-api'
import { neonFetch } from '@/lib/neon-api'

// 데이터 소스 모드 (VITE_DATA_MODE 로 선택):
//   'mock'  — 내장 mock API + localStorage. 기본값 (Neon 미가입 상태).
//   'neon'  — Neon Data API + Neon Auth. docs/NEON-SETUP.md 참고.
//   'proxy' — /api 를 자체 백엔드로 프록시 (VITE_API_PROXY_TARGET, vite.config.ts).
type DataMode = 'mock' | 'neon' | 'proxy'

function resolveMode(): DataMode {
  const mode = import.meta.env.VITE_DATA_MODE
  if (mode === 'neon' || mode === 'proxy' || mode === 'mock') return mode
  if (import.meta.env.VITE_API_PROXY_TARGET) return 'proxy'
  return 'mock'
}

export const dataMode = resolveMode()

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  if (dataMode === 'neon') return neonFetch(path, options)
  if (dataMode === 'mock') return mockFetch(path, options)
  return fetch(`/api${path}`, options)
}
