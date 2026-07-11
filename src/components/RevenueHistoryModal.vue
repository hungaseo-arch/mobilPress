<script setup lang="ts">
import { computed } from 'vue'
import { Pencil } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import { formatDate, formatIDR, formatNumber, productLines } from '@/lib/format'
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
  <BaseModal :title="customerName" @close="emit('close')">
    <!-- 고객 주요 정보 -->
    <section v-if="customer" class="mb-5 rounded-lg border border-border bg-secondary/30 p-4">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-bold text-foreground">{{ t('tab.customers') }}</h3>
          <span
            class="inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="customer.status === 'active' ? 'bg-primary/15 text-primary' : 'bg-secondary text-secondary-foreground'"
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
          <dd class="text-foreground">{{ customer.businessType || '-' }} · {{ customer.area || '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('form.contactName') }}</dt>
          <dd class="text-foreground">{{ customer.contactName || '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">{{ t('th.vendorPrice') }}</dt>
          <dd class="text-foreground">
            {{ customer.currentPressVendor || '-' }}
            <span v-if="customer.marketPrice" class="block text-xs text-muted-foreground">{{ customer.marketPrice }}</span>
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
      <table class="w-full min-w-180 text-left text-sm">
        <thead>
          <tr class="border-b border-border text-xs text-muted-foreground">
            <th class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.workDate') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.productRim') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.qty') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.serviceFee') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.discount') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.mobFee') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.received') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!history.length">
            <td colspan="7" class="px-3 py-10 text-center text-muted-foreground">{{ t('revenue.noHistory') }}</td>
          </tr>
          <tr
            v-for="item in history"
            :key="item.id"
            class="border-b border-border/60 align-top last:border-0"
          >
            <td class="px-3 py-2.5">
              <p class="text-foreground">{{ formatDate(item.workDate) }}</p>
              <p v-if="item.workTime" class="mt-0.5 text-xs text-muted-foreground">{{ item.workTime }}</p>
            </td>
            <td class="px-3 py-2.5 text-muted-foreground">
              <p v-for="line in productLines(item.product)" :key="line" class="max-w-56">{{ line }}</p>
              <p v-if="item.note" class="mt-1 text-xs leading-relaxed">{{ item.note }}</p>
            </td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(item.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatIDR(item.serviceFee) }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ item.discountRate }}%</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatIDR(item.mobilizationFee) }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ formatIDR(item.receivedAmount) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="history.length">
          <tr class="border-t border-border bg-secondary/50 font-semibold">
            <td class="px-3 py-2.5 text-foreground" colspan="2">{{ t('revenue.total') }} ({{ history.length }} {{ t('unit.items') }})</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(totals.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatIDR(totals.serviceFee) }}</td>
            <td class="px-3 py-2.5" />
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">{{ formatIDR(totals.mobFee) }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-primary">{{ formatIDR(totals.received) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </BaseModal>
</template>
