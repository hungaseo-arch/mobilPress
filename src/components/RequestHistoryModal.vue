<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import ScopeTag from '@/components/ScopeTag.vue'
import { formatDate, formatNumber, productLines } from '@/lib/format'
import { maskedIDR, maskedName } from '@/lib/mask'
import { t } from '@/lib/i18n'
import type { Installation } from '@/lib/types'

const props = defineProps<{
  distributor: string
  installations: Installation[]
  /** 기간 필터와 무관한 전체 장착 실적 — '전체 기간 보기' 토글용 */
  allInstallations: Installation[]
  scope?: string
}>()

const emit = defineEmits<{ close: [] }>()

const widened = ref(false)
const history = computed(() =>
  (widened.value ? props.allInstallations : props.installations)
    .filter((item) => item.distributor === props.distributor)
    .sort((a, b) => b.workDate.localeCompare(a.workDate)),
)

const totals = computed(() => ({
  qty: history.value.reduce((sum, i) => sum + i.qty, 0),
  received: history.value.reduce((sum, i) => sum + i.receivedAmount, 0),
}))
</script>

<template>
  <BaseModal :title="`${maskedName(distributor)} — ${t('request.modalTitle')}`" @close="emit('close')">
    <ScopeTag :scope="scope" :widened="widened" @toggle="widened = !widened" />
    <div class="relative overflow-x-auto">
      <table class="asm-table w-full min-w-140 text-left text-sm">
        <thead>
          <tr>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.workDate') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.userCustomer') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 font-medium">{{ t('th.productRim') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.qty') }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2.5 text-right font-medium">{{ t('th.received') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!history.length">
            <td colspan="5" class="px-3 py-10 text-center text-muted-foreground">{{ t('revenue.noHistory') }}</td>
          </tr>
          <tr
            v-for="item in history"
            :key="item.id"
            class="align-top">
            <td class="whitespace-nowrap px-3 py-2.5 text-foreground">{{ formatDate(item.workDate) }}</td>
            <td class="px-3 py-2.5 font-bold text-foreground">{{ maskedName(item.customerName) }}</td>
            <td class="px-3 py-2.5 text-muted-foreground">
              <p v-for="line in productLines(item.product)" :key="line" :title="line" class="max-w-56 truncate">{{ line }}</p>
            </td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-foreground">{{ formatNumber(item.qty) }} pcs</td>
            <td class="px-3 py-2.5 whitespace-nowrap text-right font-bold tabular-nums text-foreground">{{ maskedIDR(item.receivedAmount) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="history.length">
          <!-- 합계 행 배경·글자색은 .asm-table 규격(가이드 6-2)이 정한다 -->
          <tr>
            <td class="px-3 py-2.5" colspan="3">
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
