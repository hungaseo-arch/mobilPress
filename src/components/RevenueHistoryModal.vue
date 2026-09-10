<script setup lang="ts">
import { computed } from 'vue'
import { Pencil } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import { formatDate, formatNumber, productLines } from '@/lib/format'
import { maskedIDR, maskedName, maskedPercent, maskedValue } from '@/lib/mask'
import { t } from '@/lib/i18n'
import type { Customer, Installation } from '@/lib/types'

const props = defineProps<{
  customerName: string
  customer: Customer | null
  installations: Installation[]
  canEdit: boolean
}>()

const emit = defineEmits<{
  close: []
  editCustomer: [customer: Customer]
}>()

const history = computed(() =>
  props.installations
    .filter((item) => item.customerName === props.customerName)
    .sort((a, b) => b.workDate.localeCompare(a.workDate)),
)

const totals = computed(() => ({
  qty: history.value.reduce((sum, i) => sum + i.qty, 0),
  serviceFee: history.value.reduce((sum, i) => sum + i.serviceFee, 0),
  mobFee: history.value.reduce((sum, i) => sum + i.mobilizationFee, 0),
  received: history.value.reduce((sum, i) => sum + i.receivedAmount, 0),
}))
</script>

<template>
  <BaseModal :title="maskedName(customerName)" @close="emit('close')">
    <!-- 고객 주요 정보 -->
    <section v-if="customer" class="mb-5 rounded-lg border border-border bg-secondary p-4">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-bold text-foreground">{{ t('tab.customers') }}</h3>
          <!-- 상태 배지 (가이드 8-4) — 거래 중=성공 / 그 외=중립 -->
          <span
            class="asm-badge"
            :class="customer.status === 'active' ? 'asm-badge--success' : 'asm-badge--neutral'"
          >
            {{ t(`status.${customer.status}`) }}
          </span>
        </div>
        <button
          v-if="canEdit"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          @click="emit('editCustomer', customer)"
        >
          <Pencil class="h-3.5 w-3.5" />
          {{ t('btn.edit') }}
        </button>
      </div>
      <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('th.bizArea') }}</dt>
          <dd class="text-foreground">{{ customer.businessType || '-' }} · {{ customer.area ? maskedName(customer.area) : '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('form.contactName') }}</dt>
          <dd class="text-foreground">{{ customer.contactName ? maskedName(customer.contactName) : '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('th.vendorPrice') }}</dt>
          <dd class="text-foreground">
            {{ customer.currentPressVendor || '-' }}
            <span v-if="customer.marketPrice" class="block text-xs text-muted-foreground">{{ maskedValue(customer.marketPrice) }}</span>
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('th.lastVisit') }}</dt>
          <dd class="text-foreground">{{ formatDate(customer.lastVisitDate) }}</dd>
        </div>
        <div v-if="customer.insight" class="sm:col-span-2">
          <dt class="text-xs text-muted-foreground">{{ t('form.insight') }}</dt>
          <dd class="leading-relaxed text-foreground">{{ customer.insight }}</dd>
        </div>
      </dl>
    </section>

    <!-- 매출 상세 히스토리 -->
    <h3 class="mb-2 text-sm font-bold text-foreground">{{ t('revenue.modalTitle') }}</h3>
    <div class="overflow-x-auto">
      <table class="asm-table w-full min-w-180 text-left text-sm">
        <thead>
          <tr>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.workDate') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.productRim') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.qty') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.serviceFee') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.discount') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.mobFee') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.received') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!history.length">
            <td colspan="7" class="px-3 py-10 text-center text-muted-foreground">{{ t('revenue.noHistory') }}</td>
          </tr>
          <tr
            v-for="item in history"
            :key="item.id"
            class="align-top">
            <td class="whitespace-nowrap px-3 py-2.5 text-foreground">{{ formatDate(item.workDate) }}</td>
            <td class="px-3 py-2.5 text-muted-foreground">
              <p v-for="line in productLines(item.product)" :key="line" :title="line" class="max-w-56 truncate">{{ line }}</p>
              <p v-if="item.note" :title="item.note" class="mt-1 max-w-56 truncate text-xs">{{ item.note }}</p>
            </td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(item.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ maskedIDR(item.serviceFee) }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ maskedPercent(item.discountRate) }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ maskedIDR(item.mobilizationFee) }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ maskedIDR(item.receivedAmount) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="history.length">
          <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
          <tr>
            <td class="px-3 py-2.5" colspan="2">{{ t('revenue.total') }} ({{ history.length }} {{ t('unit.items') }})</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">{{ formatNumber(totals.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(totals.serviceFee) }}</td>
            <td class="px-3 py-2.5" />
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(totals.mobFee) }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(totals.received) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </BaseModal>
</template>
