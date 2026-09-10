<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Crosshair, Loader2, MapPin } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import ReportUploadField from '@/components/ReportUploadField.vue'
import { emptyInstallation } from '@/data/seed'
import { deleteReport } from '@/lib/drive-report'
import { maskSensitive } from '@/lib/auth-state'
import { mapsUrl, operationTeam } from '@/lib/format'
import { MASKED, maskedName, maskedValue } from '@/lib/mask'
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
  preview: [fileId: string, fileName: string]
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
        installArea: props.editing.installArea ?? '',
        locationUrl: props.editing.locationUrl ?? '',
        worker: props.editing.worker,
        enteredBy: props.editing.enteredBy,
        status: props.editing.status,
        note: props.editing.note,
        reportFileId: props.editing.reportFileId ?? '',
        reportFileName: props.editing.reportFileName ?? '',
        reportFileId2: props.editing.reportFileId2 ?? '',
        reportFileName2: props.editing.reportFileName2 ?? '',
        reportFileId3: props.editing.reportFileId3 ?? '',
        reportFileName3: props.editing.reportFileName3 ?? '',
        odometerFileId: props.editing.odometerFileId ?? '',
        odometerFileName: props.editing.odometerFileName ?? '',
        tirePrice: props.editing.tirePrice ?? 0,
        serviceFee: props.editing.serviceFee,
        mobilizationFee: props.editing.mobilizationFee,
        discountRate: props.editing.discountRate,
        receivedAmount: props.editing.receivedAmount,
      }
    : { ...emptyInstallation },
)

// 저장 전에 취소하면, 이번 편집 세션 중 새로 업로드된(기존에 없던) 보고서는
// Drive에 고아 파일로 남지 않도록 함께 삭제합니다.
const initialFileIds = new Set(
  [
    props.editing?.reportFileId,
    props.editing?.reportFileId2,
    props.editing?.reportFileId3,
    props.editing?.odometerFileId,
  ].filter(Boolean),
)

function handleClose() {
  for (const fileId of [form.reportFileId, form.reportFileId2, form.reportFileId3, form.odometerFileId]) {
    if (fileId && !initialFileIds.has(fileId)) void deleteReport(fileId).catch(() => undefined)
  }
  emit('close')
}

// 금액 입력: 천단위 콤마 표시용 텍스트 모델 (저장은 숫자).
// 조회 전용 계정에는 가린 값을 보여줍니다 — 마스킹 대상은 항상 readonly(fieldset disabled)라
// set 이 호출될 일이 없지만, 만일을 대비해 쓰기도 막습니다.
function moneyModel(key: 'tirePrice' | 'serviceFee' | 'mobilizationFee' | 'receivedAmount') {
  return computed({
    get: () => (maskSensitive.value ? MASKED : form[key] ? Number(form[key]).toLocaleString('en-US') : ''),
    set: (value: string) => {
      if (maskSensitive.value) return
      form[key] = Number(value.replace(/[^\d]/g, '')) || 0
    },
  })
}

const tirePriceText = moneyModel('tirePrice')
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
  get: () => (maskSensitive.value ? MASKED : form.receivedAmount ? Number(form.receivedAmount).toLocaleString('en-US') : ''),
  set: (value: string) => {
    if (maskSensitive.value) return
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

// 구글 위치: 현장에서 버튼 한 번으로 현재 좌표를 채웁니다(HTTPS 에서만 동작).
// 값은 'lat, lng' 문자열이며, 사용자가 지도 링크를 직접 붙여넣어도 그대로 저장합니다.
const locating = ref(false)
const locationError = ref('')
// 조회 전용 계정에는 지도 링크도 열어주지 않습니다(좌표가 URL 로 그대로 드러남).
const locationLink = computed(() => (maskSensitive.value ? '' : mapsUrl(form.locationUrl)))

// 고객명·요청고객·지역·위치 — 조회 전용 계정에는 가린 값을 보여줍니다.
// (maskedName/maskedValue 는 마스킹 대상이 아니면 원값을 그대로 돌려줍니다)
function nameModel(key: 'customerName' | 'distributor' | 'installArea') {
  return computed({
    get: () => maskedName(form[key]),
    set: (value: string) => {
      if (!maskSensitive.value) form[key] = value
    },
  })
}
const customerNameText = nameModel('customerName')
const distributorText = nameModel('distributor')
const installAreaText = nameModel('installArea')
const locationUrlText = computed({
  get: () => maskedValue(form.locationUrl),
  set: (value: string) => {
    if (!maskSensitive.value) form.locationUrl = value
  },
})
const discountRateText = computed({
  get: () => (maskSensitive.value ? MASKED : String(form.discountRate ?? 0)),
  set: (value: string) => {
    if (!maskSensitive.value) form.discountRate = Number(value) || 0
  },
})

function captureCurrentLocation() {
  locationError.value = ''
  if (!navigator.geolocation) {
    locationError.value = t('form.geoUnsupported')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      form.locationUrl = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      locating.value = false
    },
    (error) => {
      locationError.value = error.message || t('form.geoFailed')
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

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

// form 의 개별 reportFileId/reportFileId2/reportFileId3 필드를 슬롯 배열로 변환/역변환합니다.
const reportFiles = computed<{ fileId: string; fileName: string }[]>(() =>
  [
    { fileId: form.reportFileId, fileName: form.reportFileName },
    { fileId: form.reportFileId2, fileName: form.reportFileName2 },
    { fileId: form.reportFileId3, fileName: form.reportFileName3 },
  ].filter((f) => f.fileId),
)

function onReportChange(files: { fileId: string; fileName: string }[]) {
  const slots = [...files, { fileId: '', fileName: '' }, { fileId: '', fileName: '' }, { fileId: '', fileName: '' }]
  form.reportFileId = slots[0].fileId
  form.reportFileName = slots[0].fileName
  form.reportFileId2 = slots[1].fileId
  form.reportFileName2 = slots[1].fileName
  form.reportFileId3 = slots[2].fileId
  form.reportFileName3 = slots[2].fileName
}

// 주행거리계 사진은 현장 상황(조도·통신 등)에 따라 촬영이 어려울 수 있어 선택 사항입니다(최대 1장).
const odometerFiles = computed<{ fileId: string; fileName: string }[]>(() =>
  form.odometerFileId ? [{ fileId: form.odometerFileId, fileName: form.odometerFileName }] : [],
)

function onOdometerChange(files: { fileId: string; fileName: string }[]) {
  form.odometerFileId = files[0]?.fileId ?? ''
  form.odometerFileName = files[0]?.fileName ?? ''
}

function onSubmit() {
  if (!form.customerName.trim()) return
  emit('submit', {
    ...form,
    worker: selectedWorkers.value.map((v) => v.trim()).filter(Boolean).join(', '),
    serialNumbers: serials.value.map((v) => v.trim()).filter(Boolean).join(', '),
    qty: Number(form.qty) || 0,
    tirePrice: Number(form.tirePrice) || 0,
    serviceFee: Number(form.serviceFee) || 0,
    mobilizationFee: Number(form.mobilizationFee) || 0,
    discountRate: Number(form.discountRate) || 0,
    receivedAmount: Number(form.receivedAmount) || 0,
  })
}

const inputClass =
  'w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground'
</script>

<template>
  <BaseModal :title="readonly ? t('form.installation.view') : editing ? t('form.installation.edit') : t('form.installation.add')" @close="handleClose">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
      <fieldset :disabled="readonly" class="contents">
        <div>
          <label :class="labelClass" for="workDate">{{ t('form.workDate') }}</label>
          <input id="workDate" v-model="form.workDate" type="date" :class="inputClass" required />
        </div>
        <div>
          <label :class="labelClass" for="distributor">{{ t('form.distributor') }}</label>
          <input id="distributor" v-model="distributorText" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="customerName">{{ t('form.customerName') }}</label>
          <input
            id="customerName"
            v-model="customerNameText"
            :class="inputClass"
            :list="maskSensitive ? undefined : 'customer-names'"
            required
          />
          <!-- 고객 목록 자동완성은 조회 전용 계정에 노출하지 않습니다(마스킹 우회 경로) -->
          <datalist v-if="!maskSensitive" id="customer-names">
            <option v-for="name in customerNames" :key="name" :value="name" />
          </datalist>
        </div>
        <div>
          <label :class="labelClass" for="product">{{ t('form.product') }}</label>
          <input id="product" v-model="form.product" :class="inputClass" placeholder="ASC 6.00-9 S2000" />
        </div>
        <div>
          <label :class="labelClass" for="installArea">{{ t('form.installArea') }}</label>
          <input
            id="installArea"
            v-model="installAreaText"
            :class="inputClass"
            :placeholder="t('form.installAreaPlaceholder')"
          />
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label :class="labelClass" for="locationUrl">{{ t('form.locationUrl') }}</label>
            <a
              v-if="locationLink"
              :href="locationLink"
              target="_blank"
              rel="noopener"
              class="mb-1.5 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
            >
              <MapPin class="h-3.5 w-3.5" /> {{ t('form.openMap') }}
            </a>
          </div>
          <div class="flex gap-2">
            <input
              id="locationUrl"
              v-model="locationUrlText"
              :class="inputClass"
              :placeholder="t('form.locationPlaceholder')"
            />
            <button
              type="button"
              :disabled="locating"
              class="inline-flex h-[38px] shrink-0 items-center gap-1 rounded-md border border-border px-3 text-xs text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
              @click="captureCurrentLocation"
            >
              <Loader2 v-if="locating" class="h-3.5 w-3.5 animate-spin" />
              <Crosshair v-else class="h-3.5 w-3.5" />
              {{ locating ? t('form.locating') : t('form.useCurrentLocation') }}
            </button>
          </div>
          <p v-if="locationError" class="mt-1 text-xs text-destructive">{{ locationError }}</p>
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
          <input
            id="odometer"
            v-model="form.odometer"
            type="text"
            inputmode="numeric"
            :class="inputClass"
            placeholder="1234"
          />
        </div>
        <div>
          <span :class="labelClass">{{ t('form.worker') }}</span>
          <div class="flex flex-wrap gap-2 pt-1">
            <button
              v-for="name in operationTeam"
              :key="name"
              type="button"
              class="inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors"
              :class="
                selectedWorkers.includes(name)
                  ? 'border-primary-40 bg-primary-soft font-bold text-primary'
                  : 'border-border bg-card font-medium text-muted-foreground hover:bg-secondary hover:text-foreground'
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
          <label :class="labelClass" for="tirePrice">{{ t('form.tirePrice') }}</label>
          <input id="tirePrice" v-model="tirePriceText" type="text" inputmode="numeric" :class="inputClass" />
          <p class="mt-1 text-xs text-muted-foreground">{{ t('form.tirePriceHint') }}</p>
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
          <input
            id="discountRate"
            v-model="discountRateText"
            :type="maskSensitive ? 'text' : 'number'"
            min="0"
            max="100"
            :class="inputClass"
          />
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
      </fieldset>
      </div>

      <ReportUploadField
        :files="odometerFiles"
        :work-date="form.workDate"
        :customer-name="form.customerName"
        :qty="form.qty"
        kind="odometer"
        :max-files="1"
        @change="onOdometerChange"
        @preview="(fileId, fileName) => emit('preview', fileId, fileName)"
      />

      <ReportUploadField
        :files="reportFiles"
        :work-date="form.workDate"
        :customer-name="form.customerName"
        :qty="form.qty"
        @change="onReportChange"
        @preview="(fileId, fileName) => emit('preview', fileId, fileName)"
      />

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          @click="handleClose"
        >
          {{ readonly ? t('aria.close') : t('btn.cancel') }}
        </button>
        <button
          v-if="!readonly"
          type="submit"
          :disabled="saving"
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-50"
        >
          {{ saving ? t('btn.saving') : editing ? t('btn.update') : t('btn.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
