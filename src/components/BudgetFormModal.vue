<script setup lang="ts">
import { computed, reactive } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { emptyBudgetEntry } from '@/data/seed'
import { t } from '@/lib/i18n'
import { BUDGET_CATEGORIES } from '@/lib/types'
import type { BudgetEntry, BudgetEntryForm } from '@/lib/types'

const props = defineProps<{
  editing: BudgetEntry | null
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [form: BudgetEntryForm]
}>()

const form = reactive<BudgetEntryForm>(
  props.editing
    ? {
        category: props.editing.category,
        entryDate: props.editing.entryDate,
        item: props.editing.item,
        amount: props.editing.amount,
        note: props.editing.note,
        enteredBy: props.editing.enteredBy,
      }
    : { ...emptyBudgetEntry },
)

// 금액 입력: 천단위 콤마 표시용 텍스트 모델 (저장은 숫자)
const amountText = computed({
  get: () => (form.amount ? Number(form.amount).toLocaleString('en-US') : ''),
  set: (value: string) => {
    form.amount = Number(value.replace(/[^\d]/g, '')) || 0
  },
})

function onSubmit() {
  if (!form.item.trim()) return
  emit('submit', { ...form, amount: Number(form.amount) || 0 })
}

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground'
</script>

<template>
  <BaseModal :title="editing ? t('form.budget.edit') : t('form.budget.add')" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label :class="labelClass" for="budgetCategory">{{ t('form.category') }}</label>
          <select id="budgetCategory" v-model="form.category" :class="inputClass">
            <option v-for="cat in BUDGET_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div>
          <label :class="labelClass" for="budgetDate">{{ t('form.entryDate') }}</label>
          <input id="budgetDate" v-model="form.entryDate" type="date" :class="inputClass" />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="budgetItem">{{ t('form.item') }}</label>
          <input id="budgetItem" v-model="form.item" :class="inputClass" required />
        </div>
        <div>
          <label :class="labelClass" for="budgetAmount">{{ t('form.amount') }}</label>
          <input id="budgetAmount" v-model="amountText" type="text" inputmode="numeric" :class="inputClass" />
        </div>
        <div v-if="editing && form.enteredBy">
          <span :class="labelClass">{{ t('form.enteredBy') }}</span>
          <p class="px-1 py-2 text-sm text-muted-foreground">{{ form.enteredBy }}</p>
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="budgetNote">{{ t('form.note') }}</label>
          <textarea id="budgetNote" v-model="form.note" rows="2" :class="inputClass" />
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          class="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          @click="emit('close')"
        >
          {{ t('btn.cancel') }}
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {{ saving ? t('btn.saving') : editing ? t('btn.update') : t('btn.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
