<script setup lang="ts">
import { reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import BaseModal from '@/components/BaseModal.vue'
import { dataMode } from '@/lib/api'
import { t } from '@/lib/i18n'

const emit = defineEmits<{ close: [] }>()

const form = reactive({ current: '', next: '', confirm: '' })
const saving = ref(false)
const mismatch = ref(false)

async function onSubmit() {
  if (saving.value) return
  mismatch.value = form.next !== form.confirm
  if (mismatch.value || form.next.length < 8) return
  saving.value = true
  try {
    if (dataMode === 'neon') {
      const { changeOwnPassword } = await import('@/lib/neon-auth')
      await changeOwnPassword(form.current, form.next)
    }
    toast.success(t('member.pw.changed'))
    emit('close')
  } catch (error) {
    // 실패 시 모달을 열어 둬 입력값을 보존한다.
    toast.error(error instanceof Error ? error.message : t('member.pw.fail'))
  } finally {
    saving.value = false
  }
}

const inputClass =
  'w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground'
</script>

<template>
  <BaseModal :title="t('member.pw.title')" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label :class="labelClass" for="pwCurrent">{{ t('member.pw.current') }}</label>
        <input id="pwCurrent" v-model="form.current" type="password" :class="inputClass" required autocomplete="current-password" />
      </div>
      <div>
        <label :class="labelClass" for="pwNew">{{ t('member.pw.new') }}</label>
        <input id="pwNew" v-model="form.next" type="password" minlength="8" :class="inputClass" required autocomplete="new-password" />
      </div>
      <div>
        <label :class="labelClass" for="pwConfirm">{{ t('member.pw.confirm') }}</label>
        <input
          id="pwConfirm"
          v-model="form.confirm"
          type="password"
          minlength="8"
          :class="inputClass"
          required
          autocomplete="new-password"
          :aria-invalid="mismatch"
          aria-describedby="pwMismatch"
        />
        <p v-if="mismatch" id="pwMismatch" role="alert" class="mt-1.5 text-xs text-destructive">{{ t('member.pw.mismatch') }}</p>
      </div>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          @click="emit('close')"
        >
          {{ t('btn.cancel') }}
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-50"
        >
          {{ saving ? t('btn.saving') : t('member.pw.change') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
