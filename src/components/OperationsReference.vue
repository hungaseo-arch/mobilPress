<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpen, ChevronDown } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import { getOperationsTabs } from '@/data/operations'
import type { OpsGantt, OpsSection, OpsTab } from '@/data/operations'
import { lang, t } from '@/lib/i18n'

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

/** 그룹(행) 컨테이너 클래스: rowLayout=열 개수 기준 그리드, pairSections=2/3 반응형, 그 외=세로 스택. */
function groupClass(tab: OpsTab, count: number): string {
  if (tab.rowLayout?.length) {
    const cols = count >= 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : count === 2 ? 'sm:grid-cols-2' : ''
    return `grid gap-4 lg:items-start ${cols}`.trim()
  }
  if (tab.pairSections) return 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:items-start'
  return 'space-y-4'
}

const operationsTabs = computed(() => getOperationsTabs(lang.value))
const activeKey = ref(operationsTabs.value[0].key)

// 섹션 참조 모달 (예: 구매 이력 → 지그 규격)
const openModal = ref<NonNullable<OpsSection['modal']> | null>(null)

// ── 예산 집행 탭: 섹션 아코디언 (한 번에 하나만 펼침) ──
const openBudgetIndex = ref(0)

function isAccordionTab(tabKey: string): boolean {
  return tabKey === 'budget'
}

function toggleBudget(index: number) {
  openBudgetIndex.value = openBudgetIndex.value === index ? -1 : index
}

function isSectionOpen(tabKey: string, index: number): boolean {
  return !isAccordionTab(tabKey) || openBudgetIndex.value === index
}

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

// ── 간트차트 계산 ────────────────────────────────
function toMs(date: string): number {
  return new Date(`${date}T00:00:00`).getTime()
}

function pct(gantt: OpsGantt, date: string): number {
  const start = toMs(gantt.rangeStart)
  const end = toMs(gantt.rangeEnd)
  return Math.min(100, Math.max(0, ((toMs(date) - start) / (end - start)) * 100))
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
  const cursor = new Date(`${gantt.rangeStart}T00:00:00`)
  cursor.setDate(1)
  const end = toMs(gantt.rangeEnd)
  while (cursor.getTime() <= end) {
    if (cursor.getTime() >= toMs(gantt.rangeStart)) {
      marks.push({
        label: cursor.toLocaleDateString(lang.value === 'ko' ? 'ko-KR' : 'id-ID', { month: 'short' }),
        left: pct(gantt, cursor.toISOString().slice(0, 10)),
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return marks
}

function todayPct(gantt: OpsGantt): number | null {
  const today = new Date().toISOString().slice(0, 10)
  if (toMs(today) < toMs(gantt.rangeStart) || toMs(today) > toMs(gantt.rangeEnd)) return null
  return pct(gantt, today)
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

const barClass: Record<GanttRow['status'], string> = {
  done: 'bg-primary text-primary-foreground',
  progress: 'bg-primary/35 border border-primary/70 text-foreground',
  waiting: 'bg-card border border-dashed border-border text-muted-foreground',
}
</script>

<template>
  <div>
    <!-- 하위 탭 (실적 분석 서브탭·검색행과 동일 크기) -->
    <nav class="mb-4 flex flex-wrap gap-2">
      <button
        v-for="tab in operationsTabs"
        :key="tab.key"
        type="button"
        class="rounded-full border px-4 py-2 text-sm font-semibold transition"
        :class="
          activeKey === tab.key
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-muted-foreground hover:text-foreground'
        "
        @click="activeKey = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <template v-for="tab in operationsTabs" :key="tab.key">
      <div v-if="activeKey === tab.key" class="space-y-4">
        <div v-for="(row, rowIdx) in sectionGroups(tab)" :key="rowIdx" :class="groupClass(tab, row.sections.length)">
        <section
          v-for="(section, localIndex) in row.sections"
          :key="section.title"
          class="rounded-xl border border-border bg-card"
        >
          <!-- 섹션 헤더 (예산 집행 탭은 아코디언 토글) -->
          <component
            :is="isAccordionTab(tab.key) ? 'button' : 'div'"
            :type="isAccordionTab(tab.key) ? 'button' : undefined"
            class="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-left"
            :class="isSectionOpen(tab.key, row.offset + localIndex) ? 'border-b border-border' : ''"
            @click="isAccordionTab(tab.key) && toggleBudget(row.offset + localIndex)"
          >
            <h3 class="text-sm font-bold text-foreground">{{ section.title }}</h3>
            <span class="flex items-center gap-2">
              <button
                v-if="section.modal"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                @click.stop="openModal = section.modal"
              >
                <BookOpen class="h-3.5 w-3.5" />
                {{ section.modal.buttonLabel }}
              </button>
              <ChevronDown
                v-if="isAccordionTab(tab.key)"
                class="h-4 w-4 text-muted-foreground transition-transform"
                :class="{ 'rotate-180': isSectionOpen(tab.key, row.offset + localIndex) }"
              />
            </span>
          </component>

          <template v-if="isSectionOpen(tab.key, row.offset + localIndex)">
            <!-- 분류(첫 열) 기준 아코디언 표 -->
            <div v-if="section.table && section.groupByFirstColumn" class="divide-y divide-border">
              <details
                v-for="(group, groupIndex) in groupRows(section.table)"
                :key="group.name"
                :open="groupIndex === 0"
                class="group"
              >
                <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-3 transition hover:bg-secondary/40">
                  <span class="text-sm font-semibold text-foreground">
                    {{ group.name }}
                    <span class="ml-1.5 text-xs font-normal text-muted-foreground">({{ group.rows.length }})</span>
                  </span>
                  <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div class="overflow-x-auto">
                  <table
                    class="w-full min-w-140 text-left text-sm"
                    :class="{ 'table-fixed': eqWidthEnabled(section.table.headers.slice(1)) }"
                  >
                    <thead>
                      <tr class="border-t border-border/60 text-xs text-muted-foreground">
                        <th
                          v-for="(header, headerIndex) in section.table.headers.slice(1)"
                          :key="header"
                          class="whitespace-nowrap px-5 py-2 font-medium"
                          :class="alignClass(section.table.headers.slice(1), headerIndex)"
                          :style="eqWidthStyle(section.table.headers.slice(1))"
                        >
                          {{ header }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, rowIndex) in group.rows"
                        :key="rowIndex"
                        class="border-t border-border/60 align-top hover:bg-secondary/40"
                      >
                        <td
                          v-for="(cell, cellIndex) in row"
                          :key="cellIndex"
                          class="px-5 py-2.5 text-foreground"
                          :class="[{ 'font-semibold': cellIndex === 0 }, cellClass(section.table.headers.slice(1), cellIndex)]"
                        >
                          <span v-for="(line, li) in cellLines(cell)" :key="li" class="block">
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
            <div v-else-if="section.table" class="overflow-x-auto">
              <table
                class="w-full text-left text-sm"
                :class="[
                  { 'table-fixed': eqWidthEnabled(section.table.headers) },
                  section.table.headers.length > 3 ? 'min-w-140' : 'min-w-0',
                ]"
              >
                <thead>
                  <tr class="border-b border-border text-xs text-muted-foreground">
                    <th
                      v-for="(header, headerIndex) in section.table.headers"
                      :key="header"
                      class="whitespace-nowrap px-4 py-2.5 font-medium"
                      :class="alignClass(section.table.headers, headerIndex)"
                      :style="eqWidthStyle(section.table.headers)"
                    >
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, rowIndex) in section.table.rows"
                    :key="rowIndex"
                    class="border-b border-border/60 align-top last:border-0 hover:bg-secondary/40"
                  >
                    <td
                      v-for="(cell, cellIndex) in row"
                      :key="cellIndex"
                      class="px-4 py-2.5 text-foreground"
                      :class="[
                        { 'font-semibold': cellIndex === 0 || row[0] === '' },
                        cellClass(section.table.headers, cellIndex),
                      ]"
                    >
                      <span v-for="(line, li) in cellLines(cell)" :key="li" class="block">
                        <span v-for="(part, i) in line" :key="i" :class="{ 'whitespace-nowrap': part.nowrap }">{{ part.text }}</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 단계(SOP) 형태 섹션 — 2열 -->
            <div v-if="section.steps" class="grid gap-3 px-5 py-4 sm:grid-cols-2">
              <div
                v-for="step in section.steps"
                :key="step.title"
                class="rounded-lg border-l-4 border-primary bg-secondary/40 px-4 py-3"
              >
                <p class="text-sm font-bold text-foreground">{{ step.title }}</p>
                <ul class="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                  <li v-for="item in step.items" :key="item">{{ item }}</li>
                </ul>
              </div>
            </div>

            <!-- 간트차트 섹션 (소요 시간 강조) -->
            <div v-if="section.gantt" class="px-5 py-5">
              <!-- 범례 -->
              <div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-5 rounded-sm bg-primary" /> {{ t('gantt.done') }}</span>
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-5 rounded-sm border border-primary/70 bg-primary/35" /> {{ t('gantt.progress') }}</span>
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-5 rounded-sm border border-dashed border-border bg-card" /> {{ t('gantt.waiting') }}</span>
                <span v-if="todayPct(section.gantt) !== null" class="flex items-center gap-1.5">
                  <span class="h-3 w-0.5 bg-destructive" /> {{ t('gantt.today') }}
                </span>
              </div>

              <div class="overflow-x-auto">
                <div class="min-w-190">
                  <!-- 월 축 -->
                  <div class="relative mb-1.5 ml-56 h-4 text-[10px] font-medium text-muted-foreground">
                    <span
                      v-for="mark in monthMarks(section.gantt)"
                      :key="mark.label + mark.left"
                      class="absolute"
                      :style="{ left: `${mark.left}%` }"
                    >
                      {{ mark.label }}
                    </span>
                  </div>

                  <div class="relative">
                    <!-- 월 그리드 + 오늘 라인 -->
                    <div class="pointer-events-none absolute inset-y-0 left-56 right-0">
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

                    <!-- 작업 행 -->
                    <div
                      v-for="row in ganttRows(section.gantt)"
                      :key="row.label"
                      class="flex items-center py-1"
                    >
                      <div class="w-56 shrink-0 truncate pr-3 text-xs font-medium text-foreground" :title="row.label">
                        {{ row.label }}
                      </div>
                      <div class="relative h-7 flex-1">
                        <div
                          class="absolute top-1/2 flex h-5 -translate-y-1/2 items-center rounded-full px-2"
                          :class="barClass[row.status]"
                          :style="{ left: `${row.left}%`, width: `${row.width}%` }"
                          :title="row.tooltip"
                        >
                          <span v-if="row.labelInside" class="truncate text-[11px] font-semibold">{{ row.duration }}</span>
                        </div>
                        <span
                          v-if="!row.labelInside"
                          class="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold text-muted-foreground"
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

            <p v-if="section.note" class="border-t border-border bg-accent/40 px-5 py-3 text-xs leading-relaxed text-accent-foreground">
              {{ section.note }}
            </p>
          </template>
        </section>
        </div>
      </div>
    </template>

    <!-- 섹션 참조 모달 (지그 규격 등) -->
    <BaseModal v-if="openModal" :title="openModal.title" @close="openModal = null">
      <div class="overflow-x-auto">
        <table class="w-full min-w-140 text-left text-sm">
          <thead>
            <tr class="border-b border-border text-xs text-muted-foreground">
              <th
                v-for="header in openModal.table.headers"
                :key="header"
                class="whitespace-nowrap px-3 py-2.5 font-medium"
                :class="alignClass(openModal.table.headers, openModal.table.headers.indexOf(header))"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in openModal.table.rows"
              :key="rowIndex"
              class="border-b border-border/60 last:border-0"
            >
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                class="px-3 py-2.5 text-foreground"
                :class="[{ 'font-semibold': cellIndex === 0 }, cellClass(openModal.table.headers, cellIndex)]"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="openModal.note" class="mt-4 rounded-md bg-accent/40 px-4 py-3 text-xs leading-relaxed text-accent-foreground">
        {{ openModal.note }}
      </p>
    </BaseModal>
  </div>
</template>
