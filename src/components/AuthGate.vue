<script setup lang="ts">
// Neon 모드에서만 동작하는 로그인 게이트.
// mock/proxy 모드이거나 Neon 미설정이면 앱을 그대로 통과시킵니다.
// 로그아웃 버튼은 HomeView 헤더에 있습니다 (auth-state.ts 공유).
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { authEnabled, currentUser, refreshUser } from '@/lib/auth-state'
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
      toast.success('재설정 링크를 이메일로 보냈습니다. 메일함을 확인하세요.')
      mode.value = 'signin'
      return
    }
    if (mode.value === 'signup') {
      await signUpWithEmail(name.value.trim(), email.value.trim(), password.value)
    } else {
      await signInWithEmail(email.value.trim(), password.value)
    }
    await refreshUser()
    if (!currentUser.value) throw new Error('세션을 가져오지 못했습니다. 다시 시도해주세요.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '로그인에 실패했습니다.')
  } finally {
    submitting.value = false
  }
}

async function google() {
  try {
    await signInWithGoogle() // 성공 시 리다이렉트되므로 이후 코드는 실행되지 않을 수 있음
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Google 로그인에 실패했습니다.')
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
        <h1 class="text-xl font-bold text-slate-900">MobilPress</h1>
        <p class="mt-1 text-sm text-slate-500">
          {{
            mode === 'signin'
              ? '팀 계정으로 로그인하세요.'
              : mode === 'signup'
                ? '새 계정을 만듭니다.'
                : '가입한 이메일로 재설정 링크를 보내드립니다.'
          }}
        </p>
      </div>

      <input
        v-if="mode === 'signup'"
        v-model="name"
        type="text"
        required
        placeholder="이름"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      <input
        v-model="email"
        type="email"
        required
        placeholder="이메일"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      <input
        v-if="mode !== 'forgot'"
        v-model="password"
        type="password"
        required
        minlength="8"
        placeholder="비밀번호 (8자 이상)"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      <button
        type="submit"
        :disabled="submitting"
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
        {{ mode === 'signin' ? '로그인' : mode === 'signup' ? '회원가입' : '재설정 링크 발송' }}
      </button>

      <button
        v-if="mode !== 'forgot'"
        type="button"
        class="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50"
        @click="google"
      >
        Google 로 계속하기
      </button>

      <p class="flex justify-center gap-3 text-center text-xs text-slate-500">
        <button
          v-if="mode !== 'signin'"
          type="button"
          class="underline"
          @click="mode = 'signin'"
        >
          로그인으로 돌아가기
        </button>
        <template v-else>
          <button type="button" class="underline" @click="mode = 'signup'">
            계정이 없나요? 회원가입
          </button>
          <button type="button" class="underline" @click="mode = 'forgot'">
            비밀번호를 잊으셨나요?
          </button>
        </template>
      </p>
    </form>
  </div>
</template>
