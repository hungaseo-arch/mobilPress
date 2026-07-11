<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ClipboardList, Loader2, LogOut, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-vue-next'
import { useMobilPressStore } from '@/stores/mobilPress'
import { authEnabled, canDelete, canEdit, currentUser, logout } from '@/lib/auth-state'
import { formatDate, formatIDR, formatNumber, productLines } from '@/lib/format'
import { lang, setLang, t } from '@/lib/i18n'
import CustomerFormModal from '@/components/CustomerFormModal.vue'
import InstallationFormModal from '@/components/InstallationFormModal.vue'
import RevenueHistoryModal from '@/components/RevenueHistoryModal.vue'
import MonthlyHistoryModal from '@/components/MonthlyHistoryModal.vue'
import RequestHistoryModal from '@/components/RequestHistoryModal.vue'
import OperationsReference from '@/components/OperationsReference.vue'
import type { Customer, CustomerForm, Installation, InstallationForm } from '@/lib/types'

const store = useMobilPressStore()

type Tab = 'installations' | 'revenue' | 'operations'
const activeTab = ref<Tab>('installations')

const tabs = computed<{ key: Tab; label: string }[]>(() => [
  { key: 'installations', label: t('tab.installations') },
  { key: 'revenue', label: t('tab.revenue') },
  { key: 'operations', label: t('tab.operations') },
])

const customerModalOpen = ref(false)
const editingCustomer = ref<Customer | null>(null)
const installationModalOpen = ref(false)
const editingInstallation = ref<Installation | null>(null)
const revenueDetailCustomer = ref<string | null>(null)
const monthDetail = ref<string | null>(null)
const requestDetail = ref<string | null>(null)

const customerNames = computed(() => store.customers.map((c) => c.companyName))

// 매출 모달에 표시할 고객 상세 (고객 정보 탭 삭제 → 모달에서 조회/수정)
const revenueDetailCustomerObj = computed(
  () => store.customers.find((c) => c.companyName === revenueDetailCustomer.value) ?? null,
)

// 해당 장착고객의 요청고객(요청고객) — 장착 실적에서 중복 없이 수집
function requestCustomersOf(companyName: string): string[] {
  const names = store.installations
    .filter((i) => i.customerName === companyName && i.distributor)
    .map((i) => i.distributor)
  return [...new Set(names)]
}

function openCustomerModal(customer: Customer | null = null) {
  editingCustomer.value = customer
  customerModalOpen.value = true
}

function openInstallationModal(installation: Installation | null = null) {
  editingInstallation.value = installation
  installationModalOpen.value = true
}

async function submitCustomer(form: CustomerForm) {
  const ok = await store.saveCustomer(form, editingCustomer.value?.id ?? null)
  if (ok) customerModalOpen.value = false
}

async function submitInstallation(form: InstallationForm) {
  const ok = await store.saveInstallation(form, editingInstallation.value?.id ?? null)
  if (ok) installationModalOpen.value = false
}

async function confirmDelete(kind: 'customers' | 'installations', id: string, name: string) {
  if (window.confirm(t('confirm.delete', { name }))) {
    await store.deleteRecord(kind, id)
  }
}

async function onLogout() {
  await logout() // currentUser 가 비워지면 AuthGate 가 로그인 화면으로 전환
}

onMounted(() => {
  store.loadData()
})
</script>

<template>
  <main class="min-h-screen">
    <!-- 상단 헤더 1열 3분할: 25% 타이틀 | 50% 탭 | 25% 검색·등록·로그인 -->
    <header class="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div class="mx-auto max-w-300 px-4 sm:px-6">
        <div class="flex flex-wrap items-center gap-3 py-3 lg:grid lg:grid-cols-[1fr_2fr_1fr]">
          <!-- 1열 (25%): 홈 / 타이틀 -->
          <div class="min-w-0">
            <p class="truncate text-[11px] font-semibold uppercase tracking-widest text-primary">{{ t('app.company') }}</p>
            <h1 class="truncate text-xl font-bold tracking-tight text-foreground">{{ t('app.title') }}</h1>
          </div>

          <!-- 2열 (50%): 네비 탭 (중앙) -->
          <nav class="flex justify-center gap-1 rounded-lg border border-border bg-card p-1 lg:justify-self-center">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition xl:px-4"
              :class="activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>

          <!-- 3열 (25%): 언어 · 로그인 -->
          <div class="flex min-w-0 flex-1 items-center justify-end gap-1.5 lg:flex-none">
            <!-- 언어 전환 (기본: 인도네시아어) -->
            <div class="flex shrink-0 gap-0.5 rounded-md border border-border bg-card p-0.5">
              <button
                type="button"
                class="rounded px-1.5 py-1 text-xs font-semibold transition"
                :class="lang === 'id' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                @click="setLang('id')"
                aria-label="Bahasa Indonesia"
              >
                🇮🇩
              </button>
              <button
                type="button"
                class="rounded px-1.5 py-1 text-xs font-semibold transition"
                :class="lang === 'ko' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
                @click="setLang('ko')"
                aria-label="한국어"
              >
                🇰🇷
              </button>
            </div>

            <button
              v-if="authEnabled && currentUser"
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              :title="`${currentUser.email} · ${t('btn.logout')}`"
              @click="onLogout"
            >
              <LogOut class="h-4 w-4" />
              <span class="hidden xl:inline">{{ currentUser.name || currentUser.email }}</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-300 px-4 py-8 sm:px-6">
      <!-- 초기 데이터 등록 -->
      <div
        v-if="canEdit && !store.loading && !store.customers.length && !store.installations.length && activeTab !== 'operations'"
        class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4"
      >
        <p class="text-sm text-muted-foreground">{{ t('seed.empty') }}</p>
        <button
          type="button"
          :disabled="store.saving"
          class="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20 disabled:opacity-50"
          @click="store.seedFromReport()"
        >
          <Sparkles class="h-4 w-4" />
          {{ t('seed.button') }}
        </button>
      </div>

      <!-- 운영자료 (정적 참조 자료) -->
      <OperationsReference v-if="activeTab === 'operations'" />

      <template v-else>
        <!-- 검색 + 등록 -->
        <div class="mb-5 flex flex-wrap items-center justify-end gap-2">
          <div class="relative w-full max-w-xs">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              v-model="store.query"
              type="search"
              :placeholder="t('search.placeholder')"
              class="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            v-if="activeTab === 'installations' && canEdit"
            type="button"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            @click="openInstallationModal()"
          >
            <Plus class="h-4 w-4" /> {{ t('btn.addInstallation') }}
          </button>
        </div>

        <!-- 로딩 -->
        <div v-if="store.loading" class="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-20 text-muted-foreground">
          <Loader2 class="h-5 w-5 animate-spin" />
          {{ t('loading') }}
        </div>

        <!-- 장착 실적 -->
        <section v-else-if="activeTab === 'installations'" class="overflow-x-auto rounded-xl border border-border bg-card">
          <table class="w-full min-w-260 text-left text-sm">
            <thead>
              <tr class="border-b border-border text-xs text-muted-foreground">
                <th class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.workDate') }}</th>
                <th class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.customer') }}</th>
                <th class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.productRim') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.qty') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.serviceFee') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.discount') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.mobFee') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.received') }}</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.filteredInstallations.length">
                <td colspan="9" class="px-4 py-14 text-center text-muted-foreground">
                  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
                  {{ t('installations.empty') }}
                </td>
              </tr>
              <tr
                v-for="item in store.filteredInstallations"
                :key="item.id"
                class="border-b border-border/60 align-top transition last:border-0 hover:bg-secondary/40"
              >
                <td class="px-4 py-3 text-muted-foreground">
                  <p class="text-foreground">{{ formatDate(item.workDate) }}</p>
                  <p v-if="item.workTime" class="mt-0.5 text-xs">{{ item.workTime }}</p>
                  <p v-if="item.worker" class="mt-0.5 text-xs">{{ t('form.worker') }}: {{ item.worker }}</p>
                </td>
                <td class="px-4 py-3">
                  <p class="font-semibold text-foreground">{{ item.customerName }}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">{{ item.distributor }}</p>
                </td>
                <td class="px-4 py-3 text-muted-foreground">
                  <p v-for="line in productLines(item.product)" :key="line" class="max-w-52">{{ line }}</p>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(item.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatIDR(item.serviceFee) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ item.discountRate }}%</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatIDR(item.mobilizationFee) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ formatIDR(item.receivedAmount) }}</td>
                <td class="px-4 py-3">
                  <div v-if="canEdit" class="flex justify-end gap-1">
                    <button
                      type="button"
                      class="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      :aria-label="t('btn.edit')"
                      @click="openInstallationModal(item)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      v-if="canDelete"
                      type="button"
                      class="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                      :aria-label="t('btn.delete')"
                      @click="confirmDelete('installations', item.id, item.customerName)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 실적 분석: 고객별 매출 + 월별 매출 -->
        <div v-else class="space-y-8">
        <section>
        <h2 class="mb-3 text-base font-bold text-foreground">{{ t('revenue.byCustomer') }}</h2>
        <div class="overflow-x-auto rounded-xl border border-border bg-card">
          <table class="w-full min-w-140 table-fixed text-left text-sm">
            <thead>
              <tr class="border-b border-border text-xs text-muted-foreground">
                <th class="w-1/5 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.rank') }}</th>
                <th class="w-1/5 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.installCustomer') }}</th>
                <th class="w-1/5 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.requestCustomer') }}</th>
                <th class="w-1/5 whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.qty') }}</th>
                <th class="w-1/5 whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.received') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.revenueByCustomer.length">
                <td colspan="5" class="px-4 py-14 text-center text-muted-foreground">
                  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
                  {{ t('revenue.empty') }}
                </td>
              </tr>
              <tr
                v-for="([name, value], index) in store.revenueByCustomer"
                :key="name"
                class="border-b border-border/60 transition last:border-0 hover:bg-secondary/40"
              >
                <td class="px-4 py-3 text-muted-foreground">{{ index + 1 }}</td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    class="font-semibold text-foreground underline-offset-2 hover:underline"
                    :title="t('revenue.rowHint')"
                    @click="revenueDetailCustomer = name"
                  >
                    {{ name }}
                  </button>
                </td>
                <td class="px-4 py-3">
                  <template v-for="(reqName, reqIndex) in requestCustomersOf(name)" :key="reqName">
                    <span v-if="reqIndex > 0" class="text-muted-foreground">, </span>
                    <button
                      type="button"
                      class="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      :title="t('request.modalTitle')"
                      @click="requestDetail = reqName"
                    >
                      {{ reqName }}
                    </button>
                  </template>
                  <span v-if="!requestCustomersOf(name).length" class="text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatNumber(value.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ formatIDR(value.revenue) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="store.revenueByCustomer.length">
              <tr class="border-t border-border bg-secondary/50 font-semibold">
                <td class="px-4 py-3 text-foreground" colspan="3">
                  {{ t('revenue.total') }} ({{ store.revenueByCustomer.length }} {{ t('revenue.customersUnit') }})
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(store.summary.totalQty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-primary">{{ formatIDR(store.summary.totalRevenue) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        </section>

        <!-- 월별 매출 -->
        <section>
        <h2 class="mb-3 text-base font-bold text-foreground">{{ t('revenue.byMonth') }}</h2>
        <div class="overflow-x-auto rounded-xl border border-border bg-card">
          <table class="w-full min-w-140 text-left text-sm">
            <thead>
              <tr class="border-b border-border text-xs text-muted-foreground">
                <th class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.month') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.jobs') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.qty') }}</th>
                <th class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.received') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.revenueByMonth.length">
                <td colspan="4" class="px-4 py-14 text-center text-muted-foreground">
                  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
                  {{ t('revenue.empty') }}
                </td>
              </tr>
              <tr
                v-for="[month, value] in store.revenueByMonth"
                :key="month"
                class="cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-secondary/40"
                :title="t('month.rowHint')"
                @click="monthDetail = month"
              >
                <td class="px-4 py-3 font-semibold text-foreground">{{ formatDate(month) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatNumber(value.count) }} {{ t('unit.items') }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatNumber(value.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ formatIDR(value.revenue) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="store.revenueByMonth.length">
              <tr class="border-t border-border bg-secondary/50 font-semibold">
                <td class="px-4 py-3 text-foreground">
                  {{ t('revenue.total') }} ({{ store.revenueByMonth.length }} {{ t('revenue.monthsUnit') }})
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(store.summary.totalInstallations) }} {{ t('unit.items') }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(store.summary.totalQty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-primary">{{ formatIDR(store.summary.totalRevenue) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        </section>
        </div>
      </template>
    </div>

    <footer class="border-t border-border py-6 text-center text-xs text-muted-foreground">
      Copyright © ASEOA
    </footer>

    <CustomerFormModal
      v-if="customerModalOpen"
      :editing="editingCustomer"
      :saving="store.saving"
      @close="customerModalOpen = false"
      @submit="submitCustomer"
    />
    <InstallationFormModal
      v-if="installationModalOpen"
      :editing="editingInstallation"
      :saving="store.saving"
      :customer-names="customerNames"
      @close="installationModalOpen = false"
      @submit="submitInstallation"
    />
    <RevenueHistoryModal
      v-if="revenueDetailCustomer"
      :customer-name="revenueDetailCustomer"
      :customer="revenueDetailCustomerObj"
      :installations="store.installations"
      :can-edit="canEdit"
      @close="revenueDetailCustomer = null"
      @edit-customer="openCustomerModal"
    />
    <MonthlyHistoryModal
      v-if="monthDetail"
      :month="monthDetail"
      :installations="store.installations"
      @close="monthDetail = null"
    />
    <RequestHistoryModal
      v-if="requestDetail"
      :distributor="requestDetail"
      :installations="store.installations"
      @close="requestDetail = null"
    />
  </main>
</template>
