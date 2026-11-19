// Neon Auth (Better Auth 기반) + Data API 통합 클라이언트.
// docs/NEON-SETUP.md 의 절차로 발급받은 URL 두 개(VITE_NEON_AUTH_URL,
// VITE_NEON_DATA_API_URL)만 있으면 동작합니다.
//
// 이 모듈은 @neondatabase/neon-js SDK 를 정적 import 하므로, 이 모듈 자체를
// 정적 import 하는 곳이 없어야 mock/proxy 모드 번들에서 SDK 청크가 빠집니다.
// 호출부는 항상 동적 import(`await import('@/lib/neon-auth')`)로 접근하세요.
//
// - client.auth.*  : 로그인 / 세션 관리 (Better Auth API)
// - client.from()  : Data API(PostgREST) 쿼리 — JWT 가 자동으로 첨부됩니다.
import { createClient } from '@neondatabase/neon-js'
import { NEON_AUTH_URL, NEON_DATA_API_URL, isNeonConfigured } from '@/lib/neon-config'

export { isNeonConfigured }

// createClient 는 오버로드된 제네릭 함수라 ReturnType<typeof createClient> 로는 실제 호출과
// 같은 타입을 얻을 수 없습니다. 동일한 인자 형태로 감싼 함수의 반환 타입을 사용합니다.
function createNeonClient() {
  return createClient({
    auth: { url: NEON_AUTH_URL },
    dataApi: { url: NEON_DATA_API_URL },
  })
}
type NeonClient = ReturnType<typeof createNeonClient>

let client: NeonClient | null = null

/** Neon 클라이언트를 지연 생성합니다. 미설정이면 null. */
export function getNeonClient(): NeonClient | null {
  if (!isNeonConfigured) return null
  if (!client) {
    client = createNeonClient()
  }
  return client
}

export interface AuthUser {
  id: string
  email: string
  name: string
}

/** 현재 로그인된 사용자를 반환합니다. 미로그인/미설정이면 null. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = getNeonClient()
  if (!client) return null
  const { data } = await client.auth.getSession()
  const user = data?.user
  return user ? { id: user.id, email: user.email, name: user.name } : null
}

/**
 * Data API 호출에 쓰이는 JWT 를 반환합니다. Apps Script 가 이 토큰으로
 * user_roles 를 조회해 서버 측에서 역할을 재검증합니다(화면 권한은 UX 일 뿐).
 * neon-js 가 토큰을 내부에서만 다루므로 방어적으로 접근하고, 실패 시 null 입니다.
 */
export async function getAuthToken(): Promise<string | null> {
  const client = getNeonClient()
  if (!client) return null
  try {
    const auth = client.auth as unknown as {
      getToken?: () => Promise<{ data?: { token?: string } | null }>
    }
    if (typeof auth.getToken !== 'function') return null
    const result = await auth.getToken()
    return result?.data?.token ?? null
  } catch {
    return null
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const client = getNeonClient()
  if (!client) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await client.auth.signIn.email({ email, password })
  if (error) throw new Error(error.message ?? '로그인에 실패했습니다.')
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<void> {
  const client = getNeonClient()
  if (!client) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await client.auth.signUp.email({ name, email, password })
  if (error) throw new Error(error.message ?? '회원가입에 실패했습니다.')
}

/**
 * 관리자가 다른 사람의 계정을 만든다. client.auth.signUp.email 은 가입 직후 그 계정으로
 * 로그인해 버려 관리자 세션을 갈아치우므로 쓰지 않고, 인증 서버의 가입 엔드포인트를
 * 쿠키·토큰 없이(credentials: 'omit') 직접 호출한다 — 관리자 세션은 그대로 유지된다.
 * 새 계정의 user id 를 반환하며, 응답에 id 가 없으면 빈 문자열이다.
 */
export async function createAccountAsAdmin(name: string, email: string, password: string): Promise<string> {
  if (!isNeonConfigured) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const response = await fetch(`${NEON_AUTH_URL.replace(/\/$/, '')}/sign-up/email`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const payload = (await response.json().catch(() => null)) as {
    user?: { id?: string }
    message?: string
  } | null
  if (!response.ok) throw new Error(payload?.message ?? '계정 등록에 실패했습니다.')
  return payload?.user?.id ?? ''
}

/** Google 로그인 — Neon 콘솔 Auth 탭에서 Google provider 활성화가 필요합니다. */
export async function signInWithGoogle(): Promise<void> {
  const client = getNeonClient()
  if (!client) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  await client.auth.signIn.social({ provider: 'google', callbackURL: window.location.href })
}

export async function signOut(): Promise<void> {
  const client = getNeonClient()
  if (!client) return
  await client.auth.signOut()
}

/** 비밀번호 재설정 링크를 이메일로 발송합니다. 링크는 redirectTo?token=... 으로 옵니다. */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  const client = getNeonClient()
  if (!client) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await client.auth.requestPasswordReset({ email, redirectTo })
  if (error) throw new Error(error.message ?? '재설정 메일 발송에 실패했습니다.')
}

/** 로그인한 본인의 비밀번호를 현재 비밀번호 확인 후 바꿉니다. */
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const client = getNeonClient()
  if (!client) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await client.auth.changePassword({ currentPassword, newPassword })
  if (error) throw new Error(error.message ?? '비밀번호 변경에 실패했습니다.')
}

/** 이메일 링크의 token 으로 새 비밀번호를 설정합니다. */
export async function resetPassword(newPassword: string, token: string): Promise<void> {
  const client = getNeonClient()
  if (!client) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await client.auth.resetPassword({ newPassword, token })
  if (error) throw new Error(error.message ?? '비밀번호 재설정에 실패했습니다.')
}
