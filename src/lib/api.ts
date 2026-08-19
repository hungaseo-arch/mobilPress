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

// neonFetch/mockFetch 는 실제로 쓰이는 쪽만 번들에 포함되도록 분기 시점에 동적 import 합니다.
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  if (dataMode === 'neon') return (await import('@/lib/neon-api')).neonFetch(path, options)
  if (dataMode === 'mock') return (await import('@/lib/mock-api')).mockFetch(path, options)
  return fetch(`/api${path}`, options)
}
