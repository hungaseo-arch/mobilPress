import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { apiFetch } from '@/lib/api'
import { netServiceFee } from '@/lib/api-helpers'
import { currentUser, maskSensitive } from '@/lib/auth-state'
import { parseApi } from '@/lib/format'
import { t } from '@/lib/i18n'
import { inRange, periodRange, previousRange, type Period } from '@/lib/period'
import { SEED_COUNTS } from '@/data/seed'
import type {
  BudgetEntry,
  BudgetEntryForm,
  Customer,
  CustomerForm,
  Installation,
  InstallationForm,
  MobilPressData,
  Summary,
} from '@/lib/types'

const emptySummary: Summary = {
  totalCustomers: 0,
  activeCustomers: 0,
  prospects: 0,
  totalInstallations: 0,
  totalQty: 0,
  totalTirePrice: 0,
  totalNetServiceFee: 0,
  totalMobilizationFee: 0,
  totalRevenue: 0,
}

/**
 * Central store for MobilPress operations data. Holds the customers /
 * installations / summary loaded from the backend, the shared search query,
 * and every CRUD action. Components read the derived getters and call the
 * actions; toasts for API results live here so the UI stays declarative.
 */
export const useMobilPressStore = defineStore('mobilPress', () => {
  const customers = ref<Customer[]>([])
  const installations = ref<Installation[]>([])
  const budgetEntries = ref<BudgetEntry[]>([])
  const summary = ref<Summary>({ ...emptySummary })
  const query = ref('')
  // 조회 기간 — 장착 실적 표·KPI·고객별 매출에 적용 (월별 매출은 기간 흐름 자체라 제외)
  const period = ref<Period>('all')
  const loading = ref(true)
  const saving = ref(false)
  // 마지막 불러오기가 실패했는지 — 실패를 "데이터 없음"으로 오인하지 않도록 화면이 구분합니다.
  const loadError = ref<string | null>(null)
  // 불러오기가 한 번이라도 성공했는지.
  const loadedOnce = ref(false)
  // 마지막으로 저장한 장착 실적의 id — 저장 뒤 '목록에 보이는지' 판정에 씁니다.
  const lastSavedInstallationId = ref<string | null>(null)
  // 마지막 저장 뒤 재조회가 성공했는지 — 실패하면 표가 옛 데이터라 '가려짐' 판정을 할 수 없습니다.
  const lastSaveReloaded = ref(true)

  const periodInstallations = computed(() => {
    const range = periodRange(period.value)
    return range ? installations.value.filter((i: Installation) => inRange(i.workDate, range)) : installations.value
  })

  // KPI — 선택 기간 합계와 직전 동기간 합계(기간이 '전체'이면 비교 없음)
  function tally(list: Installation[]) {
    return {
      jobs: list.length,
      qty: list.reduce((sum, i) => sum + (Number(i.qty) || 0), 0),
      received: list.reduce((sum, i) => sum + (Number(i.receivedAmount) || 0), 0),
      customers: new Set(list.map((i) => i.customerName)).size,
    }
  }
  const periodStats = computed(() => tally(periodInstallations.value))
  const previousStats = computed(() => {
    const range = previousRange(period.value)
    return range ? tally(installations.value.filter((i: Installation) => inRange(i.workDate, range))) : null
  })

  const filteredInstallations = computed(() => {
    const keyword = query.value.trim().toLowerCase()
    if (!keyword) return periodInstallations.value
    // 조회 전용 계정은 고객명·요청고객을 검색 대상에서 제외합니다 — 화면에서 가린 이름을
    // 검색으로 되짚어 확인하는 우회를 막기 위함입니다(src/lib/mask.ts 참고).
    return periodInstallations.value.filter((item: Installation) =>
      (maskSensitive.value
        ? [item.product, item.serialNumbers, item.note]
        : [item.customerName, item.product, item.distributor, item.serialNumbers, item.note]
      )
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  })

  const revenueByCustomer = computed(() => {
    const result = new Map<string, { qty: number; tirePrice: number; revenue: number }>()
    periodInstallations.value.forEach((item: Installation) => {
      const prev = result.get(item.customerName) ?? { qty: 0, tirePrice: 0, revenue: 0 }
      result.set(item.customerName, {
        qty: prev.qty + item.qty,
        tirePrice: prev.tirePrice + (Number(item.tirePrice) || 0),
        revenue: prev.revenue + item.receivedAmount,
      })
    })
    return Array.from(result.entries()).sort((a, b) => b[1].revenue - a[1].revenue)
  })

  // 초기 시드가 아직 완료되지 않았는지(부분 시드 포함) — 시드 버튼 노출 조건.
  const needsSeed = computed(
    () =>
      customers.value.length < SEED_COUNTS.customers ||
      installations.value.length < SEED_COUNTS.installations ||
      budgetEntries.value.length < SEED_COUNTS.budgetEntries,
  )

  // 성공적으로 불러왔는데 세 종류 모두 비어 있는 경우 — 시드 안내 노출 조건.
  const isEmptyDb = computed(
    () =>
      loadedOnce.value &&
      !loadError.value &&
      customers.value.length === 0 &&
      installations.value.length === 0 &&
      budgetEntries.value.length === 0,
  )

  const revenueByMonth = computed(() => {
    const result = new Map<
      string,
      { count: number; qty: number; tirePrice: number; netServiceFee: number; mobFee: number; revenue: number }
    >()
    installations.value.forEach((item: Installation) => {
      const month = (item.workDate ?? '').slice(0, 7)
      if (!month) return
      const prev = result.get(month) ?? { count: 0, qty: 0, tirePrice: 0, netServiceFee: 0, mobFee: 0, revenue: 0 }
      result.set(month, {
        count: prev.count + 1,
        qty: prev.qty + item.qty,
        tirePrice: prev.tirePrice + (Number(item.tirePrice) || 0),
        netServiceFee: prev.netServiceFee + netServiceFee(item),
        mobFee: prev.mobFee + (Number(item.mobilizationFee) || 0),
        revenue: prev.revenue + item.receivedAmount,
      })
    })
    return Array.from(result.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  })

  // Neon Data API의 PATCH 직후 세션 토큰이 만료 경계를 막 넘으면, RLS 검사가 순간적으로
  // 행을 찾지 못해 "대상을 찾을 수 없습니다" 오류가 뜰 수 있다(실제 삭제가 아니라 토큰 재발급
  // 타이밍 문제 — 즉시 재시도하면 통과한다). 방금 불러온 id를 그대로 다시 보내는 PATCH에 한해
  // 한 번만 조용히 재시도한다.
  const SESSION_RACE_ERROR = '대상을 찾을 수 없습니다.'
  async function patchWithRetry<T>(request: () => Promise<Response>): Promise<T> {
    try {
      return await parseApi<T>(await request())
    } catch (error) {
      if (error instanceof Error && error.message === SESSION_RACE_ERROR) {
        return await parseApi<T>(await request())
      }
      throw error
    }
  }

  async function loadData(): Promise<boolean> {
    // 첫 로딩과 오류 후 재시도만 스피너를 쓰고, 저장·삭제 뒤 재조회는 표를 그대로 둔 채 갱신합니다(깜빡임·스크롤 손실 방지).
    if (!loadedOnce.value || loadError.value) loading.value = true
    try {
      const nextData = await parseApi<MobilPressData>(await apiFetch('/mobil-press/data'))
      customers.value = nextData.customers
      installations.value = nextData.installations
      budgetEntries.value = nextData.budgetEntries ?? []
      summary.value = nextData.summary
      loadError.value = null
      loadedOnce.value = true
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.loadFail')
      loadError.value = message
      toast.error(message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function saveCustomer(form: CustomerForm, editingId: string | null): Promise<boolean> {
    saving.value = true
    try {
      if (editingId) {
        await patchWithRetry(() =>
          apiFetch(`/mobil-press/customers/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          }),
        )
      } else {
        await parseApi(
          await apiFetch('/mobil-press/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          }),
        )
      }
      toast.success(editingId ? t('toast.customerUpdated') : t('toast.customerSaved'))
      await loadData()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.saveFail'))
      return false
    } finally {
      saving.value = false
    }
  }

  async function saveInstallation(form: InstallationForm, editingId: string | null): Promise<boolean> {
    saving.value = true
    try {
      // 입력자: 신규 등록 시 로그인 사용자 이름으로 자동 기록 (수정 시에는 원본 유지)
      const payload: InstallationForm = editingId
        ? form
        : { ...form, enteredBy: currentUser.value?.name || currentUser.value?.email || '' }
      lastSavedInstallationId.value = editingId
      const idsBefore = new Set(installations.value.map((i) => i.id))
      if (editingId) {
        await patchWithRetry(() =>
          apiFetch(`/mobil-press/installations/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        )
      } else {
        const created = await parseApi<{ id?: string } | null>(
          await apiFetch('/mobil-press/installations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        )
        lastSavedInstallationId.value = created?.id ?? null
      }
      toast.success(editingId ? t('toast.installationUpdated') : t('toast.installationSaved'))
      const reloaded = await loadData()
      lastSaveReloaded.value = reloaded
      // 서버가 id 를 돌려주지 않았으면 저장 전후 목록 차이로 새 행을 찾습니다(새 행이 하나일 때만 확정).
      if (reloaded && !editingId && !lastSavedInstallationId.value) {
        const added = installations.value.filter((i) => !idsBefore.has(i.id))
        if (added.length === 1) lastSavedInstallationId.value = added[0].id
      }
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.saveFail'))
      return false
    } finally {
      saving.value = false
    }
  }

  async function saveBudgetEntry(form: BudgetEntryForm, editingId: string | null): Promise<boolean> {
    saving.value = true
    try {
      // 입력자: 신규 등록 시 로그인 사용자 이름으로 자동 기록 (수정 시에는 원본 유지)
      const payload: BudgetEntryForm = editingId
        ? form
        : { ...form, enteredBy: currentUser.value?.name || currentUser.value?.email || '' }
      if (editingId) {
        await patchWithRetry(() =>
          apiFetch(`/mobil-press/budget_entries/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        )
      } else {
        await parseApi(
          await apiFetch('/mobil-press/budget_entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        )
      }
      toast.success(editingId ? t('toast.budgetUpdated') : t('toast.budgetSaved'))
      await loadData()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.saveFail'))
      return false
    } finally {
      saving.value = false
    }
  }

  /** 삭제 성공 여부를 반환합니다 — 호출부가 후속 작업(예: 첨부 파일 정리)을 성공했을 때만 하도록. */
  async function deleteRecord(kind: 'customers' | 'installations' | 'budget_entries', id: string): Promise<boolean> {
    saving.value = true
    try {
      await parseApi(await apiFetch(`/mobil-press/${kind}/${id}`, { method: 'DELETE' }))
      toast.success(t('toast.deleted'))
      await loadData()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.deleteFail'))
      return false
    } finally {
      saving.value = false
    }
  }

  async function seedFromReport(): Promise<void> {
    // 이미 세 종류 모두 채워져 있으면 재실행 불필요.
    // (부분 시드 상태 — 일부만 등록됨 — 에서는 누락분만 이어서 등록)
    const customerCount = customers.value.length
    const installationCount = installations.value.length
    const budgetCount = budgetEntries.value.length
    if (
      customerCount >= SEED_COUNTS.customers &&
      installationCount >= SEED_COUNTS.installations &&
      budgetCount >= SEED_COUNTS.budgetEntries
    ) {
      toast.info(t('toast.seedExists'))
      return
    }
    saving.value = true
    try {
      // 시드 행 데이터는 이 버튼을 눌렀을 때만 내려받는다(초기 번들에서 분리).
      const { seedBudgetEntries, seedCustomers, seedInstallations } = await import('@/data/seed-report')
      // 중복 방지용 자연키 — 이미 존재하는 항목은 건너뜁니다.
      const existingCompanies = new Set(customers.value.map((c) => c.companyName))
      const instKey = (i: InstallationForm) => `${i.workDate}|${i.customerName}|${i.product}|${i.serialNumbers}`
      const existingInst = new Set(installations.value.map(instKey))
      const budKey = (b: BudgetEntryForm) => `${b.category}|${b.item}|${b.entryDate}`
      const existingBudget = new Set(budgetEntries.value.map(budKey))

      for (const customer of seedCustomers) {
        if (existingCompanies.has(customer.companyName)) continue
        await parseApi(
          await apiFetch('/mobil-press/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer),
          }),
        )
      }
      for (const installation of seedInstallations) {
        if (existingInst.has(instKey(installation))) continue
        await parseApi(
          await apiFetch('/mobil-press/installations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(installation),
          }),
        )
      }
      for (const entry of seedBudgetEntries) {
        if (existingBudget.has(budKey(entry))) continue
        await parseApi(
          await apiFetch('/mobil-press/budget_entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          }),
        )
      }
      toast.success(t('toast.seedDone'))
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.seedFail'))
    } finally {
      saving.value = false
    }
  }

  return {
    customers,
    installations,
    budgetEntries,
    summary,
    query,
    period,
    loading,
    saving,
    loadError,
    periodInstallations,
    periodStats,
    previousStats,
    filteredInstallations,
    lastSavedInstallationId,
    lastSaveReloaded,
    revenueByCustomer,
    revenueByMonth,
    needsSeed,
    isEmptyDb,
    loadData,
    saveCustomer,
    saveInstallation,
    saveBudgetEntry,
    deleteRecord,
    seedFromReport,
  }
})
