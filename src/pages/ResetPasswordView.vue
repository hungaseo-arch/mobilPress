<script setup lang="ts">
// 비밀번호 재설정 페이지 — 이메일 링크(?token=...)로 진입합니다.
// AuthGate 는 이 라우트를 로그인 없이 통과시킵니다.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { t } from '@/lib/i18n'
import { resetPassword } from '@/lib/neon-auth'

const route = useRoute()
const router = useRouter()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
// Better Auth 는 토큰이 만료/무효면 ?error=INVALID_TOKEN 으로 리다이렉트합니다.
const linkError = computed(() => typeof route.query.error === 'string')

const password = ref('')
const passwordConfirm = ref('')
const submitting = ref(false)
const done = ref(false)

async function submit() {
  if (submitting.value) return
  if (password.value !== passwordConfirm.value) {
    toast.error(t('reset.mismatch'))
    return
  }
  submitting.value = true
  try {
    await resetPassword(password.value, token.value)
    done.value = true
    toast.success(t('reset.done'))
    await router.replace('/')
    // AuthGate 가 로그인 화면을 다시 그리도록 새로고침
    window.location.reload()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('reset.fail'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 class="text-xl font-bold text-slate-900">{{ t('reset.title') }}</h1>

      <div v-if="linkError || !token" class="mt-4 space-y-4">
        <p class="text-sm text-red-600">{{ t('reset.invalid') }}</p>
        <p class="text-sm text-slate-500">{{ t('reset.invalidHint') }}</p>
        <RouterLink
          to="/"
          class="block w-full rounded-lg bg-slate-900 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
        >
          {{ t('reset.toSignin') }}
        </RouterLink>
      </div>

      <form v-else class="mt-4 space-y-4" @submit.prevent="submit">
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          :placeholder="t('reset.newPassword')"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <input
          v-model="passwordConfirm"
          type="password"
          required
          minlength="8"
          :placeholder="t('reset.confirmPassword')"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          :disabled="submitting || done"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          {{ t('reset.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>
