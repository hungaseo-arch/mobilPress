<script setup lang="ts">
// 장착 실적 빈 상태 — PC 표(colspan 셀)와 모바일 카드 목록이 같은 문구·버튼을 쓰도록 한 곳에 둡니다.
import { ClipboardList } from 'lucide-vue-next'
import { useMobilPressStore } from '@/stores/mobilPress'
import { maskSensitive } from '@/lib/auth-state'
import { t } from '@/lib/i18n'

const store = useMobilPressStore()
</script>

<template>
  <ClipboardList class="mx-auto mb-2 h-8 w-8 opacity-40" />
  <template v-if="store.query.trim()">
    <p class="wrap-anywhere">{{ t('search.noMatch', { q: store.query.trim() }) }}</p>
    <p v-if="maskSensitive" class="mt-1 text-xs">{{ t('search.maskedHint') }}</p>
    <button
      type="button"
      class="mt-3 inline-flex h-8 items-center rounded-md border border-primary bg-card px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary"
      @click="store.query = ''"
    >
      {{ t('search.clear') }}
    </button>
    <button
      v-if="store.period !== 'all'"
      type="button"
      class="ml-2 mt-3 inline-flex h-8 items-center rounded-md border border-primary bg-card px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary"
      @click="store.period = 'all'"
    >
      {{ t('period.showAll') }}
    </button>
  </template>
  <template v-else-if="store.period !== 'all' && store.installations.length">
    {{ t('period.empty') }}
    <div><button
      type="button"
      class="mt-3 inline-flex h-8 items-center rounded-md border border-primary bg-card px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary"
      @click="store.period = 'all'"
    >
      {{ t('period.showAll') }}
    </button></div>
  </template>
  <template v-else>{{ t('installations.empty') }}</template>
</template>
