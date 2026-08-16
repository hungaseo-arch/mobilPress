// 내장 mock API — 백엔드(VITE_API_PROXY_TARGET) 없이 앱이 완전 독립 동작하도록
// /api/mobil-press/* 요청을 브라우저 localStorage 기반 저장소로 처리합니다.
import { buildSummary, jsonResponse as json } from '@/lib/api-helpers'
import type {
  AccessLog,
  AuditLog,
  BudgetEntry,
  BudgetEntryForm,
  Customer,
  CustomerForm,
  Installation,
  InstallationForm,
  MobilPressData,
} from '@/lib/types'

// mock 모드 전용 더미 로그 — 로그 탭이 비어 보이지 않도록 화면 확인용으로만 사용합니다.
const mockAccessLogs: AccessLog[] = [
  {
    id: 1,
    userId: 'mock-user-1',
    email: 'admin@ptascendo.com',
    userName: 'Admin Demo',
    event: 'login',
    ipAddress: '203.0.113.10',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0',
    occurredAt: '2026-08-14T02:15:00.000Z',
    sessionId: 'mock-user-1:2026-08-14T02:15:00.000Z',
  },
  {
    id: 2,
    userId: 'mock-user-2',
    email: 'firman@ptascendo.com',
    userName: 'Firman',
    event: 'login',
    ipAddress: '203.0.113.24',
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/128.0 Mobile',
    occurredAt: '2026-08-13T10:00:00.000Z',
    sessionId: 'mock-user-2:2026-08-13T10:00:00.000Z',
  },
  {
    id: 3,
    userId: 'mock-user-2',
    email: 'firman@ptascendo.com',
    userName: 'Firman',
    event: 'logout',
    ipAddress: '203.0.113.24',
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/128.0 Mobile',
    occurredAt: '2026-08-13T18:05:00.000Z',
    sessionId: 'mock-user-2:2026-08-13T10:00:00.000Z',
  },
  {
    id: 4,
    userId: 'mock-user-3',
    email: 'arun@ptascendo.com',
    userName: 'Arun',
    event: 'login',
    ipAddress: '203.0.113.31',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1',
    occurredAt: '2026-08-12T09:12:00.000Z',
    sessionId: 'mock-user-3:2026-08-12T09:12:00.000Z',
  },
]

const mockAuditLogs: AuditLog[] = [
  {
    id: 1,
    tableName: 'installations',
    recordId: 'mock-installation-1',
    action: 'insert',
    changedBy: 'mock-user-2',
    changedByEmail: 'firman@ptascendo.com',
    changedAt: '2026-08-13T18:00:00.000Z',
  },
  {
    id: 2,
    tableName: 'budget_entries',
    recordId: 'mock-budget-1',
    action: 'update',
    changedBy: 'mock-user-1',
    changedByEmail: 'admin@ptascendo.com',
    changedAt: '2026-08-12T11:30:00.000Z',
  },
  {
    id: 3,
    tableName: 'customers',
    recordId: 'mock-customer-1',
    action: 'insert',
    changedBy: 'mock-user-1',
    changedByEmail: 'admin@ptascendo.com',
    changedAt: '2026-08-10T08:20:00.000Z',
  },
]

const STORAGE_KEY = 'mobilpress-data-v1'

interface StoredData {
  customers: Customer[]
  installations: Installation[]
  budgetEntries: BudgetEntry[]
}

function loadStore(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredData>
      return {
        customers: parsed.customers ?? [],
        installations: parsed.installations ?? [],
        budgetEntries: parsed.budgetEntries ?? [],
      }
    }
  } catch {
    // 손상된 데이터는 무시하고 빈 저장소로 시작
  }
  return { customers: [], installations: [], budgetEntries: [] }
}

function saveStore(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * mock 라우터. apiFetch 가 넘겨준 경로('/mobil-press/...')와 RequestInit 를 받아
 * 실제 백엔드와 같은 형태의 Response 를 돌려줍니다.
 */
export async function mockFetch(path: string, options?: RequestInit): Promise<Response> {
  const method = (options?.method ?? 'GET').toUpperCase()
  const body = typeof options?.body === 'string' ? JSON.parse(options.body) : undefined
  const store = loadStore()
  const now = new Date().toISOString()

  if (path === '/mobil-press/access-logs' && method === 'GET') {
    return json(mockAccessLogs)
  }

  if (path === '/mobil-press/audit-logs' && method === 'GET') {
    return json(mockAuditLogs)
  }

  if (path === '/mobil-press/data' && method === 'GET') {
    const data: MobilPressData = {
      customers: [...store.customers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      installations: [...store.installations].sort((a, b) => b.workDate.localeCompare(a.workDate)),
      budgetEntries: [...store.budgetEntries].sort((a, b) => (a.entryDate || '').localeCompare(b.entryDate || '')),
      summary: buildSummary(store.customers, store.installations),
    }
    return json(data)
  }

  if (path === '/mobil-press/customers' && method === 'POST') {
    const customer: Customer = { ...(body as CustomerForm), id: createId(), createdAt: now, updatedAt: now }
    store.customers.push(customer)
    saveStore(store)
    return json(customer, 201)
  }

  const customerMatch = path.match(/^\/mobil-press\/customers\/([^/]+)$/)
  if (customerMatch) {
    const index = store.customers.findIndex((c) => c.id === customerMatch[1])
    if (index === -1) return json({ error: '고객을 찾을 수 없습니다.' }, 404)
    if (method === 'PATCH') {
      store.customers[index] = { ...store.customers[index], ...(body as Partial<CustomerForm>), updatedAt: now }
      saveStore(store)
      return json(store.customers[index])
    }
    if (method === 'DELETE') {
      store.customers.splice(index, 1)
      saveStore(store)
      return json({ ok: true })
    }
  }

  if (path === '/mobil-press/installations' && method === 'POST') {
    const installation: Installation = { ...(body as InstallationForm), id: createId(), createdAt: now, updatedAt: now }
    store.installations.push(installation)
    saveStore(store)
    return json(installation, 201)
  }

  const installationMatch = path.match(/^\/mobil-press\/installations\/([^/]+)$/)
  if (installationMatch) {
    const index = store.installations.findIndex((i) => i.id === installationMatch[1])
    if (index === -1) return json({ error: '장착 정보를 찾을 수 없습니다.' }, 404)
    if (method === 'PATCH') {
      store.installations[index] = {
        ...store.installations[index],
        ...(body as Partial<InstallationForm>),
        updatedAt: now,
      }
      saveStore(store)
      return json(store.installations[index])
    }
    if (method === 'DELETE') {
      store.installations.splice(index, 1)
      saveStore(store)
      return json({ ok: true })
    }
  }

  if (path === '/mobil-press/budget_entries' && method === 'POST') {
    const entry: BudgetEntry = { ...(body as BudgetEntryForm), id: createId(), createdAt: now, updatedAt: now }
    store.budgetEntries.push(entry)
    saveStore(store)
    return json(entry, 201)
  }

  const budgetMatch = path.match(/^\/mobil-press\/budget_entries\/([^/]+)$/)
  if (budgetMatch) {
    const index = store.budgetEntries.findIndex((b) => b.id === budgetMatch[1])
    if (index === -1) return json({ error: '예산 항목을 찾을 수 없습니다.' }, 404)
    if (method === 'PATCH') {
      store.budgetEntries[index] = {
        ...store.budgetEntries[index],
        ...(body as Partial<BudgetEntryForm>),
        updatedAt: now,
      }
      saveStore(store)
      return json(store.budgetEntries[index])
    }
    if (method === 'DELETE') {
      store.budgetEntries.splice(index, 1)
      saveStore(store)
      return json({ ok: true })
    }
  }

  return json({ error: `알 수 없는 요청입니다: ${method} ${path}` }, 404)
}
