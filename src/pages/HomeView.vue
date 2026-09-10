<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { ClipboardList, EyeOff, FileText, Loader2, LogOut, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-vue-next'
import { useMobilPressStore } from '@/stores/mobilPress'
import { authEnabled, canDelete, canEdit, canViewReport, currentUser, isAdmin, logout, maskSensitive, role } from '@/lib/auth-state'
import { deleteReport } from '@/lib/drive-report'
import { formatDate, formatNumber, productLines } from '@/lib/format'
import { maskedIDR, maskedName, maskedPercent } from '@/lib/mask'
import { lang, setLang, t } from '@/lib/i18n'
import TablePagination from '@/components/TablePagination.vue'
import { usePagination } from '@/lib/pagination'
import type { Customer, CustomerForm, Installation, InstallationForm } from '@/lib/types'

// 탭 전환/모달 오픈 시점에만 로드되는 컴포넌트 — 초기 번들에서 분리.
const CustomerFormModal = defineAsyncComponent(() => import('@/components/CustomerFormModal.vue'))
const InstallationFormModal = defineAsyncComponent(() => import('@/components/InstallationFormModal.vue'))
const RevenueHistoryModal = defineAsyncComponent(() => import('@/components/RevenueHistoryModal.vue'))
const MonthlyHistoryModal = defineAsyncComponent(() => import('@/components/MonthlyHistoryModal.vue'))
const RequestHistoryModal = defineAsyncComponent(() => import('@/components/RequestHistoryModal.vue'))
const OperationsReference = defineAsyncComponent(() => import('@/components/OperationsReference.vue'))
const BudgetReference = defineAsyncComponent(() => import('@/components/BudgetReference.vue'))
const AccessLogTable = defineAsyncComponent(() => import('@/components/AccessLogTable.vue'))
const MemberTable = defineAsyncComponent(() => import('@/components/MemberTable.vue'))
const ReportPreviewModal = defineAsyncComponent(() => import('@/components/ReportPreviewModal.vue'))

const store = useMobilPressStore()

// BI 시그니처·심볼 (public/brand) — GitHub Pages 하위 경로 배포를 위해 base 를 붙인다.
const signatureSrc = `${import.meta.env.BASE_URL}brand/ascendo-signature.png`
const symbolSrc = `${import.meta.env.BASE_URL}brand/ascendo-symbol.png`

type Tab = 'installations' | 'revenue' | 'budget' | 'operations' | 'logs' | 'members'
const activeTab = ref<Tab>('installations')

const tabs = computed<{ key: Tab; label: string }[]>(() => [
  { key: 'installations', label: t('tab.installations') },
  { key: 'revenue', label: t('tab.revenue') },
  { key: 'budget', label: t('tab.budget') },
  { key: 'operations', label: t('tab.operations') },
  ...(isAdmin.value
    ? [
        { key: 'logs' as const, label: t('tab.logs') },
        { key: 'members' as const, label: t('tab.members') },
      ]
    : []),
])

// 실적 분석 서브탭: 고객별 매출 / 월별 매출
type RevenueTab = 'customer' | 'month'
const revenueTab = ref<RevenueTab>('customer')
const revenueTabs = computed<{ key: RevenueTab; label: string }[]>(() => [
  { key: 'customer', label: t('revenue.byCustomer') },
  { key: 'month', label: t('revenue.byMonth') },
])

// 페이지네이션 (장착 실적 / 고객별 매출 / 월별 매출)
const instPage = usePagination(computed(() => store.filteredInstallations), 10)
const custPage = usePagination(computed(() => store.revenueByCustomer), 10)
const monthPage = usePagination(computed(() => store.revenueByMonth), 12)

// 장착 실적 표 하단 합계 — 검색 필터가 적용된 전체 결과 기준(현재 페이지만이 아님)
const installationsTotal = computed(() => {
  let qty = 0
  let tirePrice = 0
  let received = 0
  for (const item of store.filteredInstallations) {
    qty += item.qty
    tirePrice += Number(item.tirePrice) || 0
    received += item.receivedAmount
  }
  return { qty, tirePrice, received }
})

// 초기 데이터 등록 안내는 실제 데이터 표(장착 실적 / 실적 분석)에서만 노출합니다.
const showSeedBanner = computed(
  () =>
    canEdit.value &&
    !store.loading &&
    store.needsSeed &&
    (activeTab.value === 'installations' || activeTab.value === 'revenue'),
)

const customerModalOpen = ref(false)
const editingCustomer = ref<Customer | null>(null)
const installationModalOpen = ref(false)
const editingInstallation = ref<Installation | null>(null)
const revenueDetailCustomer = ref<string | null>(null)
const monthDetail = ref<string | null>(null)
const requestDetail = ref<string | null>(null)
// 작업보고서 미리보기 (Drive 임베드)
const reportPreview = ref<{ fileId: string; fileName: string } | null>(null)

function openReportPreview(fileId: string, fileName = '') {
  if (fileId) reportPreview.value = { fileId, fileName }
}

/** 장착 실적 1건에 첨부된 보고서(최대 3개) 목록 — 빈 슬롯은 제외 */
function reportFilesOf(item: Installation): { fileId: string; fileName: string }[] {
  return [
    { fileId: item.reportFileId, fileName: item.reportFileName },
    { fileId: item.reportFileId2, fileName: item.reportFileName2 },
    { fileId: item.reportFileId3, fileName: item.reportFileName3 },
  ].filter((f) => f.fileId)
}

const customerNames = computed(() => store.customers.map((c) => c.companyName))

// 매출 모달에 표시할 고객 상세 (고객 정보 탭 삭제 → 모달에서 조회/수정)
const revenueDetailCustomerObj = computed(
  () => store.customers.find((c) => c.companyName === revenueDetailCustomer.value) ?? null,
)

// 고객별 요청고객(distributor) 목록 — installations 전체를 단 한 번만 순회해 미리 구성.
// (기존에는 requestCustomersOf 가 매출 테이블의 각 행마다, 그것도 행당 2번씩 호출되며
//  매번 installations 전체를 filter+map 했음)
const requestCustomersByCustomer = computed(() => {
  const result = new Map<string, string[]>()
  for (const item of store.installations) {
    if (!item.distributor) continue
    const list = result.get(item.customerName)
    if (list) {
      if (!list.includes(item.distributor)) list.push(item.distributor)
    } else {
      result.set(item.customerName, [item.distributor])
    }
  }
  return result
})

// 해당 장착고객의 요청고객(요청고객) — 중복 없이, 최초 등장 순서대로
function requestCustomersOf(companyName: string): string[] {
  return requestCustomersByCustomer.value.get(companyName) ?? []
}

// 장착고객 이름 → 지역(customers.area). 매출 표의 행마다 store.customers 를 훑지 않도록
// 한 번만 Map 으로 만든다(requestCustomersByCustomer 와 같은 이유).
const areaByCustomer = computed(() => new Map(store.customers.map((c) => [c.companyName, c.area])))

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

async function confirmDelete(kind: 'customers' | 'installations', id: string, name: string, item?: Installation) {
  if (window.confirm(t('confirm.delete', { name }))) {
    // 장착 실적 삭제 시 첨부된 보고서(최대 3개)도 Drive에서 함께 삭제(휴지통 이동)합니다.
    if (kind === 'installations' && item) {
      for (const f of reportFilesOf(item)) void deleteReport(f.fileId).catch(() => undefined)
    }
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
    <!-- 상단 4px 블루 액센트 바 — 레터헤드(AS 06) 상단 블루 바 응용, 전 화면 표시 -->
    <div class="asm-accent-bar" />

    <!-- 헤더 56px: 좌 시그니처 로고|구분선|화면 제목 · 중앙 대분류 메뉴 · 우 역할·언어·로그아웃 -->
    <header class="asm-app-header sticky top-1 z-40 border-b border-border bg-card px-5">
      <div class="mx-auto flex max-w-300 flex-wrap items-center gap-3 py-2 lg:grid lg:h-14 lg:grid-cols-[1fr_2fr_1fr] lg:flex-nowrap lg:py-0">
        <!-- 1열: 시그니처 로고 + 화면 제목 (BS 04 — 비율 보존을 위해 높이만 지정) -->
        <div class="flex min-w-0 items-center">
          <img
            :src="signatureSrc"
            class="hidden h-7 w-auto sm:block"
            alt="PT ASCENDO INTERNASIONAL"
            width="640"
            height="127"
          />
          <!-- 모바일(<640px)에서는 워드마크를 숨기고 심볼 단독형만 표시 (가이드 4-1a) -->
          <img :src="symbolSrc" class="h-7 w-auto sm:hidden" alt="PT ASCENDO INTERNASIONAL" width="200" height="196" />
          <h1 class="ml-3 hidden truncate border-l border-border pl-3 text-sm font-medium text-foreground md:block">
            {{ t('app.title') }}
          </h1>
        </div>

        <!-- 2열: 대분류 메뉴 (중앙) — 활성은 블루 10% 틴트 + 블루 글자 700 (가이드 7-2) -->
        <nav class="flex flex-wrap justify-center gap-1 lg:justify-self-center">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
            :class="
              activeTab === tab.key
                ? 'bg-primary-soft font-bold text-primary'
                : 'font-medium text-foreground hover:bg-secondary'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>

        <!-- 3열: 역할 pill · 언어 · 로그인 -->
        <div class="flex min-w-0 flex-1 items-center justify-end gap-2 lg:flex-none">
          <span v-if="authEnabled && currentUser" class="asm-pill hidden xl:inline-flex">{{ t(`role.${role}`) }}</span>

          <!-- 언어 전환 (기본: 인도네시아어) -->
          <div class="flex shrink-0 gap-0.5 rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              class="rounded-sm px-1.5 py-1 text-xs font-medium transition-colors"
              :class="lang === 'id' ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-secondary'"
              aria-label="Bahasa Indonesia"
              @click="setLang('id')"
            >
              🇮🇩
            </button>
            <button
              type="button"
              class="rounded-sm px-1.5 py-1 text-xs font-medium transition-colors"
              :class="lang === 'ko' ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-secondary'"
              aria-label="한국어"
              @click="setLang('ko')"
            >
              🇰🇷
            </button>
          </div>

          <button
            v-if="authEnabled && currentUser"
            type="button"
            class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            :title="`${currentUser.email} · ${t('btn.logout')}`"
            @click="onLogout"
          >
            <LogOut class="h-4 w-4" />
            <span class="hidden xl:inline">{{ currentUser.name || currentUser.email }}</span>
          </button>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-300 p-4 sm:p-6">
      <!-- 조회 전용 계정 마스킹 안내 — 값이 비어 보이는 것이 오류가 아님을 알립니다 -->
      <p
        v-if="maskSensitive"
        class="mb-6 flex items-center gap-2 rounded-lg border border-border bg-secondary px-5 py-3 text-sm text-foreground"
      >
        <EyeOff class="h-4 w-4 shrink-0 text-muted-foreground" />
        {{ t('mask.notice') }}
      </p>

      <!-- 초기 데이터 등록 -->
      <div
        v-if="showSeedBanner"
        class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info-border border-l-4 border-l-primary bg-info-soft px-5 py-4"
      >
        <!-- 파스텔(bg-primary-soft)은 채움 전용, 글자는 본문색 — 반투명 primary 위 muted 글자는 대비 4.44:1 로 미달 -->
        <p class="text-sm text-foreground">{{ t('seed.empty') }}</p>
        <button
          type="button"
          :disabled="store.saving"
          class="inline-flex h-9 items-center gap-2 rounded-md border border-primary bg-card px-4 text-sm font-medium text-primary transition-colors hover:bg-secondary disabled:opacity-50"
          @click="store.seedFromReport()"
        >
          <Sparkles class="h-4 w-4" />
          {{ t('seed.button') }}
        </button>
      </div>

      <!-- 운영자료 (정적 참조 자료) -->
      <OperationsReference v-if="activeTab === 'operations'" />

      <!-- 예산 집행 (DB 기반 CRUD) -->
      <BudgetReference v-else-if="activeTab === 'budget'" />

      <!-- 접속기록 / 변경이력 (admin 전용) -->
      <AccessLogTable v-else-if="activeTab === 'logs'" />

      <!-- 회원관리 — 계정 목록 / 권한 변경 (admin 전용) -->
      <MemberTable v-else-if="activeTab === 'members'" />

      <template v-else>
        <!-- 검색 + (실적 분석) 서브탭 + 등록 — 한 행 정리 -->
        <div class="mb-5 flex flex-wrap items-center gap-2" :class="activeTab === 'revenue' ? 'justify-between' : 'justify-end'">
          <!-- 실적 분석 서브탭 (왼쪽) — 검색바·등록 버튼과 높이/크기 동일 -->
          <div v-if="activeTab === 'revenue'" class="flex flex-wrap gap-2">
            <button
              v-for="rt in revenueTabs"
              :key="rt.key"
              type="button"
              class="inline-flex h-8 items-center whitespace-nowrap rounded-full border px-4 text-[13px] transition-colors"
              :class="
                revenueTab === rt.key
                  ? 'border-primary-40 bg-primary-soft font-bold text-primary'
                  : 'border-border bg-card font-medium text-muted-foreground hover:bg-secondary hover:text-foreground'
              "
              @click="revenueTab = rt.key"
            >
              {{ rt.label }}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative w-48 sm:w-64">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="store.query"
                type="search"
                :placeholder="t(maskSensitive ? 'search.placeholderMasked' : 'search.placeholder')"
                class="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              v-if="activeTab === 'installations' && canEdit"
              type="button"
              class="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active"
              @click="openInstallationModal()"
            >
              <Plus class="h-4 w-4" /> {{ t('btn.addInstallation') }}
            </button>
          </div>
        </div>

        <!-- 로딩 -->
        <div v-if="store.loading" class="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-20 text-muted-foreground">
          <Loader2 class="h-5 w-5 animate-spin" />
          {{ t('loading') }}
        </div>

        <!-- 장착 실적 -->
        <section v-else-if="activeTab === 'installations'" class="rounded-xl border border-border bg-card">
          <div class="overflow-x-auto">
          <table class="asm-table w-full min-w-260 text-left text-sm">
            <thead>
              <tr>
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.workDate') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.customer') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.productRim') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.qty') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.tirePrice') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.serviceFee') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.discount') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.mobFee') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.received') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-center font-medium">{{ t('th.report') }}</th>
                <th scope="col" class="px-4 py-3"><span class="sr-only">{{ t('th.action') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.filteredInstallations.length">
                <td colspan="11" class="px-4 py-14 text-center text-muted-foreground">
                  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
                  {{ t('installations.empty') }}
                </td>
              </tr>
              <tr
                v-for="item in instPage.paged.value"
                :key="item.id"
                class="cursor-pointer align-top outline-none focus-visible:bg-primary-soft"
                :title="canEdit ? t('installations.rowHint') : t('installations.rowHintView')"
                role="button"
                tabindex="0"
                @click="openInstallationModal(item)"
                @keydown.enter="openInstallationModal(item)"
                @keydown.space.prevent="openInstallationModal(item)">
                <td class="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  <p class="text-foreground">{{ formatDate(item.workDate) }}</p>
                  <p v-if="item.worker" class="mt-0.5 text-xs">{{ t('form.worker') }}: {{ item.worker }}</p>
                </td>
                <td class="px-4 py-3">
                  <p :title="maskedName(item.customerName)" class="max-w-52 truncate font-semibold text-foreground">{{ maskedName(item.customerName) }}</p>
                  <p :title="maskedName(item.distributor)" class="mt-0.5 max-w-52 truncate text-xs text-muted-foreground">{{ maskedName(item.distributor) }}</p>
                </td>
                <td class="px-4 py-3 text-muted-foreground">
                  <p v-for="line in productLines(item.product)" :key="line" :title="line" class="max-w-52 truncate">{{ line }}</p>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(item.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ maskedIDR(item.tirePrice, true) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ maskedIDR(item.serviceFee) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ maskedPercent(item.discountRate) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ maskedIDR(item.mobilizationFee) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ maskedIDR(item.receivedAmount) }}</td>
                <td class="px-4 py-3 text-center">
                  <div v-if="reportFilesOf(item).length && canViewReport" class="flex items-center justify-center gap-1">
                    <button
                      v-for="f in reportFilesOf(item)"
                      :key="f.fileId"
                      type="button"
                      class="rounded-md p-1.5 text-primary transition hover:bg-secondary"
                      :title="t('report.rowHint')"
                      :aria-label="t('report.rowHint')"
                      @click.stop="openReportPreview(f.fileId, f.fileName)"
                    >
                      <FileText class="h-4 w-4" />
                    </button>
                  </div>
                  <span v-else class="text-xs text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="canEdit" class="flex justify-end gap-1">
                    <button
                      type="button"
                      class="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      :aria-label="t('btn.edit')"
                      @click.stop="openInstallationModal(item)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                    <button
                      v-if="canDelete"
                      type="button"
                      class="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                      :aria-label="t('btn.delete')"
                      @click.stop="confirmDelete('installations', item.id, maskedName(item.customerName), item)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="store.filteredInstallations.length">
              <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
              <tr>
                <td class="px-4 py-3" colspan="3">
                  {{ t('revenue.total') }} ({{ store.filteredInstallations.length }} {{ t('unit.items') }})
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ formatNumber(installationsTotal.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(installationsTotal.tirePrice, true) }}</td>
                <td class="px-4 py-3" colspan="3" />
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(installationsTotal.received) }}</td>
                <td class="px-4 py-3" colspan="2" />
              </tr>
            </tfoot>
          </table>
          </div>
          <TablePagination
            :page="instPage.page.value"
            :page-count="instPage.pageCount.value"
            :start="instPage.start.value"
            :end="instPage.end.value"
            :total="instPage.total.value"
            @go="instPage.go"
          />
        </section>

        <!-- 실적 분석: 고객별 매출 / 월별 매출 (서브탭은 상단 검색 행에) -->
        <div v-else>
        <!-- 고객별 매출 -->
        <section v-if="revenueTab === 'customer'" class="rounded-xl border border-border bg-card">
          <div class="overflow-x-auto">
          <table class="asm-table w-full min-w-140 table-fixed text-left text-sm">
            <thead>
              <tr>
                <th scope="col" class="w-1/12 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.rank') }}</th>
                <th scope="col" class="w-1/4 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.installCustomer') }}</th>
                <th scope="col" class="w-1/6 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.area') }}</th>
                <th scope="col" class="w-1/4 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.requestCustomer') }}</th>
                <th scope="col" class="w-1/12 whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.qty') }}</th>
                <th scope="col" class="w-1/6 whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.received') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.revenueByCustomer.length">
                <td colspan="6" class="px-4 py-14 text-center text-muted-foreground">
                  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
                  {{ t('revenue.empty') }}
                </td>
              </tr>
              <tr
                v-for="([name, value], index) in custPage.paged.value"
                :key="name"
              >
                <td class="px-4 py-3 text-muted-foreground">{{ custPage.offset.value + index + 1 }}</td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    class="font-semibold text-foreground underline-offset-2 hover:underline"
                    :title="t('revenue.rowHint')"
                    @click="revenueDetailCustomer = name"
                  >
                    {{ maskedName(name) }}
                  </button>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ areaByCustomer.get(name) ? maskedName(areaByCustomer.get(name)!) : '-' }}</td>
                <td class="px-4 py-3">
                  <template v-for="(reqName, reqIndex) in requestCustomersOf(name)" :key="reqName">
                    <span v-if="reqIndex > 0" class="text-muted-foreground">, </span>
                    <button
                      type="button"
                      class="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      :title="t('request.modalTitle')"
                      @click="requestDetail = reqName"
                    >
                      {{ maskedName(reqName) }}
                    </button>
                  </template>
                  <span v-if="!requestCustomersOf(name).length" class="text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatNumber(value.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ maskedIDR(value.revenue) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="store.revenueByCustomer.length">
              <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
              <tr>
                <td class="px-4 py-3" colspan="4">
                  {{ t('revenue.total') }} ({{ store.revenueByCustomer.length }} {{ t('revenue.customersUnit') }})
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ formatNumber(store.summary.totalQty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(store.summary.totalRevenue) }}</td>
              </tr>
            </tfoot>
          </table>
          </div>
          <TablePagination
            :page="custPage.page.value"
            :page-count="custPage.pageCount.value"
            :start="custPage.start.value"
            :end="custPage.end.value"
            :total="custPage.total.value"
            @go="custPage.go"
          />
        </section>

        <!-- 월별 매출 -->
        <section v-else class="rounded-xl border border-border bg-card">
          <div class="overflow-x-auto">
          <table class="asm-table w-full min-w-140 text-left text-sm">
            <thead>
              <tr>
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.month') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.jobs') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.qty') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.received') }}</th>
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
                v-for="[month, value] in monthPage.paged.value"
                :key="month"
                class="cursor-pointer outline-none focus-visible:bg-primary-soft"
                :title="t('month.rowHint')"
                role="button"
                tabindex="0"
                @click="monthDetail = month"
                @keydown.enter="monthDetail = month"
                @keydown.space.prevent="monthDetail = month">
                <td class="whitespace-nowrap px-4 py-3 font-medium text-foreground">{{ formatDate(month) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatNumber(value.count) }} {{ t('unit.items') }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatNumber(value.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ maskedIDR(value.revenue) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="store.revenueByMonth.length">
              <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
              <tr>
                <td class="px-4 py-3">
                  {{ t('revenue.total') }} ({{ store.revenueByMonth.length }} {{ t('revenue.monthsUnit') }})
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ formatNumber(store.summary.totalInstallations) }} {{ t('unit.items') }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ formatNumber(store.summary.totalQty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(store.summary.totalRevenue) }}</td>
              </tr>
            </tfoot>
          </table>
          </div>
          <TablePagination
            :page="monthPage.page.value"
            :page-count="monthPage.pageCount.value"
            :start="monthPage.start.value"
            :end="monthPage.end.value"
            :total="monthPage.total.value"
            @go="monthPage.go"
          />
        </section>
        </div>
      </template>
    </div>

    <!-- 푸터 (가이드 7-1) — 상단선 1px · 12px muted · 회사명 표기 -->
    <footer class="border-t border-border py-6 text-center text-xs text-muted-foreground">
      © {{ t('app.company') }}
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
      :readonly="!canEdit"
      @close="installationModalOpen = false"
      @submit="submitInstallation"
      @preview="openReportPreview"
    />
    <ReportPreviewModal
      v-if="reportPreview"
      :file-id="reportPreview.fileId"
      :file-name="reportPreview.fileName"
      @close="reportPreview = null"
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
