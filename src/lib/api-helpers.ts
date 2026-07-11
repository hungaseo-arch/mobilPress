// mock-api / neon-api 공용 헬퍼 — 요약 집계와 Response 생성.
import type { Customer, Installation, Summary } from '@/lib/types'

/** 고객·장착 데이터에서 대시보드 요약을 집계합니다. */
export function buildSummary(customers: Customer[], installations: Installation[]): Summary {
  return {
    totalCustomers: customers.length,
    activeCustomers: customers.filter((c) => c.status === 'active').length,
    prospects: customers.filter((c) => c.status === 'prospect').length,
    totalInstallations: installations.length,
    totalQty: installations.reduce((sum, i) => sum + (Number(i.qty) || 0), 0),
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
