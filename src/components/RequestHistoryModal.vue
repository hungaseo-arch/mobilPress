<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { formatDate, formatIDR, formatNumber, productLines } from '@/lib/format'
import { t } from '@/lib/i18n'
import type { Installation } from '@/lib/types'

const props = defineProps<{
  distributor: string
  installations: Installation[]
}>()

const emit = defineEmits<{ close: [] }>()

const history = computed(() =>
  props.installations
    .filter((item) => item.distributor === props.distributor)
    .sort((a, b) => b.workDate.localeCompare(a.workDate)),
)

const totals = computed(() => ({
  qty: history.value.reduce((sum, i) => sum + i.qty, 0),
  received: history.value.reduce((sum, i) => sum + i.receivedAmount, 0),
}))
</script>

<template>
  <BaseModal :title="`${distributor} — ${t('request.modalTitle')}`" @close="emit('close')">
    <div class="overflow-x-auto">
      <table class="w-full min-w-140 text-left text-sm">
        <thead>
          <tr class="border-b border-border text-xs text-muted-foreground">
            <th class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.workDate') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.userCustomer') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.productRim') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.qty') }}</th>
            <th class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.received') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!history.length">
            <td colspan="5" class="px-3 py-10 text-center text-muted-foreground">{{ t('revenue.noHistory') }}</td>
          </tr>
          <tr
            v-for="item in history"
            :key="item.id"
            class="border-b border-border/60 align-top last:border-0"
          >
            <td class="whitespace-nowrap px-3 py-2.5 text-foreground">{{ formatDate(item.workDate) }}</td>
            <td class="px-3 py-2.5 font-semibold text-foreground">{{ item.customerName }}</td>
            <td class="px-3 py-2.5 text-muted-foreground">
              <p v-for="line in productLines(item.product)" :key="line" class="max-w-56">{{ line }}</p>
            </td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(item.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right font-semibold tabular-nums text-primary">{{ formatIDR(item.receivedAmount) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="history.length">
          <tr class="border-t border-border bg-secondary/50 font-semibold">
            <td class="px-3 py-2.5 text-foreground" colspan="3">
              {{ t('revenue.total') }} ({{ history.length }} {{ t('unit.items') }})
            </td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(totals.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-primary">{{ formatIDR(totals.received) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </BaseModal>
</template>
