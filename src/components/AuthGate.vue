<script setup lang="ts">
// Neon 모드에서만 동작하는 로그인 게이트.
// mock/proxy 모드이거나 Neon 미설정이면 앱을 그대로 통과시킵니다.
// 로그아웃 버튼은 HomeView 헤더에 있습니다 (auth-state.ts 공유).
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { authEnabled, currentUser, refreshUser } from '@/lib/auth-state'
import { lang, setLang, t } from '@/lib/i18n'
import { requestPasswordReset, signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/lib/neon-auth'

const route = useRoute()
// 비밀번호 재설정 페이지는 이메일 링크로 진입하므로 로그인 없이 통과시킵니다.
const bypassGate = computed(() => route.name === 'reset-password')

const checking = ref(authEnabled)

const mode = ref<'signin' | 'signup' | 'forgot'>('signin')
const name = ref('')
const email = ref('')
const password = ref('')
const submitting = ref(false)

onMounted(async () => {
  if (!authEnabled) return
  try {
    await refreshUser()
  } finally {
    checking.value = false
  }
})

async function submit() {
  if (submitting.value) return
  submitting.value = true
  try {
    if (mode.value === 'forgot') {
      // 재설정 링크는 /reset-password?token=... 으로 돌아옵니다 (base 경로 포함).
      const redirectTo = new URL(`${import.meta.env.BASE_URL}reset-password`, window.location.origin).href
      await requestPasswordReset(email.value.trim(), redirectTo)
      toast.success(t('auth.resetSent'))
      mode.value = 'signin'
      return
    }
    if (mode.value === 'signup') {
      await signUpWithEmail(name.value.trim(), email.value.trim(), password.value)
    } else {
      await signInWithEmail(email.value.trim(), password.value)
    }
    await refreshUser()
    if (!currentUser.value) throw new Error(t('auth.sessionFail'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('auth.signinFail'))
  } finally {
    submitting.value = false
  }
}

async function google() {
  try {
    await signInWithGoogle() // 성공 시 리다이렉트되므로 이후 코드는 실행되지 않을 수 있음
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('auth.googleFail'))
  }
}
</script>

<template>
  <slot v-if="!authEnabled || currentUser || bypassGate" />

  <div v-else-if="checking" class="flex min-h-screen items-center justify-center bg-slate-50">
    <Loader2 class="h-6 w-6 animate-spin text-slate-400" />
  </div>

  <div v-else class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <form class="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" @submit.prevent="submit">
      <div>
        <div class="flex items-start justify-between">
          <h1 class="text-xl font-bold text-slate-900">MobilPress</h1>
          <!-- 언어 전환 (기본: 인도네시아어) -->
          <div class="flex gap-0.5 rounded-md border border-slate-200 p-0.5">
            <button
              type="button"
              class="rounded px-1.5 py-1 text-xs font-semibold transition"
              :class="lang === 'id' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'"
              aria-label="Bahasa Indonesia"
              @click="setLang('id')"
            >
              🇮🇩
            </button>
            <button
              type="button"
              class="rounded px-1.5 py-1 text-xs font-semibold transition"
              :class="lang === 'ko' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'"
              aria-label="한국어"
              @click="setLang('ko')"
            >
              🇰🇷
            </button>
          </div>
        </div>
        <p class="mt-1 text-sm text-slate-500">
          {{ mode === 'signin' ? t('auth.subtitle.signin') : mode === 'signup' ? t('auth.subtitle.signup') : t('auth.subtitle.forgot') }}
        </p>
      </div>

      <input
        v-if="mode === 'signup'"
        v-model="name"
        type="text"
        required
        :placeholder="t('auth.name')"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      <input
        v-model="email"
        type="email"
        required
        :placeholder="t('auth.email')"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      <input
        v-if="mode !== 'forgot'"
        v-model="password"
        type="password"
        required
        minlength="8"
        :placeholder="t('auth.password')"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      <button
        type="submit"
        :disabled="submitting"
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
        {{ mode === 'signin' ? t('auth.signin') : mode === 'signup' ? t('auth.signup') : t('auth.sendReset') }}
      </button>

      <button
        v-if="mode !== 'forgot'"
        type="button"
        class="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50"
        @click="google"
      >
        {{ t('auth.google') }}
      </button>

      <p class="flex justify-center gap-3 text-center text-xs text-slate-500">
        <button v-if="mode !== 'signin'" type="button" class="underline" @click="mode = 'signin'">
          {{ t('auth.backToSignin') }}
        </button>
        <template v-else>
          <button type="button" class="underline" @click="mode = 'signup'">
            {{ t('auth.toSignup') }}
          </button>
          <button type="button" class="underline" @click="mode = 'forgot'">
            {{ t('auth.forgot') }}
          </button>
        </template>
      </p>
    </form>
  </div>
</template>
