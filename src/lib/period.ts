// 기간 필터 — 장착 실적·고객별 매출의 조회 범위와, KPI 증감 비교에 쓰는 직전 동기간.
// 날짜는 'YYYY-MM-DD' 문자열이라 사전순 비교가 곧 날짜 비교입니다.

export type Period = 'all' | 'thisMonth' | 'lastMonth' | 'thisYear'
export interface DateRange {
  from: string
  to: string
}

export const PERIODS: Period[] = ['all', 'thisMonth', 'lastMonth', 'thisYear']

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate()

/** 해당 월을 (연, 월)로 이동 — month 는 1~12, delta 는 개월 수 */
function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 }
}

export function periodRange(period: Period, today = new Date()): DateRange | null {
  const y = today.getFullYear()
  const m = today.getMonth() + 1
  const d = today.getDate()
  if (period === 'thisMonth') return { from: iso(y, m, 1), to: iso(y, m, d) }
  if (period === 'lastMonth') {
    const p = shiftMonth(y, m, -1)
    return { from: iso(p.y, p.m, 1), to: iso(p.y, p.m, lastDay(p.y, p.m)) }
  }
  if (period === 'thisYear') return { from: iso(y, 1, 1), to: iso(y, m, d) }
  return null
}

/** 직전 동기간 — 진행 중인 기간(이번 달·올해)은 같은 경과 일수만큼만 비교해 왜곡을 막습니다. */
export function previousRange(period: Period, today = new Date()): DateRange | null {
  const y = today.getFullYear()
  const m = today.getMonth() + 1
  const d = today.getDate()
  if (period === 'thisMonth') {
    const p = shiftMonth(y, m, -1)
    return { from: iso(p.y, p.m, 1), to: iso(p.y, p.m, Math.min(d, lastDay(p.y, p.m))) }
  }
  if (period === 'lastMonth') {
    const p = shiftMonth(y, m, -2)
    return { from: iso(p.y, p.m, 1), to: iso(p.y, p.m, lastDay(p.y, p.m)) }
  }
  if (period === 'thisYear') return { from: iso(y - 1, 1, 1), to: iso(y - 1, m, Math.min(d, lastDay(y - 1, m))) }
  return null
}

export function inRange(date: string | undefined, range: DateRange | null): boolean {
  if (!range) return true
  const day = (date ?? '').slice(0, 10)
  return day >= range.from && day <= range.to
}

/** 증감률(%) — 비교 기준이 0이면 계산할 수 없어 null */
export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}
