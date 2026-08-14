<script setup lang="ts">
// 작업보고서 미리보기 — Drive 임베드 뷰어(iframe)로 PDF/이미지를 표시합니다.
import BaseModal from '@/components/BaseModal.vue'
import { canDownloadReport } from '@/lib/auth-state'
import { reportDownloadUrl, reportPreviewUrl } from '@/lib/drive-report'
import { t } from '@/lib/i18n'

const props = defineProps<{ fileId: string; fileName?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseModal :title="fileName || t('report.modalTitle')" @close="emit('close')">
    <div class="space-y-3">
      <iframe
        :src="reportPreviewUrl(props.fileId)"
        class="h-[65vh] w-full rounded-md border border-border bg-background"
        :title="t('report.modalTitle')"
        allow="autoplay"
      />
      <div class="flex justify-end gap-2">
        <a
          v-if="canDownloadReport"
          :href="reportDownloadUrl(props.fileId)"
          target="_blank"
          rel="noopener"
          class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {{ t('report.download') }}
        </a>
        <button
          type="button"
          class="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          @click="emit('close')"
        >
          {{ t('aria.close') }}
        </button>
      </div>
      <p class="text-xs text-muted-foreground">
        {{ canDownloadReport ? t('report.previewHint') : t('report.viewOnly') }}
      </p>
    </div>
  </BaseModal>
</template>
