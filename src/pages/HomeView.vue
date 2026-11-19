<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronsUpDown, ClipboardList, EyeOff, FileText, Loader2, LogOut, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import BaseModal from '@/components/BaseModal.vue'
import { useMobilPressStore } from '@/stores/mobilPress'
import { authEnabled, canDelete, canEdit, canViewReport, currentUser, isAdmin, logout, maskSensitive, role } from '@/lib/auth-state'
import { deleteReport } from '@/lib/drive-report'
import { formatDate, formatNumber, productLines } from '@/lib/format'
import { MASKED, maskedIDR, maskedName, maskedPercent } from '@/lib/mask'
import { PERIODS, deltaPercent, periodRange, previousRange, type Period } from '@/lib/period'
import { lang, setLang, t } from '@/lib/i18n'
import TablePagination from '@/components/TablePagination.vue'
import PeriodFilter from '@/components/PeriodFilter.vue'
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
const TAB_KEYS: Tab[] = ['installations', 'revenue', 'budget', 'operations', 'logs', 'members']
const urlParams = new URLSearchParams(window.location.search)
const initialTab = urlParams.get('tab') as Tab | null
const activeTab = ref<Tab>(initialTab && TAB_KEYS.includes(initialTab) ? initialTab : 'installations')

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
const revenueTab = ref<RevenueTab>(urlParams.get('sub') === 'month' ? 'month' : 'customer')
const periodParam = urlParams.get('period')
if (PERIODS.includes(periodParam as Period)) store.period = periodParam as Period
// 검색은 장착 실적 탭에서만 동작하므로 다른 탭으로 열린 URL 의 q 는 무시합니다.
if (activeTab.value === 'installations') store.query = urlParams.get('q') ?? store.query
else store.query = ''

// 검색창이 없는 탭으로 옮기면 검색어를 비웁니다(보이지 않는 필터가 남지 않도록).
watch(activeTab, (tab) => {
  if (tab !== 'installations') store.query = ''
})

// 탭·서브탭·검색어를 URL 에 반영(replaceState) — 새로고침·링크 공유 시 보던 화면을 복원합니다.
watch([activeTab, revenueTab, () => store.query, () => store.period], ([tab, sub, q, per]) => {
  const params = new URLSearchParams(window.location.search)
  const setOrDelete = (key: string, value: string, fallback: string) =>
    value && value !== fallback ? params.set(key, value) : params.delete(key)
  setOrDelete('tab', tab, 'installations')
  setOrDelete('sub', sub, 'customer')
  setOrDelete('q', q, '')
  setOrDelete('period', per, 'all')
  const qs = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
})
const revenueTabs = computed<{ key: RevenueTab; label: string }[]>(() => [
  { key: 'customer', label: t('revenue.byCustomer') },
  { key: 'month', label: t('revenue.byMonth') },
])

// 서브탭은 같은 화면의 패널을 바꾸므로 tablist 의미를 씁니다 — 방향키·Home·End 로 이동하고 탭 정지는 하나입니다.
function onRevenueTabKey(e: KeyboardEvent) {
  const keys = revenueTabs.value.map((r) => r.key)
  const i = keys.indexOf(revenueTab.value)
  let next = i
  if (e.key === 'ArrowRight') next = (i + 1) % keys.length
  else if (e.key === 'ArrowLeft') next = (i - 1 + keys.length) % keys.length
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = keys.length - 1
  else return
  e.preventDefault()
  revenueTab.value = keys[next]
  void nextTick(() => document.getElementById(`revenue-tab-${keys[next]}`)?.focus())
}

// 페이지네이션 (장착 실적 / 고객별 매출 / 월별 매출)
// 장착 실적 정렬 — 금액 열은 조회 전용 계정에서 순위로 값이 추정되므로 정렬하지 않습니다.
type SortKey = 'workDate' | 'qty' | 'receivedAmount'
// 데이터는 작업일 최신순으로 오므로 기본 정렬을 그대로 드러낸다(날짜 열에 ▼ 표시, aria-sort=descending).
// 날짜 열은 최신순↔오래된순만 오가고, 다른 열은 내림→오름→기본(작업일 최신순)으로 돌아온다.
const DEFAULT_SORT = { key: 'workDate', dir: 'desc' } as const
const sort = ref<{ key: SortKey; dir: 'asc' | 'desc' }>({ ...DEFAULT_SORT })
function toggleSort(key: SortKey) {
  if (key === 'receivedAmount' && maskSensitive.value) return
  const cur = sort.value
  if (cur.key !== key) sort.value = { key, dir: 'desc' }
  else if (cur.dir === 'desc') sort.value = { key, dir: 'asc' }
  else sort.value = key === 'workDate' ? { key, dir: 'desc' } : { ...DEFAULT_SORT }
}
function sortMark(key: SortKey): string {
  return sort.value?.key === key ? (sort.value.dir === 'asc' ? '▲' : '▼') : ''
}
function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  return sort.value?.key === key ? (sort.value.dir === 'asc' ? 'ascending' : 'descending') : 'none'
}
const sortedInstallations = computed(() => {
  const list = store.filteredInstallations
  const s = sort.value
  const sign = s.dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (s.key === 'workDate') return (a.workDate ?? '').localeCompare(b.workDate ?? '') * sign
    return (Number(a[s.key]) - Number(b[s.key])) * sign
  })
})
// 요청고객 '+N' 펼침 상태 — 기간이 바뀌면 접습니다.
const expandedRequestRows = ref(new Set<string>())
const INST_PAGE_SIZE = 10
const instPage = usePagination(sortedInstallations, INST_PAGE_SIZE)
const custPage = usePagination(computed(() => store.revenueByCustomer), 10)
// 기간이 바뀌면 1페이지로 — 페이지 수가 같으면 usePagination 의 보정이 작동하지 않아 중간 페이지에 머무를 수 있다
watch(
  () => store.period,
  () => {
    instPage.go(1)
    custPage.go(1)
    expandedRequestRows.value = new Set()
  },
)
// 검색어·정렬이 바뀌어도 1페이지로 — 결과 수가 달라져도 페이지 수가 같으면 중간 페이지에 머물러 상위 결과를 놓친다
watch([() => store.query, sort], () => instPage.go(1))
const monthPage = usePagination(computed(() => store.revenueByMonth), 12)
// 월별 매출 합계 행 — 표에 보이는 월 행의 합. 서버 summary 는 작업일 없는 건까지 포함해 열 합과 어긋날 수 있다.
const monthTotal = computed(() =>
  store.revenueByMonth.reduce(
    (acc, [, v]) => ({
      count: acc.count + v.count,
      qty: acc.qty + v.qty,
      tirePrice: acc.tirePrice + v.tirePrice,
      netServiceFee: acc.netServiceFee + v.netServiceFee,
      mobFee: acc.mobFee + v.mobFee,
      revenue: acc.revenue + v.revenue,
    }),
    { count: 0, qty: 0, tirePrice: 0, netServiceFee: 0, mobFee: 0, revenue: 0 },
  ),
)

// 고객별 매출 합계 행 — 기간 필터가 적용된 행(store.revenueByCustomer)의 합. 서버 전체 합계를 쓰면 기간과 어긋난다.
const customerTotal = computed(() =>
  store.revenueByCustomer.reduce(
    (acc, [, v]) => ({ qty: acc.qty + v.qty, tirePrice: acc.tirePrice + v.tirePrice, revenue: acc.revenue + v.revenue }),
    { qty: 0, tirePrice: 0, revenue: 0 },
  ),
)

// 장착 실적 표 하단 합계 — 검색 필터가 적용된 전체 결과 기준(현재 페이지만이 아님)
const installationsTotal = computed(() => {
  let qty = 0
  let serviceFee = 0
  let mobilizationFee = 0
  let received = 0
  for (const item of store.filteredInstallations) {
    qty += item.qty
    serviceFee += Number(item.serviceFee) || 0
    mobilizationFee += Number(item.mobilizationFee) || 0
    received += item.receivedAmount
  }
  return { qty, serviceFee, mobilizationFee, received }
})

// 초기 데이터 등록 안내는 실제 데이터 표(장착 실적 / 실적 분석)에서만 노출합니다.
// 불러오기에 실패했을 때는 "비어 있음"과 구분되어야 하므로 숨기고, 성공한 조회가 완전히 비어 있을 때만 보입니다.
const showSeedBanner = computed(
  () =>
    canEdit.value &&
    !store.loading &&
    !store.loadError &&
    store.isEmptyDb &&
    (activeTab.value === 'installations' || activeTab.value === 'revenue'),
)

// 기간 선택 — 장착 실적 표·KPI·고객별 매출에 적용 (월별 매출은 기간 흐름 자체라 제외)
const periodVisible = computed(
  () => !store.loadError && (activeTab.value === 'installations' || activeTab.value === 'revenue'),
)
// 월별 매출은 기간 흐름 자체라 필터를 적용하지 않습니다 — 숨기지 않고 비활성+사유로 보여 줍니다.
const periodDisabled = computed(() => store.loading || (activeTab.value === 'revenue' && revenueTab.value === 'month'))
const periodNote = computed(() => (!store.loading && activeTab.value === 'revenue' && revenueTab.value === 'month' ? t('period.monthNote') : undefined))
const rangeText = (r: { from: string; to: string }) => `${formatDate(r.from)} ~ ${formatDate(r.to)}`
// 알림(live region) — 기간 변경·탭 전환·검색 결과를 한 영역에서 알려, 연달아 바뀌어도 낭독이 겹치지 않게 합니다.
const liveMessage = ref('')
watch(
  () => store.period,
  async () => {
    await nextTick()
    liveMessage.value = t('period.announce', {
      period: t(`period.${store.period}`),
      n: String(activeTab.value === 'revenue' ? store.revenueByCustomer.length : store.filteredInstallations.length),
      unit: activeTab.value === 'revenue' ? t('revenue.customersUnit') : t('unit.items'),
    })
  },
)
// 탭 전환 — 새 탭 이름을 알려 이전 기간·검색 알림이 남지 않게 합니다.
watch(activeTab, () => {
  liveMessage.value = t('tab.announce', { tab: tabs.value.find((x) => x.key === activeTab.value)?.label ?? '' })
})
const activeTabLabel = computed(() => tabs.value.find((x) => x.key === activeTab.value)?.label ?? '')
// 검색 결과 건수 — 검색어가 있을 때만 알림 영역을 갱신합니다.
const searchMessage = computed(() =>
  activeTab.value === 'installations' && store.query.trim() && !store.loading
    ? t('search.count', { n: String(store.filteredInstallations.length) })
    : '',
)
watch(searchMessage, (msg) => {
  if (msg) liveMessage.value = msg
})
// 서브탭 aria-controls — 패널이 실제로 렌더될 때만 연결합니다(로딩·오류 중에는 패널이 없음).
const panelReady = computed(() => !store.loading && !store.loadError)
const kpiScope = computed(() => {
  const range = periodRange(store.period)
  return range ? t('kpi.scopePeriod', { period: t(`period.${store.period}`), range: rangeText(range) }) : t('kpi.scope')
})
// 고객별 매출 탭의 범위 한 줄 — 기간이 전체가 아닐 때만
const periodScope = computed(() => {
  const range = periodRange(store.period)
  return range ? t('period.scope', { period: t(`period.${store.period}`), range: rangeText(range) }) : ''
})
const kpiBaseline = computed(() => {
  const prev = previousRange(store.period)
  return prev ? t('kpi.vs', { range: rangeText(prev) }) : ''
})

// 증감 표시 — 방향은 ▲▼ 와 문구로만 전달합니다(색 없음).
// 건수성 지표(abs)는 기준이 작을 때 %가 잡음이 되므로 절대 증감을 함께 보여 줍니다. 1% 미만 변화는 '0%'로 보이지 않게 '<1%'로 표시합니다.
// 마스킹 계정의 금액 증감은 값 대신 가림 표시(MASKED)와 이유 문구를 눈에 보이게 적습니다(툴팁·화살표 없음).
function kpiDelta(current: number, previous: number | undefined, opts: { masked?: boolean; abs?: boolean } = {}) {
  if (previous === undefined || !kpiBaseline.value) return null
  if (opts.masked) return { text: `${MASKED} ${t('kpi.deltaMasked')}`, sr: '', visible: true }
  const diff = current - previous
  if (diff === 0) return { text: '0%', sr: t('kpi.deltaFlat') }
  const up = diff > 0
  const mark = up ? '▲' : '▼'
  const absText = formatNumber(Math.abs(diff))
  const pct = deltaPercent(current, previous)
  if (pct === null) {
    // 이전 기간이 0건이면(항상 증가) %를 계산할 수 없다 — 건수성 지표는 절대 증감만 보여 준다
    return opts.abs
      ? { text: `${mark} ${absText}`, sr: t('kpi.deltaUpN', { a: absText }) }
      : { text: t('kpi.noBaseline'), sr: '', visible: true }
  }
  const pctText = pct === 0 ? '<1' : String(Math.abs(pct))
  if (opts.abs) {
    return {
      text: `${mark} ${absText} · ${pctText}%`,
      sr: t(up ? 'kpi.deltaUpAbs' : 'kpi.deltaDownAbs', { a: absText, n: pctText }),
    }
  }
  return { text: `${mark} ${pctText}%`, sr: t(up ? 'kpi.deltaUp' : 'kpi.deltaDown', { n: pctText }) }
}

// 장착 실적 상단 요약 — 선택 기간 기준(검색과 무관), 기간이 '전체'가 아니면 직전 동기간 대비 증감
const kpis = computed(() => {
  const cur = store.periodStats
  const prev = store.previousStats
  return [
    { key: 'jobs', label: t('kpi.jobs'), value: `${formatNumber(cur.jobs)} ${t('unit.items')}`, accent: false, delta: kpiDelta(cur.jobs, prev?.jobs, { abs: true }) },
    { key: 'qty', label: t('kpi.qty'), value: `${formatNumber(cur.qty)} pcs`, accent: false, delta: kpiDelta(cur.qty, prev?.qty, { abs: true }) },
    { key: 'received', label: t('kpi.received'), value: maskedIDR(cur.received), accent: !maskSensitive.value, delta: kpiDelta(cur.received, prev?.received, { masked: maskSensitive.value }) },
    { key: 'active', label: t('kpi.activeCustomers'), value: formatNumber(cur.customers), accent: false, delta: kpiDelta(cur.customers, prev?.customers, { abs: true }) },
  ]
})

const seedConfirmOpen = ref(false)
async function confirmSeed() {
  await store.seedFromReport()
  seedConfirmOpen.value = false
}

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

// 고객별 요청고객(distributor) 목록 — 선택 기간의 장착 실적을 단 한 번만 순회해 미리 구성.
// 열과 요청고객 모달(periodInstallations)이 같은 범위를 쓰므로 눌렀을 때 빈 모달이 열리지 않습니다.
// (기존에는 requestCustomersOf 가 매출 테이블의 각 행마다, 그것도 행당 2번씩 호출되며
//  매번 installations 전체를 filter+map 했음)
const requestCustomersByCustomer = computed(() => {
  const result = new Map<string, string[]>()
  for (const item of store.periodInstallations) {
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

// 요청고객이 둘 이상이면 첫 이름만 보이고 '+N' 으로 펼칩니다(열이 잘려 링크가 숨는 것을 막음).
function toggleRequestRow(name: string) {
  const next = new Set(expandedRequestRows.value)
  if (!next.delete(name)) next.add(name)
  expandedRequestRows.value = next
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
  if (!ok) return
  installationModalOpen.value = false
  // 저장한 행이 현재 기간·검색에 가려지면 알리고, 한 번에 풀 수 있는 버튼을 줍니다(데이터가 사라진 것처럼 보이지 않게).
  // 서버가 돌려준 id 로 판정하고, id 를 못 받았을 때만 입력 값 일치로 대신합니다.
  // 재조회가 실패했으면 표가 옛 데이터라 판정할 수 없으므로 알리지 않습니다.
  if (!store.lastSaveReloaded) return
  const savedId = store.lastSavedInstallationId
  const visible = store.filteredInstallations.some((i) =>
    savedId
      ? i.id === savedId
      : i.workDate === form.workDate && i.customerName === form.customerName && i.product === form.product,
  )
  if (!visible) {
    toast(t('toast.savedHidden'), {
      duration: 10000,
      action: { label: t('toast.showAll'), onClick: () => showAllInstallations(savedId) },
    })
  }
}

// 기간 필터와 검색을 모두 풀어 장착 실적 전체를 봅니다.
// 저장한 행 id 가 있으면 그 행이 있는 페이지로 이동해 잠시 강조하고, 낭독·포커스로도 위치를 알립니다.
const highlightId = ref<string | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | undefined
let focusTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => {
  clearTimeout(highlightTimer)
  clearTimeout(focusTimer)
})
async function showAllInstallations(savedId: string | null = null) {
  // 토스트가 떠 있는 동안 다른 탭으로 옮겼을 수 있어 장착 실적 탭으로 먼저 돌아옵니다.
  activeTab.value = 'installations'
  store.period = 'all'
  store.query = ''
  if (!savedId) return
  await nextTick()
  const idx = sortedInstallations.value.findIndex((i) => i.id === savedId)
  if (idx < 0) {
    announce(t('installations.savedRowMissing'))
    return
  }
  const page = Math.floor(idx / INST_PAGE_SIZE) + 1
  instPage.go(page)
  highlightId.value = savedId
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => (highlightId.value = null), 4000)
  await nextTick()
  const row = document.querySelector(`[data-row-id="${CSS.escape(savedId)}"]`)
  row?.scrollIntoView({ block: 'center' })
  // 안내를 먼저 쓰고 포커스는 잠시 미룬다 — 포커스 이동의 낭독이 live region 안내를 끊지 않게 한다.
  await announce(t('installations.savedRow', { page: String(page) }))
  clearTimeout(focusTimer)
  focusTimer = setTimeout(() => row?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }), 150)
}

// 같은 문구가 다시 와도 낭독되도록 비웠다가 다음 틱에 다시 쓴다.
async function announce(message: string) {
  liveMessage.value = ''
  await nextTick()
  liveMessage.value = message
}

// 삭제 확인 — 브라우저 기본 confirm 대신 모달로, 함께 지워질 보고서 수를 미리 알립니다.
const pendingDelete = ref<{
  kind: 'customers' | 'installations'
  id: string
  name: string
  reports: { fileId: string; fileName: string }[]
} | null>(null)

const pendingDeleteMessage = computed(() => {
  const pending = pendingDelete.value
  if (!pending) return ''
  return pending.reports.length
    ? t('confirm.deleteWithReports', { name: pending.name, count: String(pending.reports.length) })
    : t('confirm.delete', { name: pending.name })
})

// 보고서 버튼 라벨 — 같은 행의 여러 보고서를 번호와 파일명으로 구분
function reportLabel(index: number, fileName: string) {
  return t('report.open', { n: String(index + 1), name: fileName })
}

// 보고서 버튼 — 1개면 바로 열고, 2개 이상이면 목록에서 고른다
const reportPicker = ref<Installation | null>(null)
function reportButtonLabel(item: Installation) {
  const files = reportFilesOf(item)
  return files.length > 1
    ? t('report.openMany', { n: String(files.length), name: installationLabel(item) })
    : reportLabel(0, files[0]?.fileName ?? '')
}
function openReports(item: Installation) {
  const files = reportFilesOf(item)
  if (files.length === 1) openReportPreview(files[0].fileId, files[0].fileName)
  else if (files.length > 1) reportPicker.value = item
}
function pickReport(fileId: string, fileName: string) {
  reportPicker.value = null
  openReportPreview(fileId, fileName)
}

// 합계 행 범위 — 기간·검색이 걸려 있으면 그 범위 기준임을, 아니면 전체 건수임을 밝힌다
const installationsTotalLabel = computed(() => {
  const searching = !!store.query.trim()
  const periodic = store.period !== 'all'
  const key = periodic
    ? searching ? 'revenue.totalPeriodFiltered' : 'revenue.totalPeriod'
    : searching ? 'revenue.totalFiltered' : 'revenue.totalAll'
  return t(key, { period: t(`period.${store.period}`), n: String(store.filteredInstallations.length) })
})

// 기간은 표 위 범위 줄(periodScope)이 이미 밝히므로 합계 라벨에는 반복하지 않습니다.
const customerTotalLabel = computed(() => t('revenue.customerTotalAll', { n: String(store.revenueByCustomer.length) }))

// 삭제 확인에서 같은 고객의 여러 건을 구분하는 라벨: 작업일 · 수량 · 고객명(금액은 조회 전용 마스킹과 무관하게 넣지 않음)
// 클릭 가능한 이름 — 파랑 + hover 밑줄(굵기 없음). 조회 전용 마스킹 이름은 링크 색을 빼 값으로 읽히게 한다.
const nameLinkClass = computed(() =>
  maskSensitive.value
    ? 'text-foreground underline decoration-dotted underline-offset-2 hover:decoration-solid'
    : 'text-primary underline-offset-2 hover:text-primary-hover hover:underline',
)

function installationLabel(item: Installation) {
  return `${formatDate(item.workDate)} · ${formatNumber(item.qty)} pcs · ${maskedName(item.customerName)}`
}

function requestDelete(kind: 'customers' | 'installations', id: string, name: string, item?: Installation) {
  pendingDelete.value = { kind, id, name, reports: kind === 'installations' && item ? reportFilesOf(item) : [] }
}

async function confirmDelete() {
  const pending = pendingDelete.value
  if (!pending) return
  // 레코드를 먼저 지우고, 성공했을 때만 Drive 보고서를 정리합니다(휴지통 이동).
  // 레코드 삭제가 실패하면 보고서는 그대로 남아 행과 파일이 어긋나지 않습니다.
  const deleted = await store.deleteRecord(pending.kind, pending.id)
  pendingDelete.value = null
  if (!deleted) return
  let failed = 0
  for (const file of pending.reports) {
    try {
      await deleteReport(file.fileId)
    } catch {
      failed += 1
    }
  }
  if (failed) toast.error(t('toast.reportDeleteFail', { count: String(failed) }))
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
          <h1 class="sr-only md:not-sr-only md:ml-3 md:block md:truncate md:border-l md:border-border md:pl-3 md:text-sm md:font-medium md:text-foreground">
            {{ t('app.title') }}
          </h1>
        </div>

        <!-- 2열: 대분류 메뉴 (중앙) — 활성은 블루 10% 틴트 + 블루 글자 700 (가이드 7-2) -->
        <nav :aria-label="t('nav.main')" class="flex flex-wrap justify-center gap-1 lg:justify-self-center">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
            :aria-current="activeTab === tab.key ? 'page' : undefined"
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
          <span v-if="authEnabled && currentUser" class="asm-pill hidden md:inline-flex">{{ t(`role.${role}`) }}</span>

          <!-- 언어 전환 (기본: 인도네시아어) -->
          <div class="flex shrink-0 gap-0.5 rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              class="inline-flex min-h-7 min-w-8 items-center justify-center rounded-sm px-2 text-xs font-medium transition-colors"
              :class="lang === 'id' ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-secondary'"
              aria-label="Bahasa Indonesia"
              :aria-pressed="lang === 'id'"
              @click="setLang('id')"
            >
              ID
            </button>
            <button
              type="button"
              class="inline-flex min-h-7 min-w-8 items-center justify-center rounded-sm px-2 text-xs font-medium transition-colors"
              :class="lang === 'ko' ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-secondary'"
              aria-label="한국어"
              :aria-pressed="lang === 'ko'"
              @click="setLang('ko')"
            >
              KO
            </button>
          </div>

          <button
            v-if="authEnabled && currentUser"
            type="button"
            class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            :title="`${currentUser.email} · ${t('btn.logout')}`"
            :aria-label="`${t('btn.logout')} · ${currentUser.name || currentUser.email}`"
            @click="onLogout"
          >
            <LogOut class="h-4 w-4" />
            <span class="hidden lg:inline">{{ currentUser.name || currentUser.email }}</span>
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
        class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info-border bg-info-soft px-5 py-4"
      >
        <!-- 파스텔(bg-primary-soft)은 채움 전용, 글자는 본문색 — 반투명 primary 위 muted 글자는 대비 4.44:1 로 미달 -->
        <p class="text-sm text-foreground">{{ t('seed.empty') }}</p>
        <button
          type="button"
          :disabled="store.saving"
          class="inline-flex h-9 items-center gap-2 rounded-md border border-primary bg-card px-4 text-sm font-medium text-primary transition-colors hover:bg-secondary disabled:opacity-50"
          @click="seedConfirmOpen = true"
        >
          <Sparkles class="h-4 w-4" />
          {{ t('seed.button') }}
        </button>
      </div>

      <!-- 알림 영역 — 탭 분기 밖에 항상 둡니다(탭을 옮겨도 사라지지 않음) -->
      <h2 class="sr-only">{{ activeTabLabel }}</h2>
      <p role="status" class="sr-only">{{ liveMessage }}</p>

      <!-- 운영자료 (정적 참조 자료) -->
      <OperationsReference v-if="activeTab === 'operations'" />

      <!-- 예산 집행 (DB 기반 CRUD) -->
      <BudgetReference v-else-if="activeTab === 'budget'" />

      <!-- 접속기록 / 변경이력 (admin 전용) -->
      <AccessLogTable v-else-if="activeTab === 'logs'" />

      <!-- 회원관리 — 계정 목록 / 권한 변경 (admin 전용) -->
      <MemberTable v-else-if="activeTab === 'members'" />

      <template v-else>
        <!-- 로딩 중 KPI 자리 예약 — 실제 요약과 같은 구조(범위 2줄 + 2열/4열 격자)로 비워 두어 나타날 때 표가 밀리지 않게 합니다 -->
        <div v-if="activeTab === 'installations' && store.loading" aria-hidden="true">
          <div class="mb-1 h-9"></div>
          <div class="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
            <div v-for="n in 4" :key="n" class="h-18 bg-card"></div>
          </div>
        </div>
        <!-- 전체 요약 — 검색·페이지와 무관한 전체 기준. 금액은 조회 전용 계정에서 마스킹 -->
        <div v-if="activeTab === 'installations' && !store.loading && !store.loadError" class="mb-1 min-h-9 text-xs text-muted-foreground">
          <p>{{ kpiScope }}</p>
          <p class="min-h-4 text-foreground">{{ kpiBaseline }}</p>
        </div>
        <dl
          v-if="activeTab === 'installations' && !store.loading && !store.loadError"
          :aria-label="`${t('kpi.label')} — ${kpiScope}`"
          class="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4"
        >
          <div v-for="kpi in kpis" :key="kpi.key" class="min-h-18 bg-card px-4 py-3">
            <dt class="text-xs font-medium text-muted-foreground">{{ kpi.label }}</dt>
            <dd class="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span class="text-lg font-bold tabular-nums" :class="kpi.accent ? 'text-primary' : 'text-foreground'">{{ kpi.value }}</span>
              <template v-if="kpi.delta">
                <span v-if="'visible' in kpi.delta" class="text-xs text-muted-foreground">{{ kpi.delta.text }}</span>
                <template v-else>
                  <span v-if="kpi.delta.text" class="text-sm font-medium tabular-nums text-foreground" aria-hidden="true">{{ kpi.delta.text }}</span>
                  <span class="sr-only">{{ kpi.delta.sr }}</span>
                </template>
              </template>
            </dd>
          </div>
        </dl>

        <!-- 검색 + (실적 분석) 서브탭 + 등록 — 한 행 정리 -->
        <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <!-- 실적 분석 서브탭 (왼쪽) — 검색바·등록 버튼과 높이/크기 동일 -->
            <div v-if="activeTab === 'revenue'" role="tablist" :aria-label="t('tab.revenue')" class="flex flex-wrap gap-2" @keydown="onRevenueTabKey">
              <button
                v-for="rt in revenueTabs"
                :id="`revenue-tab-${rt.key}`"
                :key="rt.key"
                type="button"
                role="tab"
                class="inline-flex h-9 items-center whitespace-nowrap rounded-md border px-4 text-sm transition-colors"
                :class="
                  revenueTab === rt.key
                    ? 'border-primary-40 bg-primary-soft font-bold text-primary'
                    : 'border-border bg-card font-medium text-muted-foreground hover:bg-secondary hover:text-foreground'
                "
                :aria-selected="revenueTab === rt.key"
                :aria-controls="revenueTab === rt.key && panelReady ? `revenue-panel-${rt.key}` : undefined"
                :tabindex="revenueTab === rt.key ? 0 : -1"
                @click="revenueTab = rt.key"
              >
                {{ rt.label }}
              </button>
            </div>
            <PeriodFilter
              v-if="periodVisible"
              v-model="store.period"
              :disabled="periodDisabled"
              :note="periodNote"
            />
          </div>
          <div class="flex items-center gap-2">
            <div v-if="activeTab === 'installations' && !store.loadError" class="relative w-48 sm:w-64">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="store.query"
                type="search"
                :aria-label="t('search.label')"
                :placeholder="t(maskSensitive ? 'search.placeholderMasked' : 'search.placeholder')"
                class="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              v-if="activeTab === 'installations' && canEdit && !store.loadError"
              type="button"
              class="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active"
              @click="openInstallationModal()"
            >
              <Plus class="h-4 w-4" /> {{ t('btn.addInstallation') }}
            </button>
          </div>
        </div>

        <!-- 로딩 -->
        <div
          v-if="store.loading"
          role="status"
          class="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-14 text-muted-foreground"
        >
          <Loader2 class="h-5 w-5 animate-spin" />
          {{ t('loading') }}
        </div>

        <!-- 불러오기 실패 — 빈 표와 구분하고 재시도를 제공합니다(실패 중에는 빈 상태 문구·시드 안내를 숨김) -->
        <div
          v-else-if="store.loadError"
          role="alert"
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive bg-card px-5 py-6"
        >
          <div class="min-w-0">
            <p class="text-sm font-bold text-destructive">{{ t('loadError.title') }}</p>
            <p class="mt-1 text-sm text-foreground">{{ t('loadError.hint') }}</p>
            <p class="mt-1 break-words text-xs text-muted-foreground">{{ store.loadError }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-primary bg-card px-4 text-sm font-medium text-primary transition-colors hover:bg-secondary"
            @click="store.loadData()"
          >
            {{ t('loadError.retry') }}
          </button>
        </div>

        <!-- 장착 실적 -->
        <section v-else-if="activeTab === 'installations'" class="rounded-lg border border-border bg-card">
          <div class="overflow-x-auto">
          <table class="asm-table w-full min-w-240 text-left text-sm">
            <thead>
              <tr>
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium" :aria-sort="ariaSort('workDate')">
                  <button type="button" class="inline-flex items-center gap-1 font-medium" @click="toggleSort('workDate')">{{ t('th.workDate') }}<span v-if="sort?.key === 'workDate'" aria-hidden="true" class="text-xs">{{ sortMark('workDate') }}</span><ChevronsUpDown v-else class="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /></button>
                </th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.customer') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.productRim') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium" :aria-sort="ariaSort('qty')">
                  <button type="button" class="inline-flex items-center gap-1 font-medium" @click="toggleSort('qty')">{{ t('th.qty') }}<span v-if="sort?.key === 'qty'" aria-hidden="true" class="text-xs">{{ sortMark('qty') }}</span><ChevronsUpDown v-else class="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /></button>
                </th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium"><span class="text-muted-foreground">{{ t('th.serviceFee') }} <span class="text-xs font-normal">({{ t('th.refOnly') }})</span></span></th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.discount') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.mobFee') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium" :aria-sort="maskSensitive ? undefined : ariaSort('receivedAmount')">
                  <span v-if="maskSensitive" class="font-medium" :title="t('sort.maskedHint')">{{ t('th.received') }}<span class="ml-1 text-xs font-normal text-muted-foreground">({{ t('th.masked') }})</span><span class="sr-only">. {{ t('sort.maskedHint') }}</span></span>
                  <button v-else type="button" class="inline-flex items-center gap-1 font-medium" @click="toggleSort('receivedAmount')">{{ t('th.received') }}<span v-if="sort?.key === 'receivedAmount'" aria-hidden="true" class="text-xs">{{ sortMark('receivedAmount') }}</span><ChevronsUpDown v-else class="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /></button>
                </th>
                <th scope="col" class="asm-sticky-end px-4 py-3"><span class="sr-only">{{ t('th.report') }} · {{ t('th.action') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.filteredInstallations.length">
                <td colspan="9" class="px-4 py-14 text-center text-muted-foreground">
                  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <template v-if="store.query.trim()">
                    <p>{{ t('search.noMatch', { q: store.query.trim() }) }}</p>
                    <p v-if="maskSensitive" class="mt-1 text-xs">{{ t('search.maskedHint') }}</p>
                    <button
                      type="button"
                      class="mt-3 inline-flex h-8 items-center rounded-md border border-primary bg-card px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary"
                      @click="store.query = ''"
                    >
                      {{ t('search.clear') }}
                    </button>
                    <button
                      v-if="store.period !== 'all'"
                      type="button"
                      class="ml-2 mt-3 inline-flex h-8 items-center rounded-md border border-primary bg-card px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary"
                      @click="store.period = 'all'"
                    >
                      {{ t('period.showAll') }}
                    </button>
                  </template>
                  <template v-else-if="store.period !== 'all' && store.installations.length">
                    {{ t('period.empty') }}
                    <div><button
                      type="button"
                      class="mt-3 inline-flex h-8 items-center rounded-md border border-primary bg-card px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary"
                      @click="store.period = 'all'"
                    >
                      {{ t('period.showAll') }}
                    </button></div>
                  </template>
                  <template v-else>{{ t('installations.empty') }}</template>
                </td>
              </tr>
              <tr
                v-for="item in instPage.paged.value"
                :key="item.id"
                :data-row-id="item.id"
                :data-highlight="highlightId === item.id ? '' : undefined"
                class="has-[:focus-visible]:bg-primary-soft">
                <td class="whitespace-nowrap px-4 py-3 text-foreground">{{ formatDate(item.workDate) }}</td>
                <td class="px-4 py-3">
                  <!-- 행 열기는 실제 버튼으로만 — 행 전체 클릭을 없애 셀 텍스트를 드래그·복사할 수 있습니다 -->
                  <button
                    type="button"
                    class="block max-w-52 text-left"
                    :title="`${maskedName(item.customerName)} — ${canEdit ? t('installations.rowHint') : t('installations.rowHintView')}`"
                    @click.stop="openInstallationModal(item)"
                  >
                    <span class="block truncate" :class="nameLinkClass">{{ maskedName(item.customerName) }}</span>
                    <span class="sr-only">{{ canEdit ? t('installations.rowHint') : t('installations.rowHintView') }}</span>
                  </button>
                </td>
                <td class="px-4 py-3 text-muted-foreground">
                  <p :title="productLines(item.product).join(' / ')" class="max-w-52 truncate">
                    <span aria-hidden="true">{{ productLines(item.product)[0] }}<span v-if="productLines(item.product).length > 1" class="ml-1 text-xs tabular-nums">+{{ productLines(item.product).length - 1 }}</span></span>
                    <span class="sr-only">{{ productLines(item.product).join(' / ') }}</span>
                  </p>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(item.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ maskedIDR(item.serviceFee) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ maskedPercent(item.discountRate) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ maskedIDR(item.mobilizationFee) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-bold tabular-nums text-foreground">{{ maskedIDR(item.receivedAmount) }}</td>
                <td class="asm-sticky-end px-4 py-3">
                  <div class="-my-1 flex justify-end gap-1">
                    <template v-if="canViewReport && reportFilesOf(item).length">
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 rounded-md p-1.5 text-primary transition hover:bg-secondary"
                        :title="reportButtonLabel(item)"
                        :aria-label="reportButtonLabel(item)"
                        @click.stop="openReports(item)"
                      >
                        <FileText class="h-4 w-4" />
                        <span v-if="reportFilesOf(item).length > 1" class="text-xs font-bold tabular-nums">{{ reportFilesOf(item).length }}</span>
                      </button>
                    </template>
                    <template v-if="canEdit">
                      <button
                        type="button"
                        class="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                        :aria-label="t('btn.editItem', { name: installationLabel(item) })"
                        :title="t('btn.edit')"
                        tabindex="-1"
                        @click.stop="openInstallationModal(item)"
                      >
                        <Pencil class="h-4 w-4" />
                      </button>
                      <button
                        v-if="canDelete"
                        type="button"
                        class="ml-2 rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                        :aria-label="t('btn.deleteItem', { name: installationLabel(item) })"
                        :title="t('btn.delete')"
                        @click.stop="requestDelete('installations', item.id, installationLabel(item), item)"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="store.filteredInstallations.length">
              <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
              <tr>
                <td class="px-4 py-3" colspan="3">
                  {{ installationsTotalLabel }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ formatNumber(installationsTotal.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums"><span class="text-muted-foreground">{{ maskedIDR(installationsTotal.serviceFee, true) }}</span></td>
                <!-- 할인은 건별 비율이라 합계를 두지 않는다 -->
                <td class="px-4 py-3" />
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(installationsTotal.mobilizationFee, true) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(installationsTotal.received) }}</td>
                <td class="asm-sticky-end px-4 py-3" />
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
          <p class="border-t border-border px-4 py-2 text-xs text-muted-foreground">{{ t('th.refLegend') }}</p>
        </section>

        <!-- 실적 분석: 고객별 매출 / 월별 매출 (서브탭은 상단 검색 행에) -->
        <div v-else>
        <!-- 고객별 매출 -->
        <section v-if="revenueTab === 'customer'" id="revenue-panel-customer" role="tabpanel" tabindex="0" aria-labelledby="revenue-tab-customer" class="rounded-lg border border-border bg-card">
          <p v-if="periodScope" class="border-b border-border px-4 py-2 text-xs text-muted-foreground">{{ periodScope }}</p>
          <div class="overflow-x-auto">
          <table class="asm-table w-full min-w-160 table-fixed text-left text-sm">
            <thead>
              <tr>
                <th scope="col" class="w-1/12 whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.rank') }}</th>
                <th scope="col" class="w-1/6 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.installCustomer') }}</th>
                <th scope="col" class="w-1/6 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.area') }}</th>
                <th scope="col" class="w-1/6 whitespace-nowrap px-4 py-3 font-medium">{{ t('th.requestCustomer') }}</th>
                <th scope="col" class="w-1/12 whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.qty') }}</th>
                <th scope="col" class="w-1/6 whitespace-nowrap px-4 py-3 text-right font-medium"><span class="text-muted-foreground">{{ t('th.tirePrice') }} <span class="text-xs font-normal">({{ t('th.refOnly') }})</span></span></th>
                <th scope="col" class="w-1/6 whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.received') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.revenueByCustomer.length">
                <td colspan="7" class="px-4 py-14 text-center text-muted-foreground">
                  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <template v-if="store.period !== 'all' && store.installations.length">
                    {{ t('period.empty') }}
                    <div><button
                      type="button"
                      class="mt-3 inline-flex h-8 items-center rounded-md border border-primary bg-card px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary"
                      @click="store.period = 'all'"
                    >
                      {{ t('period.showAll') }}
                    </button></div>
                  </template>
                  <template v-else>{{ t('revenue.empty') }}</template>
                </td>
              </tr>
              <tr
                v-for="([name, value], index) in custPage.paged.value"
                :key="name"
                class="has-[:focus-visible]:bg-primary-soft"
              >
                <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">{{ custPage.offset.value + index + 1 }}</td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    class="block w-full truncate text-left"
                    :class="nameLinkClass"
                    :title="`${maskedName(name)} — ${t('revenue.rowHint')}`"
                    @click="revenueDetailCustomer = name"
                  >
                    {{ maskedName(name) }}<span class="sr-only"> — {{ t('revenue.rowHint') }}</span>
                  </button>
                </td>
                <td class="truncate px-4 py-3 text-muted-foreground" :title="areaByCustomer.get(name) ? maskedName(areaByCustomer.get(name)!) : ''">{{ areaByCustomer.get(name) ? maskedName(areaByCustomer.get(name)!) : '-' }}</td>
                <td class="px-4 py-3">
                  <div
                    :id="`request-list-${index}`"
                    class="flex items-baseline gap-x-1"
                    :class="expandedRequestRows.has(name) ? 'flex-wrap gap-y-1' : 'flex-nowrap'"
                  >
                    <template v-for="(reqName, reqIndex) in requestCustomersOf(name)" :key="reqName">
                      <template v-if="reqIndex === 0 || expandedRequestRows.has(name)">
                        <span v-if="reqIndex > 0" class="text-muted-foreground" aria-hidden="true">,</span>
                        <button
                          type="button"
                          class="min-w-0 text-left"
                          :class="[nameLinkClass, expandedRequestRows.has(name) ? '' : 'truncate']"
                          :title="maskedName(reqName)"
                          @click="requestDetail = reqName"
                        >
                          {{ maskedName(reqName) }}<span class="sr-only"> — {{ t('request.rowHint') }}</span>
                        </button>
                      </template>
                    </template>
                    <button
                      v-if="requestCustomersOf(name).length > 1"
                      type="button"
                      class="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-md border sm:min-h-6 sm:min-w-6 border-border px-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground hover:bg-secondary hover:text-foreground"
                      :aria-expanded="expandedRequestRows.has(name)"
                      :aria-controls="`request-list-${index}`"
                      @click="toggleRequestRow(name)"
                    >
                      <template v-if="expandedRequestRows.has(name)">{{ t('request.collapse') }}<span class="sr-only"> {{ t('request.collapseHint') }}</span></template>
                      <template v-else>+{{ requestCustomersOf(name).length - 1 }}<span class="sr-only"> {{ t('request.moreHint', { n: String(requestCustomersOf(name).length - 1) }) }}</span></template>
                    </button>
                    <span v-if="!requestCustomersOf(name).length" class="text-muted-foreground">-</span>
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(value.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground"><span class="text-muted-foreground">{{ maskedIDR(value.tirePrice, true) }}</span></td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-bold tabular-nums text-foreground">{{ maskedIDR(value.revenue) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="store.revenueByCustomer.length">
              <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
              <tr>
                <td class="px-4 py-3" colspan="4">
                  {{ customerTotalLabel }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ formatNumber(customerTotal.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums"><span class="text-muted-foreground">{{ maskedIDR(customerTotal.tirePrice, true) }}</span></td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(customerTotal.revenue) }}</td>
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
          <p class="border-t border-border px-4 py-2 text-xs text-muted-foreground">{{ t('th.refLegend') }}</p>
        </section>

        <!-- 월별 매출 -->
        <section v-else id="revenue-panel-month" role="tabpanel" tabindex="0" aria-labelledby="revenue-tab-month" class="rounded-lg border border-border bg-card">
          <div class="overflow-x-auto">
          <table class="asm-table w-full min-w-200 text-left text-sm">
            <thead>
              <tr>
                <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.month') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.jobs') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.qty') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium"><span class="text-muted-foreground">{{ t('th.tirePrice') }} <span class="text-xs font-normal">({{ t('th.refOnly') }})</span></span></th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.serviceFeeNet') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.mobFee') }}</th>
                <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.received') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!store.revenueByMonth.length">
                <td colspan="7" class="px-4 py-14 text-center text-muted-foreground">
                  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
                  {{ t('revenue.empty') }}
                </td>
              </tr>
              <tr
                v-for="[month, value] in monthPage.paged.value"
                :key="month"
                class="has-[:focus-visible]:bg-primary-soft"
              >
                <td class="whitespace-nowrap px-4 py-3 text-foreground">
                  <button type="button" class="text-left" :class="nameLinkClass" :title="t('month.rowHint')" @click="monthDetail = month">
                    {{ formatDate(month) }}<span class="sr-only"> — {{ t('month.rowHint') }}</span>
                  </button>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(value.count) }} {{ t('unit.items') }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(value.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-muted-foreground"><span class="text-muted-foreground">{{ maskedIDR(value.tirePrice, true) }}</span></td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ maskedIDR(value.netServiceFee, true) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums text-foreground">{{ maskedIDR(value.mobFee, true) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-bold tabular-nums text-foreground">{{ maskedIDR(value.revenue) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="store.revenueByMonth.length">
              <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
              <tr>
                <td class="px-4 py-3">
                  {{ t('revenue.total') }} ({{ store.revenueByMonth.length }} {{ t('revenue.monthsUnit') }})
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ formatNumber(monthTotal.count) }} {{ t('unit.items') }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ formatNumber(monthTotal.qty) }} pcs</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums"><span class="text-muted-foreground">{{ maskedIDR(monthTotal.tirePrice, true) }}</span></td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(monthTotal.netServiceFee, true) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(monthTotal.mobFee, true) }}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(monthTotal.revenue) }}</td>
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
          <p class="border-t border-border px-4 py-2 text-xs text-muted-foreground">{{ t('th.refLegend') }}</p>
        </section>
        </div>
      </template>
    </div>

    <!-- 푸터 (가이드 7-1) — 상단선 1px · 12px muted · 회사명 표기 -->
    <footer class="border-t border-border py-6 text-center text-xs text-muted-foreground">
      © {{ t('app.company') }}
    </footer>

    <BaseModal v-if="seedConfirmOpen" :title="t('seed.confirmTitle')" @close="seedConfirmOpen = false">
      <p class="text-sm leading-relaxed text-foreground">{{ t('seed.confirmBody') }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          @click="seedConfirmOpen = false"
        >
          {{ t('btn.cancel') }}
        </button>
        <button
          type="button"
          :disabled="store.saving"
          class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          @click="confirmSeed"
        >
          <Loader2 v-if="store.saving" class="h-4 w-4 animate-spin" />
          {{ t('seed.button') }}
        </button>
      </div>
    </BaseModal>
    <BaseModal v-if="pendingDelete" :title="t('confirm.deleteTitle')" @close="pendingDelete = null">
      <p class="text-sm leading-relaxed text-foreground">{{ pendingDeleteMessage }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          @click="pendingDelete = null"
        >
          {{ t('btn.cancel') }}
        </button>
        <button
          type="button"
          :disabled="store.saving"
          class="inline-flex h-9 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-bold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          @click="confirmDelete"
        >
          <Loader2 v-if="store.saving" class="h-4 w-4 animate-spin" />
          {{ t('btn.delete') }}
        </button>
      </div>
    </BaseModal>
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
    <BaseModal v-if="reportPicker" :title="t('report.pickTitle')" @close="reportPicker = null">
      <p class="mb-3 text-sm text-muted-foreground">{{ installationLabel(reportPicker) }}</p>
      <ul class="flex flex-col gap-2">
        <li v-for="(f, fi) in reportFilesOf(reportPicker)" :key="f.fileId">
          <button
            type="button"
            class="inline-flex h-9 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-sm text-foreground transition-colors hover:bg-secondary"
            :title="reportLabel(fi, f.fileName)"
            @click="pickReport(f.fileId, f.fileName)"
          >
            <FileText class="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span class="truncate">{{ reportLabel(fi, f.fileName) }}</span>
          </button>
        </li>
      </ul>
    </BaseModal>
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
      :installations="store.periodInstallations"
      :all-installations="store.installations"
      :scope="periodScope"
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
      :installations="store.periodInstallations"
      :all-installations="store.installations"
      :scope="periodScope"
      @close="requestDetail = null"
    />
  </main>
</template>
