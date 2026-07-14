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
  serviceFee: number
  mobilizationFee: number
  discountRate: number
  receivedAmount: number
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
  summary: Summary
}
