<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  page: number
  pageCount: number
  start: number
  end: number
  total: number
}>()
const emit = defineEmits<{ go: [page: number] }>()

// 현재 페이지 주변으로 최대 5개 번호 버튼 표시
const pages = computed(() => {
  const max = 5
  let s = Math.max(1, props.page - 2)
  const e = Math.min(props.pageCount, s + max - 1)
  s = Math.max(1, e - max + 1)
  return Array.from({ length: e - s + 1 }, (_, i) => s + i)
})

const btn =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border px-2 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed'
</script>

<template>
  <div
    v-if="pageCount > 1"
    class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
  >
    <span class="text-xs text-muted-foreground tabular-nums">{{ start }}–{{ end }} / {{ total }}</span>
    <div class="flex items-center gap-1">
      <button type="button" :class="btn" :disabled="page <= 1" @click="emit('go', page - 1)">
        <ChevronLeft class="h-4 w-4" />
      </button>
      <button
        v-for="p in pages"
        :key="p"
        type="button"
        :class="[btn, p === page ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground hover:text-foreground']"
        @click="emit('go', p)"
      >
        {{ p }}
      </button>
      <button type="button" :class="btn" :disabled="page >= pageCount" @click="emit('go', page + 1)">
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
