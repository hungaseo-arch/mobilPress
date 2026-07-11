import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { apiFetch } from '@/lib/api'
import { currentUser } from '@/lib/auth-state'
import { parseApi } from '@/lib/format'
import { t } from '@/lib/i18n'
import { seedCustomers, seedInstallations } from '@/data/seed'
import type {
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

  async function deleteRecord(kind: 'customers' | 'installations', id: string): Promise<void> {
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
    if (customers.value.length || installations.value.length) {
      toast.info(t('toast.seedExists'))
      return
    }
    saving.value = true
    try {
      for (const customer of seedCustomers) {
        await parseApi(
          await apiFetch('/mobil-press/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer),
          }),
        )
      }
      for (const installation of seedInstallations) {
        await parseApi(
          await apiFetch('/mobil-press/installations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(installation),
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
    summary,
    query,
    loading,
    saving,
    filteredInstallations,
    revenueByCustomer,
    revenueByMonth,
    loadData,
    saveCustomer,
    saveInstallation,
    deleteRecord,
    seedFromReport,
  }
})
