<script setup lang="ts">
// 장착 작업보고서(스캔 PDF) 첨부 필드 — InstallationFormModal 안에서 사용.
// 열람/다운로드/업로드/해제는 각각 별도 권한으로 통제됩니다 (auth-state.ts 의 REPORT_POLICY).
import { ref } from 'vue'
import { Eye, FileText, Loader2, Lock, Paperclip, Trash2 } from 'lucide-vue-next'
import {
  canDownloadReport,
  canUnlinkReport,
  canUploadReport,
  canViewReport,
} from '@/lib/auth-state'
import {
  ACCEPT_TYPES,
  MAX_UPLOAD_MB,
  driveEnabled,
  reportDownloadUrl,
  uploadReport,
} from '@/lib/drive-report'
import { t } from '@/lib/i18n'

const props = defineProps<{
  fileId: string
  fileName: string
  workDate: string
  customerName: string
  qty: number
}>()

const emit = defineEmits<{
  change: [value: { fileId: string; fileName: string }]
  preview: [fileId: string]
}>()

const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref('')

async function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  uploading.value = true
  try {
    const result = await uploadReport(file, {
      workDate: props.workDate,
      customerName: props.customerName,
      qty: props.qty,
    })
    emit('change', result)
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('report.uploadFailed')
  } finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}

function unlink() {
  // Drive 원본은 보존하고 DB 링크만 해제합니다 (실적 정정 시 원본 추적 목적).
  emit('change', { fileId: '', fileName: '' })
}

const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground'
const chipClass =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:text-foreground'
</script>

<template>
  <div>
    <span :class="labelClass">{{ t('form.report') }}</span>

    <!-- 첨부됨 -->
    <div
      v-if="fileId"
      class="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2"
    >
      <FileText class="h-4 w-4 shrink-0 text-primary" />
      <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ fileName || fileId }}</span>

      <button v-if="canViewReport" type="button" :class="chipClass" @click="emit('preview', fileId)">
        <Eye class="h-3.5 w-3.5" /> {{ t('report.preview') }}
      </button>

      <a
        v-if="canDownloadReport"
        :href="reportDownloadUrl(fileId)"
        target="_blank"
        rel="noopener"
        :class="chipClass"
      >
        {{ t('report.download') }}
      </a>

      <button v-if="canUploadReport" type="button" :class="chipClass" @click="input?.click()">
        <Paperclip class="h-3.5 w-3.5" /> {{ t('report.replace') }}
      </button>

      <button
        v-if="canUnlinkReport"
        type="button"
        class="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
        :aria-label="t('report.unlink')"
        @click="unlink"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- 미첨부 -->
    <div v-else>
      <p v-if="!driveEnabled" class="px-1 py-2 text-sm text-muted-foreground">
        {{ t('report.disabled') }}
      </p>
      <p
        v-else-if="!canUploadReport"
        class="flex items-center gap-1.5 px-1 py-2 text-sm text-muted-foreground"
      >
        <Lock class="h-3.5 w-3.5" /> {{ t('report.noUploadPerm') }}
      </p>
      <template v-else>
        <button
          type="button"
          :disabled="uploading"
          class="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
          @click="input?.click()"
        >
          <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
          <Paperclip v-else class="h-4 w-4" />
          {{ uploading ? t('report.uploading') : t('report.attach') }}
        </button>
        <p class="mt-1 text-xs text-muted-foreground">PDF / JPG / PNG · max {{ MAX_UPLOAD_MB }} MB</p>
      </template>
    </div>

    <p v-if="error" class="mt-1 text-xs text-destructive">{{ error }}</p>

    <input
      v-if="canUploadReport"
      ref="input"
      type="file"
      :accept="ACCEPT_TYPES"
      class="hidden"
      @change="onPick"
    />
  </div>
</template>
