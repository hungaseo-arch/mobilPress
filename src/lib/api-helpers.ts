// mock-api / neon-api 공용 헬퍼 — 요약 집계와 Response 생성.
import type { Customer, Installation, Summary } from '@/lib/types'

/** 할인후 서비스비용 — 수령액 자동 계산식(서비스 비용 × 할인율% + 출장비)의 앞항과 같다.
 *  건별로 반올림한 뒤 합산해야 화면의 건별 값과 합계가 어긋나지 않는다. */
export function netServiceFee(item: Installation): number {
  return Math.round((Number(item.serviceFee) || 0) * ((Number(item.discountRate) || 0) / 100))
}

/** 고객·장착 데이터에서 대시보드 요약을 집계합니다. */
export function buildSummary(customers: Customer[], installations: Installation[]): Summary {
  return {
    totalCustomers: customers.length,
    activeCustomers: customers.filter((c) => c.status === 'active').length,
    prospects: customers.filter((c) => c.status === 'prospect').length,
    totalInstallations: installations.length,
    totalQty: installations.reduce((sum, i) => sum + (Number(i.qty) || 0), 0),
    totalTirePrice: installations.reduce((sum, i) => sum + (Number(i.tirePrice) || 0), 0),
    totalNetServiceFee: installations.reduce((sum, i) => sum + netServiceFee(i), 0),
    totalMobilizationFee: installations.reduce((sum, i) => sum + (Number(i.mobilizationFee) || 0), 0),
    totalRevenue: installations.reduce((sum, i) => sum + (Number(i.receivedAmount) || 0), 0),
  }
}

/** JSON body 를 가진 Response 생성 (fetch 호환 계층용). */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
