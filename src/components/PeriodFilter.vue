<script setup lang="ts">
import { computed, useId } from 'vue'
import { PERIODS, type Period } from '@/lib/period'
import { t } from '@/lib/i18n'

// 기간 필터 — 모든 탭에서 같은 위치·같은 모양. 서브탭(보기 전환, 파란 선택색)과 구분되도록 라벨이 붙은 분절형 컨트롤이며 선택은 중립색+진한 링(ring-1 inset), hover 는 같은 중립색(bg-secondary)에 링 없이 두어 분리하고, 기간이 '전체'가 아니면 '필터 적용 중'을 버튼 뒤 고정 슬롯에 표시합니다. 높이는 검색·등록과 같은 36px.
// disabled 일 때는 숨기지 않고 비활성으로 두고(선택 강조도 풀어 '선택됨'처럼 보이지 않게), note 로 이유를 밝힙니다.
const props = defineProps<{ modelValue: Period; disabled?: boolean; note?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: Period] }>()

const noteId = useId()
const options = computed(() => PERIODS.map((key) => ({ key, label: t(`period.${key}`) })))
</script>

<template>
  <div class="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1">
    <span class="text-xs font-medium text-muted-foreground" aria-hidden="true">{{ t('period.label') }}</span>
    <div
      role="group"
      :aria-label="t('period.label')"
      :aria-describedby="note ? noteId : undefined"
      class="inline-flex h-9 items-center rounded-md border border-border bg-card p-0.5"
      :class="props.disabled ? 'opacity-50' : ''"
    >
      <button
        v-for="po in options"
        :key="po.key"
        type="button"
        :disabled="props.disabled"
        :aria-pressed="props.disabled ? undefined : props.modelValue === po.key"
        class="inline-flex h-7 items-center whitespace-nowrap rounded px-3 text-sm transition-colors disabled:cursor-not-allowed"
        :class="
          props.modelValue === po.key && !props.disabled
            ? 'bg-secondary font-bold text-foreground ring-1 ring-inset ring-foreground'
            : 'font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-muted-foreground'
        "
        @click="emit('update:modelValue', po.key)"
      >
        {{ po.label }}
      </button>
    </div>
    <!-- 고정 슬롯 — 필터 적용 표시와 사유(note)가 같은 자리를 쓰므로 나타나도 버튼이 움직이지 않습니다 -->
    <span v-if="note" :id="noteId" class="inline-block min-w-24 max-w-prose text-xs leading-4 text-muted-foreground">{{ note }}</span>
    <span
      v-else
      class="inline-block min-w-24 text-xs font-bold text-primary"
      :class="props.modelValue !== 'all' && !props.disabled ? '' : 'invisible'"
      :aria-hidden="props.modelValue === 'all' || props.disabled ? 'true' : undefined"
    >{{ t('period.active') }}</span>
  </div>
</template>
