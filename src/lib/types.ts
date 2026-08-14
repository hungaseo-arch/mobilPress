export type CustomerStatus = 'prospect' | 'active'

export interface Customer extends CustomerForm {
  id: string
  createdAt: string
  updatedAt: string
}

export interface CustomerForm {
  companyName: string
  businessType: string
  contactName: string
  area: string
  branchInfo: string
  monthlyDemand: number
  currentPressVendor: string
  marketPrice: string
  insight: string
  status: CustomerStatus
  lastVisitDate: string
}

export type InstallationStatus = 'completed' | 'pending' | 'cancelled'

export interface Installation extends InstallationForm {
  id: string
  createdAt: string
  updatedAt: string
}

export interface InstallationForm {
  workDate: string
  distributor: string
  customerName: string
  product: string
  rimSize: string
  qty: number
  serialNumbers: string
  workTime: string
  /** 장착 시 차량 주행거리계 (시간계, hr) */
  odometer: string
  worker: string
  /** 입력자 — 저장 시 로그인 사용자 이름으로 자동 기록 (수동 입력 아님) */
  enteredBy: string
  status: InstallationStatus
  note: string
  /** 작업보고서 스캔 파일 — Google Drive 파일 ID (없으면 빈 문자열) */
  reportFileId: string
  /** 작업보고서 파일명 (표시용) */
  reportFileName: string
  serviceFee: number
  mobilizationFee: number
  discountRate: number
  receivedAmount: number
}

/** 예산 집행 구분 — 인도네시아어 정본(고정 3종) */
export type BudgetCategory = 'Kendaraan & Mesin' | 'Tools & Perlengkapan' | 'Anggaran Operasional'

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  'Kendaraan & Mesin',
  'Tools & Perlengkapan',
  'Anggaran Operasional',
]

export interface BudgetEntry extends BudgetEntryForm {
  id: string
  createdAt: string
  updatedAt: string
}

export interface BudgetEntryForm {
  /** 구분 (Kendaraan & Mesin / Tools & Perlengkapan / Anggaran Operasional) */
  category: string
  /** 날짜 (YYYY-MM-DD, 없을 수 있음) */
  entryDate: string
  /** 항목 (인도네시아어) */
  item: string
  /** 금액 (Rp) */
  amount: number
  /** 비고 (인도네시아어) */
  note: string
  /** 입력자 — 저장 시 로그인 사용자 이름으로 자동 기록 */
  enteredBy: string
}

export interface Summary {
  totalCustomers: number
  activeCustomers: number
  prospects: number
  totalInstallations: number
  totalQty: number
  totalRevenue: number
}

export interface MobilPressData {
  customers: Customer[]
  installations: Installation[]
  budgetEntries: BudgetEntry[]
  summary: Summary
}

/** 접속(로그인) 기록 — 트리거가 기록하며 앱에서는 조회만 한다. */
export interface AccessLog {
  id: number
  userId: string
  email: string
  userName: string
  event: 'login' | 'logout'
  ipAddress: string
  userAgent: string
  occurredAt: string
}

/** 데이터 변경 이력 — public.audit_logs */
export interface AuditLog {
  id: number
  tableName: string
  recordId: string
  action: 'insert' | 'update' | 'delete'
  changedBy: string
  /** 조회 시 user_directory 로 보강 (DB 컬럼 아님) */
  changedByEmail?: string
  changedAt: string
}
