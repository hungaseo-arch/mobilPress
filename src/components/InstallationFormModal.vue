<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { emptyInstallation } from '@/data/seed'
import { operationTeam } from '@/lib/format'
import { t } from '@/lib/i18n'
import type { Installation, InstallationForm } from '@/lib/types'

const props = defineProps<{
  editing: Installation | null
  saving: boolean
  customerNames: string[]
  /** true 면 읽기 전용(조회) 모드 — 편집 권한 없는 사용자용 */
  readonly?: boolean
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
        odometer: props.editing.odometer,
        worker: props.editing.worker,
        enteredBy: props.editing.enteredBy,
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

// 수령액 자동 계산: 서비스 비용 × 할인율(%) + 출장비.
// 사용자가 직접 수정하면 자동 계산을 멈추고(수동 override), '자동 계산' 버튼으로 되돌립니다.
const autoReceived = computed(
  () => Math.round((Number(form.serviceFee) || 0) * ((Number(form.discountRate) || 0) / 100)) + (Number(form.mobilizationFee) || 0),
)
// 신규 등록은 자동, 기존 값이 공식과 다르면(수동 조정분) 수동 모드로 시작
const receivedManual = ref(Boolean(props.editing) && props.editing!.receivedAmount !== autoReceived.value)

watch([() => form.serviceFee, () => form.discountRate, () => form.mobilizationFee], () => {
  if (!receivedManual.value) form.receivedAmount = autoReceived.value
})
if (!receivedManual.value) form.receivedAmount = autoReceived.value

const receivedAmountText = computed({
  get: () => (form.receivedAmount ? Number(form.receivedAmount).toLocaleString('en-US') : ''),
  set: (value: string) => {
    form.receivedAmount = Number(value.replace(/[^\d]/g, '')) || 0
    receivedManual.value = true // 직접 입력 → 수동 모드
  },
})
function resetReceivedAuto() {
  receivedManual.value = false
  form.receivedAmount = autoReceived.value
}

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

// 작업자: 운영팀(operationTeam) 체크박스로 선택. 저장은 쉼표 연결 문자열.
// 명단에 없는 기존 값(수동 입력분)은 그대로 보존합니다.
const selectedWorkers = ref<string[]>(
  form.worker.split(',').map((v) => v.trim()).filter(Boolean),
)
const customWorkers = computed(() =>
  selectedWorkers.value.filter((w) => !operationTeam.includes(w as (typeof operationTeam)[number])),
)
function toggleWorker(name: string) {
  const idx = selectedWorkers.value.indexOf(name)
  if (idx >= 0) selectedWorkers.value.splice(idx, 1)
  else selectedWorkers.value.push(name)
}

function onSubmit() {
  if (!form.customerName.trim()) return
  emit('submit', {
    ...form,
    worker: selectedWorkers.value.map((v) => v.trim()).filter(Boolean).join(', '),
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
  <BaseModal :title="readonly ? t('form.installation.view') : editing ? t('form.installation.edit') : t('form.installation.add')" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <fieldset :disabled="readonly" class="contents">
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
          <label :class="labelClass" for="odometer">{{ t('form.odometer') }}</label>
          <input id="odometer" v-model="form.odometer" type="text" inputmode="numeric" :class="inputClass" placeholder="1234" />
        </div>
        <div>
          <span :class="labelClass">{{ t('form.worker') }}</span>
          <div class="flex flex-wrap gap-2 pt-1">
            <button
              v-for="name in operationTeam"
              :key="name"
              type="button"
              class="rounded-md border px-3 py-1.5 text-sm transition"
              :class="
                selectedWorkers.includes(name)
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              "
              @click="toggleWorker(name)"
            >
              {{ name }}
            </button>
            <span v-for="name in customWorkers" :key="name" class="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
              {{ name }}
            </span>
          </div>
        </div>
        <div v-if="editing && form.enteredBy">
          <span :class="labelClass">{{ t('form.enteredBy') }}</span>
          <p class="px-1 py-2 text-sm text-muted-foreground">{{ form.enteredBy }}</p>
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
          <div class="flex items-center justify-between">
            <label :class="labelClass" for="receivedAmount">{{ t('form.receivedAmount') }}</label>
            <button
              v-if="receivedManual"
              type="button"
              class="text-xs text-primary underline-offset-2 hover:underline"
              @click="resetReceivedAuto"
            >
              {{ t('form.autoCalc') }}
            </button>
            <span v-else class="text-xs text-muted-foreground">{{ t('form.autoCalcOn') }}</span>
          </div>
          <input id="receivedAmount" v-model="receivedAmountText" type="text" inputmode="numeric" :class="inputClass" />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="note">{{ t('form.note') }}</label>
          <textarea id="note" v-model="form.note" rows="3" :class="inputClass" />
        </div>
      </div>
      </fieldset>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          class="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          @click="emit('close')"
        >
          {{ readonly ? t('aria.close') : t('btn.cancel') }}
        </button>
        <button
          v-if="!readonly"
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
