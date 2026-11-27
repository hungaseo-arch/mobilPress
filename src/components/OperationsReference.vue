<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { BookOpen, ChevronDown } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import { getOperationsTabs } from '@/data/operations'
import type { OpsGantt, OpsSection, OpsTab } from '@/data/operations'
import { lang, t } from '@/lib/i18n'
import { maskSensitive } from '@/lib/auth-state'
import { MASKED, maskedName } from '@/lib/mask'

// ── 섹션 행 배치 (rowLayout / pairSections) ──────
/** rowLayout 이 있으면 지정한 개수만큼 행으로 분할, 없으면 전체를 한 그룹으로 반환. */
function sectionGroups(tab: OpsTab): { sections: OpsSection[]; offset: number }[] {
  if (!tab.rowLayout?.length) return [{ sections: tab.sections, offset: 0 }]
  const groups: { sections: OpsSection[]; offset: number }[] = []
  let offset = 0
  for (const n of tab.rowLayout) {
    if (offset >= tab.sections.length) break
    groups.push({ sections: tab.sections.slice(offset, offset + n), offset })
    offset += n
  }
  if (offset < tab.sections.length) groups.push({ sections: tab.sections.slice(offset), offset })
  return groups
}

/** 그룹(행) 컨테이너 클래스: rowLayout=열 개수 기준 그리드, pairSections=2/3 반응형, 그 외=세로 스택.
 *  items-start 를 주지 않아 그리드 기본값(stretch)대로 같은 행의 카드 높이가 맞춰집니다
 *  — 행 수가 다른 표(요금표 5행 vs 출동비 4행)가 나란히 놓여도 카드 아래가 들쭉날쭉하지 않도록. */
function groupClass(tab: OpsTab, count: number): string {
  if (tab.rowLayout?.length) {
    const cols = count >= 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : count === 2 ? 'sm:grid-cols-2' : ''
    return `grid gap-4 ${cols}`.trim()
  }
  if (tab.pairSections) return 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
  return 'space-y-4'
}

// ── 하위 탭 ──────────────────────────────────────
const operationsTabs = computed(() => getOperationsTabs(lang.value))

/** 마지막으로 연 탭을 기억합니다 (새로고침 후에도 유지). 저장소를 못 쓰면 첫 탭으로 시작. */
const TAB_STORAGE_KEY = 'mobilpress.ops.activeTab'

function initialTabKey(): string {
  const keys = operationsTabs.value.map((tab) => tab.key)
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    if (saved && keys.includes(saved)) return saved
  } catch {
    // 개인정보 보호 모드 등 저장소 접근 불가 — 기본값 사용
  }
  return keys[0] ?? ''
}

const activeKey = ref(initialTabKey())

watch(activeKey, (key) => {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, key)
  } catch {
    // 저장 실패는 무시 — 탭 기억만 못 할 뿐 화면은 정상 동작
  }
})

const tabId = (key: string) => `ops-tab-${key}`
const panelId = (key: string) => `ops-panel-${key}`

/** 탭 라벨 앞의 ①~⑥ 번호는 순서를 뜻하지 않으므로 표시하지 않습니다 (간트 작업 번호와 혼동 방지). */
function tabLabel(label: string): string {
  return label.replace(/^[①-⑳]\s*/, '')
}

/** 탭 키보드 이동 — ←/→(↑/↓) 순환, Home/End 처음·끝. 포커스와 선택을 함께 옮깁니다. */
function onTabKeydown(event: KeyboardEvent, index: number) {
  const tabs = operationsTabs.value
  const last = tabs.length - 1
  let next = -1
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  if (next < 0) return
  event.preventDefault()
  activeKey.value = tabs[next].key
  void nextTick(() => document.getElementById(tabId(tabs[next].key))?.focus())
}

// 섹션 참조 모달 (예: 구매 이력 → 지그 규격)
const openModal = ref<NonNullable<OpsSection['modal']> | null>(null)

// ── 분류(첫 열) 기준 그룹핑 (공구 전체 목록) ──
function groupRows(table: { headers: string[]; rows: string[][] }): { name: string; rows: string[][] }[] {
  const groups: { name: string; rows: string[][] }[] = []
  for (const row of table.rows) {
    const name = row[0]
    const last = groups[groups.length - 1]
    if (last && last.name === name) last.rows.push(row.slice(1))
    else groups.push({ name, rows: [row.slice(1)] })
  }
  return groups
}

/** 분류 그룹 펼침 상태 — 키가 없으면 첫 그룹만 펼침(기본). 모두 펼치기·접기와 직접 토글을 함께 지원. */
const groupOpenState = reactive<Record<string, boolean>>({})

function groupKey(tabKey: string, section: OpsSection, groupName: string): string {
  return `${tabKey}|${section.title}|${groupName}`
}

function isGroupOpen(key: string, index: number): boolean {
  return key in groupOpenState ? groupOpenState[key] : index === 0
}

function onGroupToggle(key: string, event: Event) {
  groupOpenState[key] = (event.target as HTMLDetailsElement).open
}

function setAllGroups(tabKey: string, section: OpsSection, open: boolean) {
  if (!section.table) return
  for (const group of groupRows(section.table)) groupOpenState[groupKey(tabKey, section, group.name)] = open
}

// ── 간트차트 계산 ────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0')

/** 로컬 달력 기준 YYYY-MM-DD (toISOString 은 UTC 로 바뀌어 UTC+7/+9 에서 하루 어긋남) */
function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function toMs(date: string): number {
  return new Date(`${date}T00:00:00`).getTime()
}

/** 날짜가 잘못되었거나 범위가 뒤집혀 있으면 0 — NaN% 로 막대가 깨지지 않게 합니다. */
function pct(gantt: OpsGantt, date: string): number {
  const start = toMs(gantt.rangeStart)
  const span = toMs(gantt.rangeEnd) - start
  const value = ((toMs(date) - start) / span) * 100
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

interface GanttRow {
  label: string
  duration: string
  status: 'done' | 'progress' | 'waiting'
  left: number
  width: number
  labelInside: boolean
  tooltip: string
}

function ganttRows(gantt: OpsGantt): GanttRow[] {
  return gantt.items.map((item) => {
    const left = pct(gantt, item.start)
    const width = Math.max(1.5, pct(gantt, item.end) - left)
    return {
      label: item.label,
      duration: item.duration,
      status: item.status,
      left,
      width,
      labelInside: width >= 22,
      tooltip: `${item.start} ~ ${item.end} · ${item.duration}`,
    }
  })
}

function monthMarks(gantt: OpsGantt): { label: string; left: number }[] {
  const marks: { label: string; left: number }[] = []
  const startMs = toMs(gantt.rangeStart)
  const endMs = toMs(gantt.rangeEnd)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return marks
  const cursor = new Date(startMs)
  cursor.setDate(1)
  while (cursor.getTime() <= endMs) {
    if (cursor.getTime() >= startMs) {
      marks.push({
        label: cursor.toLocaleDateString(lang.value === 'ko' ? 'ko-KR' : 'id-ID', { month: 'short' }),
        left: pct(gantt, toIsoDate(cursor)),
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return marks
}

/** 오늘이 일정 기간 안/밖인지 — 밖이면 '오늘' 선을 그릴 수 없으므로 화면에 이유를 알립니다. */
function isTodayInRange(gantt: OpsGantt): boolean {
  const today = toMs(toIsoDate(new Date()))
  return today >= toMs(gantt.rangeStart) && today <= toMs(gantt.rangeEnd)
}

function todayPct(gantt: OpsGantt): number | null {
  return isTodayInRange(gantt) ? pct(gantt, toIsoDate(new Date())) : null
}

const barClass: Record<GanttRow['status'], string> = {
  done: 'bg-primary text-primary-foreground',
  progress: 'bg-primary-40 border border-primary text-foreground',
  waiting: 'bg-card border border-dashed border-muted-foreground text-muted-foreground',
}

// ── 열 정렬 규칙 (전체 표 공통) ──────────────────
/** 여러 값이 나열되는 긴 텍스트 열(시장 가격 목록·인사이트 등) — 균등폭/줄바꿈금지 대상에서 제외 */
function isLongTextHeader(header: string): boolean {
  return /시장 가격|Harga Pasar|인사이트|Insight|경쟁사|Kompetitor|주요|긴급 조건|Kondisi Urgent/i.test(header)
}

/** 금액 열 → 오른쪽 정렬 + 줄바꿈 금지 (시장 가격 같은 목록형은 제외) */
function isAmountHeader(header: string): boolean {
  if (isLongTextHeader(header)) return false
  return /Rp|금액|예산|실적|Budget|Realisasi|Total|Harga/i.test(header)
}

/** 수량 열 → 오른쪽 정렬 + 줄바꿈 금지 */
function isQtyHeader(header: string): boolean {
  return /^(Qty|수량|Jml|건수)$/i.test(header.trim())
}

/** 날짜 열 → 줄바꿈 금지 */
function isDateHeader(header: string): boolean {
  return /날짜|Tanggal|Tgl|Bulan|일자/i.test(header)
}

/** 업체명이 들어가는 열(고객 회사명·경쟁사 Press 업체) — 조회 전용 계정에는 가려서 표시 */
function isCompanyHeader(header: string): boolean {
  return /회사명|Perusahaan|고객|Customer|경쟁사|Kompetitor/i.test(header)
}

/** 시세·단가처럼 금액이 문장으로 적힌 열 (isAmountHeader 가 긴 텍스트라 제외하는 열) */
function isPriceTextHeader(header: string): boolean {
  return /시장 가격|Harga Pasar/i.test(header)
}

/** 서비스 요금표(pricing)는 회사 표준 단가표라 특정 고객의 거래 금액이 아니므로
 *  조회 전용 계정에도 그대로 보여줍니다. */
function isMaskedTab(tabKey: string): boolean {
  return tabKey !== 'pricing'
}

/** 조회 전용 계정용 셀 값 — 금액·시세 열은 통째로, 회사명 열은 첫 글자만 남겨 가립니다.
 *  가려졌다는 안내는 화면 상단의 조회 전용 배너(mask.notice)가 맡습니다. */
function maskedCell(tabKey: string, headers: string[], index: number, cell: string): string {
  if (!maskSensitive.value || !isMaskedTab(tabKey)) return cell
  const header = headers[index] ?? ''
  if (isAmountHeader(header) || isPriceTextHeader(header)) return cell ? MASKED : cell
  if (isCompanyHeader(header)) return maskedName(cell)
  return cell
}

/** 정렬 규칙: 금액 → 오른쪽 | 그 외(텍스트·수량·비고 등) → 왼쪽 */
function alignClass(headers: string[], index: number): string {
  const header = headers[index] ?? ''
  if (isAmountHeader(header)) return 'text-right'
  return 'text-left'
}

/** 역할 컬럼은 한 줄로 표시 (줄바꿈 금지, 표는 균등폭 해제) */
function isRoleHeader(header: string): boolean {
  return /역할|Peran|Role/i.test(header)
}

/** 셀 텍스트를 줄 단위로 분리 — '|' 는 줄바꿈, 각 줄 안의 괄호 묶음은 내부 줄바꿈 방지. */
function cellLines(text: string): { text: string; nowrap: boolean }[][] {
  return text.split('|').map((seg) => cellParts(seg.trim()))
}

/** 셀 텍스트를 조각으로 분리 — 괄호 묶음 (예: (18:00–06:00))은 내부 줄바꿈을 막습니다. */
function cellParts(text: string): { text: string; nowrap: boolean }[] {
  const parts: { text: string; nowrap: boolean }[] = []
  const re = /\([^)]*\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), nowrap: false })
    parts.push({ text: m[0], nowrap: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), nowrap: false })
  return parts.length ? parts : [{ text, nowrap: false }]
}

function cellClass(headers: string[], cellIndex: number): string[] {
  const header = headers[cellIndex] ?? ''
  const classes = [alignClass(headers, cellIndex)]
  if (isAmountHeader(header) || isQtyHeader(header) || isDateHeader(header)) {
    classes.push('whitespace-nowrap', 'tabular-nums')
  }
  if (isRoleHeader(header)) classes.push('whitespace-nowrap')
  return classes
}

/** 모든 열을 균등 폭으로 배분 (셀 간격 동일 유지).
 *  단, 역할 컬럼이 있으면 내용 길이대로 배분 (한 줄 유지가 우선). */
function eqWidthEnabled(headers: string[]): boolean {
  // 역할/긴 텍스트 열이 있으면 내용 길이대로 배분 (균등폭 강제 시 좁아져 글자가 겹침)
  return headers.length >= 2 && !headers.some(isRoleHeader) && !headers.some(isLongTextHeader)
}
function eqWidthStyle(headers: string[]): Record<string, string> {
  return eqWidthEnabled(headers) ? { width: `${100 / headers.length}%` } : {}
}
</script>

<template>
  <div>
    <!-- 하위 탭 (탭 의미 구조 + 방향키 이동) -->
    <div role="tablist" :aria-label="t('tab.operations')" class="mb-4 flex flex-wrap gap-2">
      <button
        v-for="(tab, tabIndex) in operationsTabs"
        :id="tabId(tab.key)"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="activeKey === tab.key"
        :aria-controls="activeKey === tab.key ? panelId(tab.key) : undefined"
        :tabindex="activeKey === tab.key ? 0 : -1"
        class="inline-flex h-11 items-center whitespace-nowrap rounded-md border px-4 text-sm transition-colors sm:h-8"
        :class="
          activeKey === tab.key
            ? 'border-primary-40 bg-primary-soft font-bold text-primary'
            : 'border-border bg-card font-medium text-muted-foreground hover:bg-secondary hover:text-foreground'
        "
        @click="activeKey = tab.key"
        @keydown="onTabKeydown($event, tabIndex)"
      >
        {{ tabLabel(tab.label) }}
      </button>
    </div>

    <template v-for="tab in operationsTabs" :key="tab.key">
      <div
        v-if="activeKey === tab.key"
        :id="panelId(tab.key)"
        role="tabpanel"
        :aria-labelledby="tabId(tab.key)"
        class="space-y-4"
      >
        <p v-if="!tab.sections.length" class="rounded-lg border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          {{ t('ops.empty') }}
        </p>

        <div v-for="(sectionRow, rowIdx) in sectionGroups(tab)" :key="rowIdx" :class="groupClass(tab, sectionRow.sections.length)">
          <section
            v-for="(section, localIndex) in sectionRow.sections"
            :key="`${rowIdx}-${localIndex}`"
            class="flex h-full min-w-0 flex-col rounded-lg border border-border bg-card"
          >
            <!-- 섹션 헤더: 카드 제목(.asm-title = 3px 블루 세로선) + 참조 모달·전체 펼치기 -->
            <div class="flex w-full flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
              <h3 class="asm-title text-balance text-foreground">{{ section.title }}</h3>
              <span class="flex flex-wrap items-center gap-2">
                <template v-if="section.table && section.groupByFirstColumn">
                  <button
                    type="button"
                    class="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    @click="setAllGroups(tab.key, section, true)"
                  >
                    {{ t('ops.expandAll') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    @click="setAllGroups(tab.key, section, false)"
                  >
                    {{ t('ops.collapseAll') }}
                  </button>
                </template>
                <button
                  v-if="section.modal"
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  @click="openModal = section.modal"
                >
                  <BookOpen class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ section.modal.buttonLabel }}
                </button>
              </span>
            </div>

            <!-- 분류(첫 열) 기준 아코디언 표 -->
            <div v-if="section.table && section.groupByFirstColumn" class="divide-y divide-border">
              <details
                v-for="(group, groupIndex) in groupRows(section.table)"
                :key="group.name"
                :open="isGroupOpen(groupKey(tab.key, section, group.name), groupIndex)"
                class="group"
                @toggle="onGroupToggle(groupKey(tab.key, section, group.name), $event)"
              >
                <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-3 transition-colors hover:bg-secondary">
                  <span class="text-sm font-bold text-foreground">
                    {{ group.name }}
                    <span class="ml-1.5 text-xs font-normal text-muted-foreground">({{ group.rows.length }})</span>
                  </span>
                  <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div class="relative overflow-x-auto">
                  <table
                    class="asm-table w-full min-w-140 text-left text-sm"
                    :class="{ 'table-fixed': eqWidthEnabled(section.table.headers.slice(1)) }"
                  >
                    <thead>
                      <tr>
                        <th
                          v-for="(header, headerIndex) in section.table.headers.slice(1)"
                          :key="`${headerIndex}-${header}`"
                          scope="col"
                          class="whitespace-nowrap font-medium"
                          :class="alignClass(section.table.headers.slice(1), headerIndex)"
                          :style="eqWidthStyle(section.table.headers.slice(1))"
                        >
                          {{ header }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in group.rows" :key="rowIndex" class="align-top">
                        <td
                          v-for="(cell, cellIndex) in row"
                          :key="cellIndex"
                          class="text-foreground"
                          :class="[{ 'font-bold': cellIndex === 0 }, cellClass(section.table.headers.slice(1), cellIndex)]"
                        >
                          <span v-for="(line, li) in cellLines(maskedCell(tab.key, section.table.headers.slice(1), cellIndex, cell))" :key="li" class="block">
                            <span v-for="(part, i) in line" :key="i" :class="{ 'whitespace-nowrap': part.nowrap }">{{ part.text }}</span>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>

            <!-- 일반 표 (3열 표는 각 1/3 균등 배분) -->
            <div v-else-if="section.table" class="relative w-full max-w-full overflow-x-auto">
              <table
                class="asm-table w-full text-left text-sm"
                :class="[
                  { 'table-fixed': eqWidthEnabled(section.table.headers) },
                  section.table.headers.length > 3 ? 'min-w-140' : 'min-w-0',
                ]"
              >
                <thead>
                  <tr>
                    <th
                      v-for="(header, headerIndex) in section.table.headers"
                      :key="`${headerIndex}-${header}`"
                      scope="col"
                      class="whitespace-nowrap font-medium"
                      :class="alignClass(section.table.headers, headerIndex)"
                      :style="eqWidthStyle(section.table.headers)"
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!section.table.rows.length">
                    <td :colspan="section.table.headers.length" class="px-5 py-4 text-muted-foreground">{{ t('ops.empty') }}</td>
                  </tr>
                  <tr v-for="(row, rowIndex) in section.table.rows" :key="rowIndex" class="align-top">
                    <td
                      v-for="(cell, cellIndex) in row"
                      :key="cellIndex"
                      class="text-foreground"
                      :class="[
                        { 'font-bold': cellIndex === 0 || row[0] === '' },
                        cellClass(section.table.headers, cellIndex),
                      ]"
                    >
                      <span v-for="(line, li) in cellLines(maskedCell(tab.key, section.table.headers, cellIndex, cell))" :key="li" class="block">
                        <span v-for="(part, i) in line" :key="i" :class="{ 'whitespace-nowrap': part.nowrap }">{{ part.text }}</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 단계(SOP) 형태 섹션 — 2열 -->
            <div v-if="section.steps" class="grid gap-3 px-5 py-4 sm:grid-cols-2">
              <div v-for="step in section.steps" :key="step.title" class="rounded-md border border-primary-40 bg-primary-6 px-4 py-3">
                <p class="text-sm font-bold text-foreground">{{ step.title }}</p>
                <ul class="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                  <li v-for="item in step.items" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>

            <!-- 간트차트 섹션 (소요 시간 강조) -->
            <div v-if="section.gantt" class="px-5 py-5">
              <!-- 기준일·범위 안내: 참고용 일정임을 밝히고, 오늘 선이 없는 이유를 알립니다 -->
              <p
                v-if="section.gantt.asOf || !isTodayInRange(section.gantt)"
                class="mb-3 text-xs leading-relaxed text-muted-foreground"
              >
                <span v-if="section.gantt.asOf" class="block">{{ t('gantt.asOf', { date: section.gantt.asOf }) }}</span>
                <span v-if="!isTodayInRange(section.gantt)" class="block">{{ t('gantt.outOfRange') }}</span>
              </p>

              <!-- 범례 -->
              <div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-5 rounded-sm bg-primary" /> {{ t('gantt.done') }}</span>
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-5 rounded-sm border border-primary bg-primary-40" /> {{ t('gantt.progress') }}</span>
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-5 rounded-sm border border-dashed border-muted-foreground bg-card" /> {{ t('gantt.waiting') }}</span>
                <span v-if="isTodayInRange(section.gantt)" class="flex items-center gap-1.5">
                  <span class="h-3 w-0.5 bg-destructive" /> {{ t('gantt.today') }}
                </span>
              </div>

              <div class="relative overflow-x-auto">
                <div class="min-w-190">
                  <!-- 월 축 -->
                  <div class="relative mb-1.5 ml-56 h-4 text-xs font-medium text-muted-foreground" aria-hidden="true">
                    <span
                      v-for="mark in monthMarks(section.gantt)"
                      :key="mark.left"
                      class="absolute"
                      :style="{ left: `${mark.left}%` }"
                    >
                      {{ mark.label }}
                    </span>
                  </div>

                  <div class="relative">
                    <!-- 월 그리드 + 오늘 라인 -->
                    <div class="pointer-events-none absolute inset-y-0 left-56 right-0" aria-hidden="true">
                      <span
                        v-for="mark in monthMarks(section.gantt)"
                        :key="'grid' + mark.left"
                        class="absolute inset-y-0 w-px bg-border/70"
                        :style="{ left: `${mark.left}%` }"
                      />
                      <span
                        v-if="todayPct(section.gantt) !== null"
                        class="absolute inset-y-0 w-0.5 bg-destructive/70"
                        :style="{ left: `${todayPct(section.gantt)}%` }"
                      />
                    </div>

                    <!-- 작업 행: 화면에는 막대, 스크린리더에는 '작업: 상태, 기간 · 소요' 문장 -->
                    <div role="list">
                      <div
                        v-for="(row, rowIndexG) in ganttRows(section.gantt)"
                        :key="`${rowIndexG}-${row.label}`"
                        role="listitem"
                        class="flex items-center py-1"
                      >
                        <span class="sr-only">{{ row.label }}: {{ t(`gantt.${row.status}`) }}, {{ row.tooltip }}</span>
                        <div
                          class="w-56 shrink-0 pr-3 text-[13px] font-medium leading-snug text-foreground"
                          :title="row.label"
                          aria-hidden="true"
                        >
                          {{ row.label }}
                        </div>
                        <div class="relative h-7 flex-1" aria-hidden="true">
                          <div
                            class="absolute top-1/2 flex h-5 -translate-y-1/2 items-center rounded-sm px-2"
                            :class="barClass[row.status]"
                            :style="{ left: `${row.left}%`, width: `${row.width}%` }"
                            :title="row.tooltip"
                          >
                            <span v-if="row.labelInside" class="truncate text-xs font-bold">{{ row.duration }}</span>
                          </div>
                          <span
                            v-if="!row.labelInside"
                            class="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-bold text-muted-foreground"
                            :style="{ left: `calc(${Math.min(row.left + row.width, 78)}% + 8px)` }"
                          >
                            {{ row.duration }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p
              v-if="section.note"
              class="mt-auto border-t border-border bg-accent/40 px-5 py-3 text-xs leading-relaxed text-pretty text-accent-foreground"
            >
              {{ section.note }}
            </p>
          </section>
        </div>
      </div>
    </template>

    <!-- 섹션 참조 모달 (지그 규격 등) -->
    <BaseModal v-if="openModal" :title="openModal.title" @close="openModal = null">
      <div class="relative overflow-x-auto">
        <table class="asm-table w-full min-w-140 text-left text-sm">
          <thead>
            <tr>
              <th
                v-for="(header, headerIndex) in openModal.table.headers"
                :key="`${headerIndex}-${header}`"
                scope="col"
                class="whitespace-nowrap font-medium"
                :class="alignClass(openModal.table.headers, headerIndex)"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!openModal.table.rows.length">
              <td :colspan="openModal.table.headers.length" class="px-5 py-4 text-muted-foreground">{{ t('ops.empty') }}</td>
            </tr>
            <tr v-for="(row, rowIndex) in openModal.table.rows" :key="rowIndex" class="last:border-0">
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                class="text-foreground"
                :class="[{ 'font-bold': cellIndex === 0 }, cellClass(openModal.table.headers, cellIndex)]"
              >
                {{ maskedCell(activeKey, openModal.table.headers, cellIndex, cell) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="openModal.note" class="mt-4 rounded-md bg-accent/40 px-4 py-3 text-xs leading-relaxed text-pretty text-accent-foreground">
        {{ openModal.note }}
      </p>
    </BaseModal>
  </div>
</template>
