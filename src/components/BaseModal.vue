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
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8" @click.self="emit('close')">
      <div
        ref="dialogEl"
        class="w-full max-w-2xl rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 :id="titleId" class="text-lg font-semibold text-foreground">{{ title }}</h2>
          <button
            type="button"
            class="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            :aria-label="t('aria.close')"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="px-6 py-5">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
