import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { apiFetch } from '@/lib/api'
import { currentUser } from '@/lib/auth-state'
import { parseApi } from '@/lib/format'
import { t } from '@/lib/i18n'
import { seedBudgetEntries, seedCustomers, seedInstallations } from '@/data/seed'
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
  const loading = ref(true)
  const saving = ref(false)

  const filteredInstallations = computed(() => {
    const keyword = query.value.trim().toLowerCase()
    if (!keyword) return installations.value
    return installations.value.filter((item: Installation) =>
      [item.customerName, item.product, item.distributor, item.serialNumbers, item.note]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  })

  const revenueByCustomer = computed(() => {
    const result = new Map<string, { qty: number; revenue: number }>()
    installations.value.forEach((item: Installation) => {
      const prev = result.get(item.customerName) ?? { qty: 0, revenue: 0 }
      result.set(item.customerName, { qty: prev.qty + item.qty, revenue: prev.revenue + item.receivedAmount })
    })
    return Array.from(result.entries()).sort((a, b) => b[1].revenue - a[1].revenue)
  })

  // 초기 시드가 아직 완료되지 않았는지(부분 시드 포함) — 시드 버튼 노출 조건.
  const needsSeed = computed(
    () =>
      customers.value.length < seedCustomers.length ||
      installations.value.length < seedInstallations.length ||
      budgetEntries.value.length < seedBudgetEntries.length,
  )

  const revenueByMonth = computed(() => {
    const result = new Map<string, { count: number; qty: number; revenue: number }>()
    installations.value.forEach((item: Installation) => {
      const month = (item.workDate ?? '').slice(0, 7)
      if (!month) return
      const prev = result.get(month) ?? { count: 0, qty: 0, revenue: 0 }
      result.set(month, {
        count: prev.count + 1,
        qty: prev.qty + item.qty,
        revenue: prev.revenue + item.receivedAmount,
      })
    })
    return Array.from(result.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  })

  async function loadData() {
    loading.value = true
    try {
      const nextData = await parseApi<MobilPressData>(await apiFetch('/mobil-press/data'))
      customers.value = nextData.customers
      installations.value = nextData.installations
      budgetEntries.value = nextData.budgetEntries ?? []
      summary.value = nextData.summary
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.loadFail'))
    } finally {
      loading.value = false
    }
  }

  async function saveCustomer(form: CustomerForm, editingId: string | null): Promise<boolean> {
    saving.value = true
    try {
      const response = editingId
        ? await apiFetch(`/mobil-press/customers/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await apiFetch('/mobil-press/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
      await parseApi(response)
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
      const response = editingId
        ? await apiFetch(`/mobil-press/installations/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await apiFetch('/mobil-press/installations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      await parseApi(response)
      toast.success(editingId ? t('toast.installationUpdated') : t('toast.installationSaved'))
      await loadData()
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
      const response = editingId
        ? await apiFetch(`/mobil-press/budget_entries/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await apiFetch('/mobil-press/budget_entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      await parseApi(response)
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

  async function deleteRecord(kind: 'customers' | 'installations' | 'budget_entries', id: string): Promise<void> {
    saving.value = true
    try {
      await parseApi(await apiFetch(`/mobil-press/${kind}/${id}`, { method: 'DELETE' }))
      toast.success(t('toast.deleted'))
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.deleteFail'))
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
      customerCount >= seedCustomers.length &&
      installationCount >= seedInstallations.length &&
      budgetCount >= seedBudgetEntries.length
    ) {
      toast.info(t('toast.seedExists'))
      return
    }
    saving.value = true
    try {
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
    loading,
    saving,
    filteredInstallations,
    revenueByCustomer,
    revenueByMonth,
    needsSeed,
    loadData,
    saveCustomer,
    saveInstallation,
    saveBudgetEntry,
    deleteRecord,
    seedFromReport,
  }
})
