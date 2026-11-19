<script setup lang="ts">
import { t } from '@/lib/i18n'

// 모달 데이터 범위 표시 — 기간 필터가 걸려 있을 때만 나타나 표(기간 기준)와 모달 숫자가 같은 범위임을 밝히고,
// 전체 기간으로 넓히는 토글(높이 24px 이상)을 함께 둡니다(모달 안의 로컬 상태 — 표의 필터는 바꾸지 않음). 위치는 모든 모달에서 표 바로 위입니다.
defineProps<{ scope?: string; widened?: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <div v-if="scope" class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
    <span class="asm-badge asm-badge--neutral">{{ widened ? t('period.allTime') : scope }}</span>
    <button type="button" class="inline-flex min-h-6 items-center px-1 text-xs font-medium text-primary hover:underline" @click="emit('toggle')">
      {{ widened ? t('period.backToFilter') : t('period.showAll') }}
    </button>
    <!-- 토글 결과를 알립니다(내용이 바뀔 때만 낭독) -->
    <span role="status" class="sr-only">{{ widened ? t('period.allTime') : scope }}</span>
  </div>
</template>
