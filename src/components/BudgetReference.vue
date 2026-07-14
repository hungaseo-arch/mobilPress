<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, Loader2, Pencil, Plus, Trash2, Wallet } from 'lucide-vue-next'
import { useMobilPressStore } from '@/stores/mobilPress'
import { canDelete, canEdit } from '@/lib/auth-state'
import { formatDate, formatIDR } from '@/lib/format'
import { lang, t } from '@/lib/i18n'
import BudgetFormModal from '@/components/BudgetFormModal.vue'
import { BUDGET_CATEGORIES } from '@/lib/types'
import type { BudgetEntry, BudgetEntryForm } from '@/lib/types'

const store = useMobilPressStore()

// 구분(카테고리) 라벨 현지화 — 저장값은 인도네시아어 정본, 표시는 언어별.
const categoryLabels: Record<string, { id: string; ko: string }> = {
  'Kendaraan & Mesin': { id: 'Kendaraan & Mesin', ko: '차량·설비' },
  'Tools & Perlengkapan': { id: 'Tools & Perlengkapan', ko: '공구·장비' },
  'Anggaran Operasional': { id: 'Anggaran Operasional', ko: '운영 예산' },
}
function catLabel(cat: string): string {
  const label = categoryLabels[cat]
  return label ? label[lang.value] : cat
}

// 정의된 구분 순서 우선, 그 외 신규 구분은 뒤에 이어붙임.
const groups = computed(() => {
  const map = new Map<string, BudgetEntry[]>()
  for (const cat of BUDGET_CATEGORIES) map.set(cat, [])
  for (const entry of store.budgetEntries) {
    if (!map.has(entry.category)) map.set(entry.category, [])
    map.get(entry.category)!.push(entry)
  }
  return Array.from(map.entries())
    .map(([category, entries]) => ({ category, entries }))
    .filter((group) => group.entries.length)
})

function subtotal(entries: BudgetEntry[]): number {
  return entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
}
// Grand Total = 투자성 예산(차량·설비 + 공구·장비)만 합산.
// 운영 예산(Anggaran Operasional)은 공구 예산과 항목이 중복되는 실집행 로그라 총액에서 제외하고 별도 표시.
const GRAND_TOTAL_CATEGORIES = ['Kendaraan & Mesin', 'Tools & Perlengkapan']
const grandTotal = computed(() =>
  subtotal(store.budgetEntries.filter((entry) => GRAND_TOTAL_CATEGORIES.includes(entry.category))),
)
const opsRealisasi = computed(() =>
  subtotal(store.budgetEntries.filter((entry) => entry.category === 'Anggaran Operasional')),
)
const hasOps = computed(() => store.budgetEntries.some((entry) => entry.category === 'Anggaran Operasional'))

// ── CRUD 모달 ──
const modalOpen = ref(false)
const editing = ref<BudgetEntry | null>(null)

function openModal(entry: BudgetEntry | null = null) {
  editing.value = entry
  modalOpen.value = true
}

async function submit(form: BudgetEntryForm) {
  const ok = await store.saveBudgetEntry(form, editing.value?.id ?? null)
  if (ok) modalOpen.value = false
}

async function confirmDelete(entry: BudgetEntry) {
  if (window.confirm(t('confirm.delete', { name: entry.item }))) {
    await store.deleteRecord('budget_entries', entry.id)
  }
}
</script>

<template>
  <div>
    <!-- 등록 버튼 -->
    <div v-if="canEdit" class="mb-4 flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        @click="openModal()"
      >
        <Plus class="h-4 w-4" /> {{ t('budget.addEntry') }}
      </button>
    </div>

    <!-- 로딩 -->
    <div v-if="store.loading" class="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-20 text-muted-foreground">
      <Loader2 class="h-5 w-5 animate-spin" />
      {{ t('loading') }}
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="!store.budgetEntries.length" class="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
      <Wallet class="mx-auto mb-2 h-8 w-8 opacity-40" />
      {{ t('budget.empty') }}
    </div>

    <template v-else>
      <!-- 구분별 접이식 그룹 -->
      <div class="space-y-4">
        <section
          v-for="(group, groupIndex) in groups"
          :key="group.category"
          class="rounded-xl border border-border bg-card"
        >
          <details :open="groupIndex === 0" class="group">
            <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 transition hover:bg-secondary/40">
              <span class="text-sm font-bold text-foreground">
                {{ catLabel(group.category) }}
                <span class="ml-1.5 text-xs font-normal text-muted-foreground">({{ group.entries.length }})</span>
              </span>
              <span class="flex items-center gap-3">
                <span class="text-sm font-semibold tabular-nums text-primary">{{ formatIDR(subtotal(group.entries)) }}</span>
                <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div class="overflow-x-auto border-t border-border">
              <table class="w-full min-w-160 text-left text-sm">
                <thead>
                  <tr class="border-b border-border/60 text-xs text-muted-foreground">
                    <th class="w-28 whitespace-nowrap px-4 py-2 font-medium">{{ t('form.entryDate') }}</th>
                    <th class="px-4 py-2 font-medium">{{ t('form.item') }}</th>
                    <th class="w-36 whitespace-nowrap px-4 py-2 text-right font-medium">{{ t('form.amount') }}</th>
                    <th class="px-4 py-2 font-medium">{{ t('form.note') }}</th>
                    <th v-if="canEdit" class="w-20 px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="entry in group.entries"
                    :key="entry.id"
                    class="border-b border-border/60 align-top last:border-0 hover:bg-secondary/40"
                  >
                    <td class="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">{{ entry.entryDate ? formatDate(entry.entryDate) : '-' }}</td>
                    <td class="px-4 py-2.5 font-medium text-foreground">{{ entry.item }}</td>
                    <td class="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-foreground">{{ formatIDR(entry.amount) }}</td>
                    <td class="px-4 py-2.5 text-muted-foreground">{{ entry.note || '-' }}</td>
                    <td v-if="canEdit" class="px-4 py-2.5">
                      <div class="flex justify-end gap-1">
                        <button
                          type="button"
                          class="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                          :aria-label="t('btn.edit')"
                          @click="openModal(entry)"
                        >
                          <Pencil class="h-4 w-4" />
                        </button>
                        <button
                          v-if="canDelete"
                          type="button"
                          class="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                          :aria-label="t('btn.delete')"
                          @click="confirmDelete(entry)"
                        >
                          <Trash2 class="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t border-border bg-secondary/40 text-sm font-semibold">
                    <td class="px-4 py-2.5 text-foreground" :colspan="2">{{ t('budget.subtotal') }}</td>
                    <td class="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-foreground">{{ formatIDR(subtotal(group.entries)) }}</td>
                    <td :colspan="canEdit ? 2 : 1" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        </section>
      </div>

      <!-- 총 집행액 (차량·설비 + 공구·장비) -->
      <div class="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-foreground">
            {{ t('budget.grandTotal') }}
            <span class="ml-1 text-xs font-normal text-muted-foreground">({{ t('budget.grandTotalScope') }})</span>
          </span>
          <span class="text-base font-bold tabular-nums text-primary">{{ formatIDR(grandTotal) }}</span>
        </div>
        <div v-if="hasOps" class="mt-2 flex items-center justify-between border-t border-primary/20 pt-2">
          <span class="text-xs font-medium text-muted-foreground">{{ t('budget.opsRealisasi') }}</span>
          <span class="text-sm font-semibold tabular-nums text-foreground">{{ formatIDR(opsRealisasi) }}</span>
        </div>
      </div>
    </template>

    <BudgetFormModal
      v-if="modalOpen"
      :editing="editing"
      :saving="store.saving"
      @close="modalOpen = false"
      @submit="submit"
    />
  </div>
</template>
