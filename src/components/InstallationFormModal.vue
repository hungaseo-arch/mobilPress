<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { emptyInstallation } from '@/data/seed'
import { t } from '@/lib/i18n'
import type { Installation, InstallationForm } from '@/lib/types'

const props = defineProps<{
  editing: Installation | null
  saving: boolean
  customerNames: string[]
}>()

const emit = defineEmits<{
  close: []
  submit: [form: InstallationForm]
}>()

const form = reactive<InstallationForm>(
  props.editing
    ? {
        workDate: props.editing.workDate,
        distributor: props.editing.distributor,
        customerName: props.editing.customerName,
        product: props.editing.product,
        rimSize: props.editing.rimSize,
        qty: props.editing.qty,
        serialNumbers: props.editing.serialNumbers,
        workTime: props.editing.workTime,
        status: props.editing.status,
        note: props.editing.note,
        serviceFee: props.editing.serviceFee,
        mobilizationFee: props.editing.mobilizationFee,
        discountRate: props.editing.discountRate,
        receivedAmount: props.editing.receivedAmount,
      }
    : { ...emptyInstallation },
)

// 금액 입력: 천단위 콤마 표시용 텍스트 모델 (저장은 숫자)
function moneyModel(key: 'serviceFee' | 'mobilizationFee' | 'receivedAmount') {
  return computed({
    get: () => (form[key] ? Number(form[key]).toLocaleString('en-US') : ''),
    set: (value: string) => {
      form[key] = Number(value.replace(/[^\d]/g, '')) || 0
    },
  })
}

const serviceFeeText = moneyModel('serviceFee')
const mobilizationFeeText = moneyModel('mobilizationFee')
const receivedAmountText = moneyModel('receivedAmount')

// 시리얼 번호: 수량(qty)과 동일한 개수의 개별 입력란으로 관리.
// 저장 시에는 기존과 같은 쉼표 연결 문자열로 합칩니다.
const serials = ref<string[]>(
  form.serialNumbers
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v && v !== '-'),
)

function syncSerialCount(count: number) {
  const size = Math.max(0, Math.min(100, Number(count) || 0))
  while (serials.value.length < size) serials.value.push('')
  serials.value.length = size
}

syncSerialCount(form.qty)
watch(
  () => form.qty,
  (qty) => syncSerialCount(qty),
)

function onSubmit() {
  if (!form.customerName.trim()) return
  emit('submit', {
    ...form,
    serialNumbers: serials.value.map((v) => v.trim()).filter(Boolean).join(', '),
    qty: Number(form.qty) || 0,
    serviceFee: Number(form.serviceFee) || 0,
    mobilizationFee: Number(form.mobilizationFee) || 0,
    discountRate: Number(form.discountRate) || 0,
    receivedAmount: Number(form.receivedAmount) || 0,
  })
}

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground'
</script>

<template>
  <BaseModal :title="editing ? t('form.installation.edit') : t('form.installation.add')" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label :class="labelClass" for="workDate">{{ t('form.workDate') }}</label>
          <input id="workDate" v-model="form.workDate" type="date" :class="inputClass" required />
        </div>
        <div>
          <label :class="labelClass" for="distributor">{{ t('form.distributor') }}</label>
          <input id="distributor" v-model="form.distributor" :class="inputClass" />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="customerName">{{ t('form.customerName') }}</label>
          <input id="customerName" v-model="form.customerName" :class="inputClass" list="customer-names" required />
          <datalist id="customer-names">
            <option v-for="name in customerNames" :key="name" :value="name" />
          </datalist>
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="product">{{ t('form.product') }}</label>
          <input id="product" v-model="form.product" :class="inputClass" placeholder="ASC 6.00-9 S2000" />
        </div>
        <div>
          <label :class="labelClass" for="rimSize">{{ t('form.rimSize') }}</label>
          <input id="rimSize" v-model="form.rimSize" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="qty">{{ t('form.qty') }}</label>
          <input id="qty" v-model.number="form.qty" type="number" min="0" :class="inputClass" />
        </div>
        <div class="sm:col-span-2">
          <span :class="labelClass">{{ t('form.serialNumbers') }}</span>
          <div v-if="serials.length" class="grid gap-2 sm:grid-cols-2">
            <div v-for="index in serials.length" :key="index" class="flex items-center gap-2">
              <span class="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{{ index }}.</span>
              <input
                v-model="serials[index - 1]"
                :class="inputClass"
                :placeholder="t('form.serialPlaceholder')"
              />
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground">-</p>
        </div>
        <div>
          <label :class="labelClass" for="workTime">{{ t('form.workTime') }}</label>
          <input id="workTime" v-model="form.workTime" :class="inputClass" placeholder="13.30–16.30" />
        </div>
        <div>
          <label :class="labelClass" for="instStatus">{{ t('form.status') }}</label>
          <select id="instStatus" v-model="form.status" :class="inputClass">
            <option value="completed">{{ t('status.completed') }}</option>
            <option value="pending">{{ t('status.pending') }}</option>
            <option value="cancelled">{{ t('status.cancelled') }}</option>
          </select>
        </div>
        <div>
          <label :class="labelClass" for="serviceFee">{{ t('form.serviceFee') }}</label>
          <input id="serviceFee" v-model="serviceFeeText" type="text" inputmode="numeric" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="mobilizationFee">{{ t('form.mobilizationFee') }}</label>
          <input id="mobilizationFee" v-model="mobilizationFeeText" type="text" inputmode="numeric" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="discountRate">{{ t('form.discountRate') }}</label>
          <input id="discountRate" v-model.number="form.discountRate" type="number" min="0" max="100" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="receivedAmount">{{ t('form.receivedAmount') }}</label>
          <input id="receivedAmount" v-model="receivedAmountText" type="text" inputmode="numeric" :class="inputClass" />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="note">{{ t('form.note') }}</label>
          <textarea id="note" v-model="form.note" rows="3" :class="inputClass" />
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
