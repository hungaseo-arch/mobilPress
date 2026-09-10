import type { BudgetEntryForm, CustomerForm, InstallationForm } from '@/lib/types'

export const emptyCustomer: CustomerForm = {
  companyName: '',
  businessType: '',
  contactName: '',
  area: '',
  branchInfo: '',
  monthlyDemand: 0,
  currentPressVendor: '',
  marketPrice: '',
  insight: '',
  status: 'prospect',
  lastVisitDate: '',
}

export const emptyInstallation: InstallationForm = {
  workDate: '2026-07-10',
  distributor: 'PT. Total Tire Bank',
  customerName: '',
  product: '',
  rimSize: '',
  qty: 1,
  serialNumbers: '',
  workTime: '',
  odometer: '',
  installArea: '',
  locationUrl: '',
  worker: '',
  enteredBy: '',
  status: 'completed',
  note: '',
  reportFileId: '',
  reportFileName: '',
  reportFileId2: '',
  reportFileName2: '',
  reportFileId3: '',
  reportFileName3: '',
  odometerFileId: '',
  odometerFileName: '',
  tirePrice: 0,
  serviceFee: 0,
  mobilizationFee: 0,
  discountRate: 50,
  receivedAmount: 0,
}

// 예산 집행 항목 기본값 — BudgetFormModal 의 신규 입력 초기값.
export const emptyBudgetEntry: BudgetEntryForm = {
  category: 'Anggaran Operasional',
  entryDate: '',
  item: '',
  amount: 0,
  note: '',
  enteredBy: '',
}

/**
 * 시드 데이터(seed-report.ts)의 건수. 스토어의 needsSeed 가 "시드가 아직 덜 됐는지"를 판단할 때
 * 쓰며, 이 상수만 초기 번들에 들어가고 실제 데이터는 seedFromReport() 가 눌릴 때만 내려받는다.
 * seed-report.ts 가 개발 모드에서 실제 길이와 대조하므로 항목을 추가하면 여기도 함께 고친다.
 */
export const SEED_COUNTS = {
  customers: 2,
  installations: 3,
  budgetEntries: 48,
} as const
