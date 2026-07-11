import { computed, ref, watch, type Ref } from 'vue'

/**
 * 목록에 페이지네이션을 적용하는 컴포저블.
 * 원본 목록이 줄어들면(검색 필터 등) 현재 페이지를 자동으로 범위 안으로 보정합니다.
 */
export function usePagination<T>(source: Ref<T[]>, pageSize = 10) {
  const page = ref(1)
  const total = computed(() => source.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

  watch(pageCount, (pc) => {
    if (page.value > pc) page.value = pc
  })

  const offset = computed(() => (page.value - 1) * pageSize)
  const paged = computed(() => source.value.slice(offset.value, offset.value + pageSize))
  const start = computed(() => (total.value === 0 ? 0 : offset.value + 1))
  const end = computed(() => Math.min(page.value * pageSize, total.value))

  function go(p: number) {
    page.value = Math.min(Math.max(1, p), pageCount.value)
  }

  return { page, pageCount, paged, start, end, offset, total, go }
}
