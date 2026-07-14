// Neon Data API (PostgREST 호환) 클라이언트.
// apiFetch 의 '/mobil-press/...' 경로를 neon-js 쿼리 빌더 호출로 변환합니다.
// 인증 토큰(JWT)은 neon-js 클라이언트가 자동으로 첨부합니다.
// DB 컬럼은 snake_case, 앱 타입은 camelCase 이므로 여기서 양방향 매핑합니다.
import { AuthRequiredError } from '@neondatabase/neon-js'
import { buildSummary, jsonResponse as json } from '@/lib/api-helpers'
import { neon } from '@/lib/neon-auth'
import type { BudgetEntry, Customer, Installation, MobilPressData } from '@/lib/types'

// ── snake_case(DB) ↔ camelCase(앱) 매핑 ─────────────────────
type Row = Record<string, unknown>

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function rowToCamel<T>(row: Row): T {
  const out: Row = {}
  for (const [key, value] of Object.entries(row)) out[toCamel(key)] = value ?? ''
  return out as T
}

function formToSnake(form: Row): Row {
  const out: Row = {}
  for (const [key, value] of Object.entries(form)) {
    // date 컬럼에 빈 문자열은 넣을 수 없으므로 null 로 변환
    out[toSnake(key)] = value === '' && key.toLowerCase().includes('date') ? null : value
  }
  return out
}

// ── Data API 호출 ────────────────────────────────────────────
function requireClient() {
  if (!neon) {
    throw new Error(
      'VITE_NEON_DATA_API_URL / VITE_NEON_AUTH_URL 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.',
    )
  }
  return neon
}

function unwrap<T>(result: { data: unknown; error: { message?: string } | null }): T[] {
  if (result.error) {
    throw new Error(`Neon Data API 오류: ${result.error.message ?? JSON.stringify(result.error)}`)
  }
  return ((result.data ?? []) as Row[]).map((row) => rowToCamel<T>(row))
}

// ── 앱 경로('/mobil-press/...') 라우팅 ──────────────────────
export async function neonFetch(path: string, options?: RequestInit): Promise<Response> {
  const method = (options?.method ?? 'GET').toUpperCase()
  const body = typeof options?.body === 'string' ? (JSON.parse(options.body) as Row) : undefined

  try {
    const client = requireClient()

    if (path === '/mobil-press/data' && method === 'GET') {
      const [customers, installations, budgetEntries] = await Promise.all([
        client
          .from('customers')
          .select('*')
          .order('updated_at', { ascending: false })
          .then((r) => unwrap<Customer>(r)),
        client
          .from('installations')
          .select('*')
          .order('work_date', { ascending: false })
          .then((r) => unwrap<Installation>(r)),
        client
          .from('budget_entries')
          .select('*')
          .order('entry_date', { ascending: true })
          .then((r) => unwrap<BudgetEntry>(r)),
      ])
      const data: MobilPressData = {
        customers,
        installations,
        budgetEntries,
        summary: buildSummary(customers, installations),
      }
      return json(data)
    }

    for (const table of ['customers', 'installations', 'budget_entries'] as const) {
      if (path === `/mobil-press/${table}` && method === 'POST') {
        const rows = unwrap<Customer | Installation | BudgetEntry>(
          await client.from(table).insert(formToSnake(body ?? {})).select(),
        )
        return json(rows[0], 201)
      }

      const match = path.match(new RegExp(`^/mobil-press/${table}/([^/]+)$`))
      if (match) {
        const id = match[1]
        if (method === 'PATCH') {
          const rows = unwrap<Customer | Installation | BudgetEntry>(
            await client.from(table).update(formToSnake(body ?? {})).eq('id', id).select(),
          )
          return json(rows[0] ?? { error: '대상을 찾을 수 없습니다.' }, rows[0] ? 200 : 404)
        }
        if (method === 'DELETE') {
          unwrap(await client.from(table).delete().eq('id', id))
          return json({ ok: true })
        }
      }
    }

    return json({ error: `알 수 없는 요청입니다: ${method} ${path}` }, 404)
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return json({ error: '로그인이 필요합니다.' }, 401)
    }
    return json({ error: error instanceof Error ? error.message : 'Neon 요청에 실패했습니다.' }, 500)
  }
}
