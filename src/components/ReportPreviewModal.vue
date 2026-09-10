<script setup lang="ts">
// 작업보고서 미리보기.
//
// 파일 본체를 Apps Script 로 받아 blob: 으로 표시합니다. Drive 임베드 뷰어(iframe)를 직접
// 가리키면 '보는 사람'의 Google 세션이 필요해서, 계정이 여러 개 로그인돼 있거나 서드파티
// 쿠키가 차단된 브라우저에서는 빈 화면이 됩니다. 받아오기가 실패하면 기존 임베드 뷰어로
// 물러나고, 어느 쪽이든 Drive 새 탭 링크를 함께 제공합니다.
import { onUnmounted, ref } from 'vue'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import { canDownloadReport } from '@/lib/auth-state'
import {
  fetchReportBlob,
  reportPreviewUrl,
  reportViewUrl,
  revokeReportBlob,
} from '@/lib/drive-report'
import { t } from '@/lib/i18n'

const props = defineProps<{ fileId: string; fileName?: string }>()
const emit = defineEmits<{ close: [] }>()

const loading = ref(true)
const blobUrl = ref('')
const error = ref('')

// 로딩이 끝나기 전에 모달이 닫히면 응답 시점에 즉시 해제해 blob: URL 누수를 막습니다.
let closed = false

fetchReportBlob(props.fileId)
  .then((file) => {
    if (closed) {
      revokeReportBlob(file.url)
      return
    }
    blobUrl.value = file.url
  })
  .catch((e: unknown) => {
    error.value = e instanceof Error ? e.message : t('report.loadFailed')
  })
  .finally(() => {
    loading.value = false
  })

onUnmounted(() => {
  closed = true
  if (blobUrl.value) revokeReportBlob(blobUrl.value)
})
</script>

<template>
  <BaseModal :title="fileName || t('report.modalTitle')" @close="emit('close')">
    <div class="space-y-3">
      <div
        v-if="loading"
        class="flex h-[65vh] w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary text-sm text-muted-foreground"
      >
        <Loader2 class="h-4 w-4 animate-spin" /> {{ t('report.loading') }}
      </div>
      <iframe
        v-else
        :src="blobUrl || reportPreviewUrl(props.fileId)"
        class="h-[65vh] w-full rounded-md border border-border bg-background"
        :title="t('report.modalTitle')"
      />

      <p v-if="error" class="flex items-start gap-1.5 text-xs text-destructive">
        <AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{{ error }}</span>
      </p>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <a
          :href="reportViewUrl(props.fileId)"
          target="_blank"
          rel="noopener"
          class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border px-4 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <ExternalLink class="h-3.5 w-3.5" /> {{ t('report.openInDrive') }}
        </a>
        <a
          v-if="canDownloadReport && blobUrl"
          :href="blobUrl"
          :download="fileName || props.fileId"
          class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active"
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
