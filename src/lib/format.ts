/** API Response 를 파싱하고, 서버가 { error } 를 돌려주면 예외로 변환합니다. */
export async function parseApi<T = unknown>(response: Response): Promise<T> {
  const data = await response.json().catch(() => {
    throw new Error('응답을 해석할 수 없습니다.')
  })
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error))
  }
  if (!response.ok) {
    throw new Error(`요청에 실패했습니다. (${response.status})`)
  }
  return data as T
}

/** 루피아 표기 — 천단위 콤마 구분 (예: Rp 1,350,000) */
export function formatIDR(value: number): string {
  return `Rp ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0)}`
}

/** 천 단위 구분 숫자 표기 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value || 0)
}

/** 'YYYY-MM-DD' → 'YYYY.MM.DD', 값이 없으면 '-' */
export function formatDate(value: string): string {
  return value ? value.replaceAll('-', '.') : '-'
}

/** ' / ' 로 이어진 제품명을 줄 단위 배열로 분리 (표시용) */
export function productLines(product: string): string[] {
  const lines = (product ?? '').split(' / ').map((v) => v.trim()).filter(Boolean)
  return lines.length ? lines : ['-']
}

// 운영팀 인원 (운영자료 > 운영팀 명단과 동기 유지).
// 장착 작업자 입력 시 후보로 제공하며, 통상 2~3인이 한 작업을 수행합니다.
export const operationTeam = ['Firman', 'Harun', 'Arun'] as const
