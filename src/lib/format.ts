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

/** 루피아 표기 — 천단위 콤마 구분, 정수 (예: Rp 1,350,000).
    디자인 가이드 9-3 은 통화코드(IDR) 병기를 예시로 들지만, 이 앱은 인도네시아 현장에서
    쓰이는 화면이라 통용 표기인 'Rp' 를 유지한다. 콤마·정수 규칙은 가이드 그대로. */
export function formatIDR(value: number): string {
  return `Rp ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0)}`
}

/** 천 단위 구분 숫자 표기 — 영미식(콤마), 사내 문서 표준 (디자인 가이드 9-3) */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value || 0)
}

/** 비율 표기 — 소수점 첫째 자리 고정 (디자인 가이드 9-3) */
export function formatPercent(value: number): string {
  return `${(value || 0).toFixed(1)}%`
}

/** 날짜 표기 — ISO 8601 'YYYY-MM-DD' 고정 (디자인 가이드 9-2), 값이 없으면 '-' */
export function formatDate(value: string): string {
  return value || '-'
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** ISO 타임스탬프 → 'YYYY-MM-DD', 값이 없거나 파싱 실패 시 '-' */
export function formatDay(iso: string): string {
  const d = new Date(iso)
  if (!iso || Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ISO 타임스탬프 → 'YYYY-MM-DD HH:mm', 값이 없거나 파싱 실패 시 '-' */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (!iso || Number.isNaN(d.getTime())) return '-'
  return `${formatDay(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 장착 위치 값을 Google 지도 링크로 변환합니다.
    입력은 두 가지를 모두 허용합니다 — 붙여넣은 지도 링크(그대로 사용) 또는
    'lat, lng' 좌표(검색 URL 로 변환). 값이 없으면 빈 문자열을 돌려줍니다. */
export function mapsUrl(value: string): string {
  const query = (value ?? '').trim()
  if (!query) return ''
  if (/^https?:\/\//i.test(query)) return query
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** ' / ' 로 이어진 제품명을 줄 단위 배열로 분리 (표시용) */
export function productLines(product: string): string[] {
  const lines = (product ?? '').split(' / ').map((v) => v.trim()).filter(Boolean)
  return lines.length ? lines : ['-']
}

// 운영팀 인원 (운영자료 > 운영팀 명단과 동기 유지).
// 장착 작업자 입력 시 후보로 제공하며, 통상 2~3인이 한 작업을 수행합니다.
export const operationTeam = ['Firman', 'Harun', 'Arun'] as const
