<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { History, Loader2 } from 'lucide-vue-next'
import { apiFetch } from '@/lib/api'
import { parseApi } from '@/lib/format'
import { t } from '@/lib/i18n'
import TablePagination from '@/components/TablePagination.vue'
import { usePagination } from '@/lib/pagination'
import type { AccessLog, AuditLog } from '@/lib/types'

type SubTab = 'access' | 'audit'
const subTab = ref<SubTab>('access')
const subTabs = computed<{ key: SubTab; label: string }[]>(() => [
  { key: 'access', label: t('log.access') },
  { key: 'audit', label: t('log.audit') },
])

const loading = ref(true)
const accessLogs = ref<AccessLog[]>([])
const auditLogs = ref<AuditLog[]>([])

// 필터: 계정(이메일) + 기간 — 두 서브탭에 공통 적용
const selectedAccount = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const accounts = computed(() => {
  const emails = new Set<string>()
  for (const log of accessLogs.value) if (log.email) emails.add(log.email)
  for (const log of auditLogs.value) {
    const email = log.changedByEmail || log.changedBy
    if (email) emails.add(email)
  }
  return [...emails].sort()
})

function inDateRange(occurredAt: string): boolean {
  const date = occurredAt.slice(0, 10)
  if (dateFrom.value && date < dateFrom.value) return false
  if (dateTo.value && date > dateTo.value) return false
  return true
}

const filteredAccessLogs = computed(() =>
  accessLogs.value.filter(
    (log) => (!selectedAccount.value || log.email === selectedAccount.value) && inDateRange(log.occurredAt),
  ),
)

const filteredAuditLogs = computed(() =>
  auditLogs.value.filter((log) => {
    const email = log.changedByEmail || log.changedBy
    return (!selectedAccount.value || email === selectedAccount.value) && inDateRange(log.changedAt)
  }),
)

const accessPage = usePagination(filteredAccessLogs, 15)
const auditPage = usePagination(filteredAuditLogs, 15)

watch([selectedAccount, dateFrom, dateTo], () => {
  accessPage.go(1)
  auditPage.go(1)
})

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (!iso || Number.isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 세션별 체류시간(로그인~로그아웃) 계산. 로그아웃 행은 필터 기간 밖에 있을 수 있으므로
// 짝짓기는 전체 로그(accessLogs)를 기준으로 하고, 합계 표시만 필터된 목록을 사용한다.
const logoutBySession = computed(() => {
  const map = new Map<string, AccessLog>()
  for (const log of accessLogs.value) {
    if (log.event === 'logout' && log.sessionId) map.set(log.sessionId, log)
  }
  return map
})

function durationMsOf(log: AccessLog): number | null {
  if (log.event !== 'login' || !log.sessionId) return null
  const logout = logoutBySession.value.get(log.sessionId)
  if (!logout) return null
  const ms = new Date(logout.occurredAt).getTime() - new Date(log.occurredAt).getTime()
  return ms >= 0 ? ms : null
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}${t('unit.hour')} ${minutes}${t('unit.minute')}`
  return `${minutes}${t('unit.minute')}`
}

const totalDurationMs = computed(() =>
  filteredAccessLogs.value.reduce((sum, log) => sum + (durationMsOf(log) ?? 0), 0),
)

async function load() {
  loading.value = true
  try {
    const [access, audit] = await Promise.all([
      parseApi<AccessLog[]>(await apiFetch('/mobil-press/access-logs')),
      parseApi<AuditLog[]>(await apiFetch('/mobil-press/audit-logs')),
    ])
    accessLogs.value = access
    auditLogs.value = audit
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
      <nav class="flex flex-wrap gap-2">
        <button
          v-for="st in subTabs"
          :key="st.key"
          type="button"
          class="whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition"
          :class="
            subTab === st.key
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          "
          @click="subTab = st.key"
        >
          {{ st.label }}
        </button>
      </nav>

      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="selectedAccount"
          class="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{{ t('log.filterAccount') }}</option>
          <option v-for="email in accounts" :key="email" :value="email">{{ email }}</option>
        </select>
        <label class="flex items-center gap-1.5 text-sm text-muted-foreground">
          {{ t('log.from') }}
          <input
            v-model="dateFrom"
            type="date"
            class="rounded-md border border-border bg-input px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label class="flex items-center gap-1.5 text-sm text-muted-foreground">
          {{ t('log.to') }}
          <input
            v-model="dateTo"
            type="date"
            class="rounded-md border border-border bg-input px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-20 text-muted-foreground">
      <Loader2 class="h-5 w-5 animate-spin" />
      {{ t('loading') }}
    </div>

    <!-- 접속 기록 -->
    <section v-else-if="subTab === 'access'" class="rounded-xl border border-border bg-card">
      <div class="flex items-center justify-end border-b border-border px-4 py-2.5 text-sm text-muted-foreground">
        {{ t('log.durationTotal') }}: <span class="ml-1 font-semibold text-foreground">{{ formatDuration(totalDurationMs) }}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-220 text-left text-sm">
          <thead>
            <tr class="border-b border-border text-xs text-muted-foreground">
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.occurredAt') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.account') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('auth.name') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('form.category') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('log.duration') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">IP</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.device') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredAccessLogs.length">
              <td colspan="7" class="px-4 py-14 text-center text-muted-foreground">
                <History class="mx-auto mb-2 h-8 w-8 opacity-40" />
                {{ t('log.empty') }}
              </td>
            </tr>
            <tr
              v-for="log in accessPage.paged.value"
              :key="log.id"
              class="border-b border-border/60 align-top transition last:border-0 hover:bg-secondary/40"
            >
              <td class="whitespace-nowrap px-4 py-3 tabular-nums text-foreground">{{ formatDateTime(log.occurredAt) }}</td>
              <td class="px-4 py-3 text-foreground">{{ log.email || '-' }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ log.userName || '-' }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ log.event }}</td>
              <td class="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                <template v-if="log.event === 'login'">
                  {{ durationMsOf(log) !== null ? formatDuration(durationMsOf(log)!) : t('log.stillActive') }}
                </template>
                <template v-else>-</template>
              </td>
              <td class="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">{{ log.ipAddress || '-' }}</td>
              <td class="max-w-55 truncate px-4 py-3 text-muted-foreground" :title="log.userAgent">{{ log.userAgent || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <TablePagination
        :page="accessPage.page.value"
        :page-count="accessPage.pageCount.value"
        :start="accessPage.start.value"
        :end="accessPage.end.value"
        :total="accessPage.total.value"
        @go="accessPage.go"
      />
    </section>

    <!-- 변경 이력 -->
    <section v-else class="rounded-xl border border-border bg-card">
      <div class="overflow-x-auto">
        <table class="w-full min-w-140 text-left text-sm">
          <thead>
            <tr class="border-b border-border text-xs text-muted-foreground">
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.occurredAt') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.account') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.targetTable') }}</th>
              <th scope="col" class="whitespace-nowrap px-4 py-3 font-medium">{{ t('th.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredAuditLogs.length">
              <td colspan="4" class="px-4 py-14 text-center text-muted-foreground">
                <History class="mx-auto mb-2 h-8 w-8 opacity-40" />
                {{ t('log.empty') }}
              </td>
            </tr>
            <tr
              v-for="log in auditPage.paged.value"
              :key="log.id"
              class="border-b border-border/60 align-top transition last:border-0 hover:bg-secondary/40"
            >
              <td class="whitespace-nowrap px-4 py-3 tabular-nums text-foreground">{{ formatDateTime(log.changedAt) }}</td>
              <td class="px-4 py-3 text-foreground">{{ log.changedByEmail || log.changedBy }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ log.tableName }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ log.action }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <TablePagination
        :page="auditPage.page.value"
        :page-count="auditPage.pageCount.value"
        :start="auditPage.start.value"
        :end="auditPage.end.value"
        :total="auditPage.total.value"
        @go="auditPage.go"
      />
    </section>
  </div>
</template>
