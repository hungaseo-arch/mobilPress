<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Search, Trash2, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { apiFetch } from '@/lib/api'
import { currentUser } from '@/lib/auth-state'
import { formatDateTime, formatDay, parseApi } from '@/lib/format'
import { t } from '@/lib/i18n'
import TablePagination from '@/components/TablePagination.vue'
import { usePagination } from '@/lib/pagination'
import { USER_ROLES, type MemberAccount, type UserRole } from '@/lib/types'

const loading = ref(true)
const savingId = ref('')
const deletingId = ref('')
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
        <select
          v-model="roleFilter"
          class="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
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
            class="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-20 text-muted-foreground"
    >
      <Loader2 class="h-5 w-5 animate-spin" />
      {{ t('loading') }}
    </div>

    <section v-else class="rounded-xl border border-border bg-card">
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
                    class="h-8 rounded-md border border-border bg-card px-2.5 text-sm text-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-60"
                    @change="onRoleChange(member, $event)"
                  >
                    <option v-for="r in USER_ROLES" :key="r" :value="r">{{ t(`role.${r}`) }}</option>
                  </select>
                  <Loader2 v-if="savingId === member.userId" class="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end">
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
                  <span v-else :title="t('member.selfDeleteHint')" class="text-xs text-muted-foreground">-</span>
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
  </div>
</template>
