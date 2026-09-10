<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue'
import { X } from 'lucide-vue-next'
import { t } from '@/lib/i18n'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const dialogEl = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

// 모달을 연 트리거로 포커스를 되돌리기 위해 열림 시점의 포커스 요소를 기억해 둠.
onMounted(() => {
  previouslyFocused = document.activeElement as HTMLElement | null
  dialogEl.value?.focus()
})
onUnmounted(() => {
  previouslyFocused?.focus?.()
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <!-- 오버레이 rgb(51 51 51 / .5) — BI Dark Gray 기준 (가이드 8-5) -->
    <div
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style="background: rgb(51 51 51 / 0.5)"
      @click.self="emit('close')"
    >
      <!-- 폭 50.4rem — 기존 max-w-2xl(42rem)의 120%. 이력 모달의 표가 가로 스크롤 없이 더 많이 보이도록. -->
      <div
        ref="dialogEl"
        class="w-full max-w-[50.4rem] overflow-hidden rounded-lg border border-border border-t-4 border-t-primary bg-popover text-popover-foreground shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <!-- 헤더 20px / 700 (가이드 8-5) -->
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 :id="titleId" class="text-xl font-bold text-foreground">{{ title }}</h2>
          <button
            type="button"
            class="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            :aria-label="t('aria.close')"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="p-6">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
