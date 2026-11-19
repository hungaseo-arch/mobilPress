<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { KeyRound, Loader2, Plus, Search, Trash2, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { apiFetch, dataMode } from '@/lib/api'
import { currentUser } from '@/lib/auth-state'
import { formatDateTime, formatDay, parseApi } from '@/lib/format'
import { t } from '@/lib/i18n'
import MemberFormModal from '@/components/MemberFormModal.vue'
import PasswordChangeModal from '@/components/PasswordChangeModal.vue'
import TablePagination from '@/components/TablePagination.vue'
import { usePagination } from '@/lib/pagination'
import { USER_ROLES, type MemberAccount, type MemberCreateForm, type UserRole } from '@/lib/types'

const loading = ref(true)
const savingId = ref('')
const deletingId = ref('')
const formOpen = ref(false)
const creating = ref(false)
const passwordOpen = ref(false)
const resettingId = ref('')
const members = ref<MemberAccount[]>([])
const query = ref('')
const roleFilter = ref<'' | UserRole>('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return members.value.filter((m) => {
    if (roleFilter.value && m.role !== roleFilter.value) return false
    if (!q) return true
    return m.email.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  })
})

const memberPage = usePagination(filtered, 15)

watch([query, roleFilter], () => memberPage.go(1))

// 역할별 인원 — 상단 요약 배지
const roleCounts = computed(() => {
  const counts: Record<UserRole, number> = { admin: 0, staff: 0, user: 0 }
  for (const m of members.value) counts[m.role] += 1
  return counts
})

/** 본인 계정은 권한을 바꿀 수 없다 — 마지막 admin 이 스스로 권한을 잃는 사고 방지(DB 정책과 동일). */
function isSelf(member: MemberAccount): boolean {
  return !!currentUser.value && member.userId === currentUser.value.id
}

async function load() {
  loading.value = true
  try {
    members.value = await parseApi<MemberAccount[]>(await apiFetch('/mobil-press/members'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('toast.loadFail'))
  } finally {
    loading.value = false
  }
}

async function createMember(form: MemberCreateForm) {
  if (creating.value) return
  creating.value = true
  try {
    await parseApi(
      await apiFetch('/mobil-press/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }),
    )
    formOpen.value = false
    toast.success(t('member.add.created'))
    roleFilter.value = ''
    query.value = ''
    await load()
  } catch (error) {
    // 실패 시 모달을 열어 둬 입력값을 보존한다.
    toast.error(error instanceof Error ? error.message : t('member.add.fail'))
  } finally {
    creating.value = false
  }
}

async function onRoleChange(member: MemberAccount, event: Event) {
  const select = event.target as HTMLSelectElement
  const next = select.value as UserRole
  const revert = () => {
    select.value = member.role
  }
  if (next === member.role) return
  if (!window.confirm(t('member.confirmRole', { name: member.email, role: t(`role.${next}`) }))) {
    revert()
    return
  }

  savingId.value = member.userId
  try {
    await parseApi(
      await apiFetch(`/mobil-press/members/${member.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: next }),
      }),
    )
    member.role = next
    toast.success(t('member.roleUpdated'))
  } catch (error) {
    revert()
    toast.error(error instanceof Error ? error.message : t('member.roleUpdateFail'))
  } finally {
    savingId.value = ''
  }
}

/** 본인 행은 현재 비밀번호 확인 후 직접 변경, 다른 회원은 재설정 링크를 그 회원의 이메일로 보낸다
 *  (인증 서버가 관리자의 타인 비밀번호 직접 변경을 허용하지 않으므로 회원이 링크로 직접 설정한다). */
async function onPasswordAction(member: MemberAccount) {
  if (isSelf(member)) {
    passwordOpen.value = true
    return
  }
  if (!window.confirm(t('member.pw.confirmReset', { name: member.email }))) return
  resettingId.value = member.userId
  try {
    if (dataMode === 'neon') {
      const { requestPasswordReset } = await import('@/lib/neon-auth')
      const redirectTo = new URL(`${import.meta.env.BASE_URL}reset-password`, window.location.origin).href
      await requestPasswordReset(member.email, redirectTo)
    }
    toast.success(t('member.pw.resetSent'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('member.pw.resetFail'))
  } finally {
    resettingId.value = ''
  }
}

async function confirmDelete(member: MemberAccount) {
  if (!window.confirm(t('member.confirmDelete', { name: member.email }))) return

  deletingId.value = member.userId
  try {
    await parseApi(await apiFetch(`/mobil-press/members/${member.userId}`, { method: 'DELETE' }))
    members.value = members.value.filter((m) => m.userId !== member.userId)
    toast.success(t('member.deleted'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('member.deleteFail'))
  } finally {
    deletingId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span
          v-for="r in USER_ROLES"
          :key="r"
          class="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-[13px] font-medium"
        >
          {{ t(`role.${r}`) }} <span class="tabular-nums text-foreground">{{ roleCounts[r] }}</span>
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active"
          @click="formOpen = true"
        >
          <Plus class="h-4 w-4" />
          {{ t('member.add') }}
        </button>
        <select
          v-model="roleFilter"
          class="h-9 rounded-md border border-border bg-card px-3 text-xs text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">{{ t('member.filterRole') }}</option>
          <option v-for="r in USER_ROLES" :key="r" :value="r">{{ t(`role.${r}`) }}</option>
        </select>
        <div class="relative w-48 sm:w-64">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="query"
            type="search"
            :placeholder="t('member.searchPlaceholder')"
            class="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-20 text-muted-foreground"
    >
      <Loader2 class="h-5 w-5 animate-spin" />
      {{ t('loading') }}
    </div>

    <section v-else class="rounded-lg border border-border bg-card">
      <p class="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">{{ t('member.hint') }}</p>
      <div class="overflow-x-auto">
        <table class="asm-table w-full min-w-180 text-left text-sm">
          <thead>
            <tr>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.account') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('auth.name') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('member.joinedAt') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('member.lastLogin') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('member.role') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 text-right font-medium">{{ t('th.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="6" class="px-4 py-14 text-center text-muted-foreground">
                <Users class="mx-auto mb-2 h-8 w-8 opacity-40" />
                {{ t('member.empty') }}
              </td>
            </tr>
            <tr
              v-for="member in memberPage.paged.value"
              :key="member.userId"
            >
              <td class="px-4 py-3 text-foreground">
                {{ member.email }}
                <span v-if="isSelf(member)" class="asm-badge asm-badge--info ml-1.5">
                  {{ t('member.self') }}
                </span>
              </td>
              <td class="px-4 py-3 text-muted-foreground">{{ member.name || '-' }}</td>
              <td class="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">{{ formatDay(member.createdAt) }}</td>
              <td class="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">{{ formatDateTime(member.lastLoginAt) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <select
                    :value="member.role"
                    :disabled="isSelf(member) || savingId === member.userId"
                    :title="isSelf(member) ? t('member.selfHint') : t('member.role')"
                    class="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-60"
                    @change="onRoleChange(member, $event)"
                  >
                    <option v-for="r in USER_ROLES" :key="r" :value="r">{{ t(`role.${r}`) }}</option>
                  </select>
                  <Loader2 v-if="savingId === member.userId" class="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <Loader2 v-if="resettingId === member.userId" class="h-4 w-4 animate-spin text-muted-foreground" />
                  <button
                    v-else
                    type="button"
                    class="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    :aria-label="isSelf(member) ? t('member.pw.change') : t('member.pw.sendReset')"
                    :title="isSelf(member) ? t('member.pw.change') : t('member.pw.sendReset')"
                    @click="onPasswordAction(member)"
                  >
                    <KeyRound class="h-4 w-4" />
                  </button>
                  <Loader2 v-if="deletingId === member.userId" class="h-4 w-4 animate-spin text-muted-foreground" />
                  <button
                    v-else-if="!isSelf(member)"
                    type="button"
                    class="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                    :aria-label="t('member.delete')"
                    :title="t('member.delete')"
                    @click="confirmDelete(member)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                  <span v-else :title="t('member.selfDeleteHint')" class="inline-block w-8 text-center text-xs text-muted-foreground"><span aria-hidden="true">-</span><span class="sr-only">{{ t('member.selfDeleteHint') }}</span></span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <TablePagination
        :page="memberPage.page.value"
        :page-count="memberPage.pageCount.value"
        :start="memberPage.start.value"
        :end="memberPage.end.value"
        :total="memberPage.total.value"
        @go="memberPage.go"
      />
    </section>
  
    <PasswordChangeModal v-if="passwordOpen" @close="passwordOpen = false" />
    <MemberFormModal v-if="formOpen" :saving="creating" @close="formOpen = false" @submit="createMember" />
  </div>
</template>
