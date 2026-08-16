<script setup lang="ts">
// 장착 작업보고서(스캔 PDF) 첨부 필드 — InstallationFormModal 안에서 사용.
// 최대 3개까지 첨부 가능. 열람/다운로드/업로드/해제는 각각 별도 권한으로 통제됩니다 (auth-state.ts 의 REPORT_POLICY).
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
  deleteReport,
  driveEnabled,
  reportDownloadUrl,
  uploadReport,
} from '@/lib/drive-report'
import { t } from '@/lib/i18n'

export interface ReportFileSlot {
  fileId: string
  fileName: string
}

const MAX_FILES = 3

const props = defineProps<{
  files: ReportFileSlot[]
  workDate: string
  customerName: string
  qty: number
}>()

const emit = defineEmits<{
  change: [value: ReportFileSlot[]]
  preview: [fileId: string, fileName: string]
}>()

const input = ref<HTMLInputElement | null>(null)
// 교체(replace) 대상 인덱스. null 이면 신규 추가.
const replaceIndex = ref<number | null>(null)
const uploading = ref(false)
const error = ref('')

function openPicker(index: number | null) {
  replaceIndex.value = index
  input.value?.click()
}

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
    const next = [...props.files]
    if (replaceIndex.value !== null) next[replaceIndex.value] = result
    else next.push(result)
    emit('change', next)
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('report.uploadFailed')
  } finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}

function unlink(index: number) {
  // Drive 원본도 휴지통으로 이동하므로 삭제 전 확인을 거칩니다.
  const target = props.files[index]
  if (!target) return
  if (!window.confirm(t('confirm.delete', { name: target.fileName || target.fileId }))) return
  // 네트워크 오류가 나도 DB 링크 해제는 그대로 진행합니다.
  void deleteReport(target.fileId).catch(() => undefined)
  emit('change', props.files.filter((_, i) => i !== index))
}

const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground'
const chipClass =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:text-foreground'
</script>

<template>
  <div>
    <span :class="labelClass">{{ t('form.report') }}</span>

    <!-- 첨부된 파일 목록 -->
    <div v-if="files.length" class="space-y-2">
      <div
        v-for="(f, index) in files"
        :key="f.fileId"
        class="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2"
      >
        <FileText class="h-4 w-4 shrink-0 text-primary" />
        <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ f.fileName || f.fileId }}</span>

        <button v-if="canViewReport" type="button" :class="chipClass" @click="emit('preview', f.fileId, f.fileName)">
          <Eye class="h-3.5 w-3.5" /> {{ t('report.preview') }}
        </button>

        <a
          v-if="canDownloadReport"
          :href="reportDownloadUrl(f.fileId)"
          target="_blank"
          rel="noopener"
          :class="chipClass"
        >
          {{ t('report.download') }}
        </a>

        <button v-if="canUploadReport" type="button" :class="chipClass" @click="openPicker(index)">
          <Paperclip class="h-3.5 w-3.5" /> {{ t('report.replace') }}
        </button>

        <button
          v-if="canUnlinkReport"
          type="button"
          class="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
          :aria-label="t('report.unlink')"
          @click="unlink(index)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- 미첨부 상태 안내 -->
    <p v-if="!files.length && !driveEnabled" class="px-1 py-2 text-sm text-muted-foreground">
      {{ t('report.disabled') }}
    </p>
    <p
      v-else-if="!files.length && !canUploadReport"
      class="flex items-center gap-1.5 px-1 py-2 text-sm text-muted-foreground"
    >
      <Lock class="h-3.5 w-3.5" /> {{ t('report.noUploadPerm') }}
    </p>

    <!-- 추가 첨부 (최대 3개까지) -->
    <template v-if="driveEnabled && canUploadReport && files.length < MAX_FILES">
      <button
        type="button"
        :disabled="uploading"
        class="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
        @click="openPicker(null)"
      >
        <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
        <Paperclip v-else class="h-4 w-4" />
        {{ uploading ? t('report.uploading') : t('report.attach') }}
      </button>
      <p class="mt-1 text-xs text-muted-foreground">
        PDF / JPG / PNG · max {{ MAX_UPLOAD_MB }} MB · {{ files.length }}/{{ MAX_FILES }}
      </p>
    </template>

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
