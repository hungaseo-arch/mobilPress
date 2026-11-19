<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import BaseModal from '@/components/BaseModal.vue'
import { t } from '@/lib/i18n'
import { USER_ROLES, type MemberCreateForm } from '@/lib/types'

defineProps<{ saving: boolean }>()

const emit = defineEmits<{
  close: []
  submit: [form: MemberCreateForm]
}>()

// 기본 역할은 가입 기본값과 같은 조회 전용(user) — 권한을 넓히는 쪽은 admin 이 의식적으로 고르게 한다.
const form = reactive<MemberCreateForm>({ name: '', email: '', password: '', role: 'user' })

// 초기 비밀번호는 관리자가 회원에게 직접 전달해야 하므로, 입력한 값을 확인할 수 있게 보기 전환을 둔다.
const showPassword = ref(false)

function onSubmit() {
  if (!form.name.trim() || !form.email.trim() || form.password.length < 8) return
  emit('submit', { ...form, name: form.name.trim(), email: form.email.trim() })
}

const inputClass =
  'w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground'
</script>

<template>
  <BaseModal :title="t('member.add.title')" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label :class="labelClass" for="memberName">{{ t('auth.name') }}</label>
        <input id="memberName" v-model="form.name" :class="inputClass" required autocomplete="off" />
      </div>
      <div>
        <label :class="labelClass" for="memberEmail">{{ t('auth.email') }}</label>
        <input id="memberEmail" v-model="form.email" type="email" :class="inputClass" required autocomplete="off" />
      </div>
      <div>
        <label :class="labelClass" for="memberPassword">{{ t('member.add.password') }}</label>
        <div class="relative">
          <input
            id="memberPassword"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            minlength="8"
            :class="[inputClass, 'pr-10']"
            required
            autocomplete="new-password"
          />
          <button
            type="button"
            class="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            :aria-label="showPassword ? t('member.add.hidePassword') : t('member.add.showPassword')"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="h-4 w-4" />
            <Eye v-else class="h-4 w-4" />
          </button>
        </div>
      </div>
      <div>
        <label :class="labelClass" for="memberRole">{{ t('member.role') }}</label>
        <select id="memberRole" v-model="form.role" :class="inputClass">
          <option v-for="r in USER_ROLES" :key="r" :value="r">{{ t(`role.${r}`) }}</option>
        </select>
      </div>
      <p class="text-xs text-muted-foreground">{{ t('member.add.note') }}</p>

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
          {{ saving ? t('btn.saving') : t('btn.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
