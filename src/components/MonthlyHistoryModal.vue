<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { formatDate, formatNumber, productLines } from '@/lib/format'
import { maskedIDR, maskedName } from '@/lib/mask'
import { t } from '@/lib/i18n'
import type { Installation } from '@/lib/types'

const props = defineProps<{
  month: string // 'YYYY-MM'
  installations: Installation[]
}>()

const emit = defineEmits<{ close: [] }>()

const history = computed(() =>
  props.installations
    .filter((item) => item.workDate.startsWith(props.month))
    .sort((a, b) => b.workDate.localeCompare(a.workDate)),
)

const totals = computed(() => ({
  qty: history.value.reduce((sum, i) => sum + i.qty, 0),
  received: history.value.reduce((sum, i) => sum + i.receivedAmount, 0),
}))
</script>

<template>
  <BaseModal :title="`${formatDate(month)} — ${t('month.modalTitle')}`" @close="emit('close')">
    <div class="overflow-x-auto">
      <table class="asm-table w-full min-w-160 text-left text-sm">
        <thead>
          <tr>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.workDate') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.userCustomer') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.requestCustomer') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.productRim') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.qty') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.received') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!history.length">
            <td colspan="6" class="px-3 py-10 text-center text-muted-foreground">{{ t('revenue.noHistory') }}</td>
          </tr>
          <tr
            v-for="item in history"
            :key="item.id"
            class="align-top">
            <td class="whitespace-nowrap px-3 py-2.5 text-foreground">{{ formatDate(item.workDate) }}</td>
            <td class="px-3 py-2.5 font-semibold text-foreground">{{ maskedName(item.customerName) }}</td>
            <td class="px-3 py-2.5 text-muted-foreground">{{ item.distributor ? maskedName(item.distributor) : '-' }}</td>
            <td class="px-3 py-2.5 text-muted-foreground">
              <p v-for="line in productLines(item.product)" :key="line" :title="line" class="max-w-48 truncate">{{ line }}</p>
            </td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(item.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ maskedIDR(item.receivedAmount) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="history.length">
          <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
          <tr>
            <td class="px-3 py-2.5" colspan="4">
              {{ t('revenue.total') }} ({{ history.length }} {{ t('unit.items') }})
            </td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">{{ formatNumber(totals.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">{{ maskedIDR(totals.received) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </BaseModal>
</template>
