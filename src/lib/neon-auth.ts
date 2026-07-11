// Neon Auth (Better Auth 기반) + Data API 통합 클라이언트.
// docs/NEON-SETUP.md 의 절차로 발급받은 URL 두 개(VITE_NEON_AUTH_URL,
// VITE_NEON_DATA_API_URL)만 있으면 동작합니다.
//
// - neon.auth.*  : 로그인 / 세션 관리 (Better Auth API)
// - neon.from()  : Data API(PostgREST) 쿼리 — JWT 가 자동으로 첨부됩니다.
import { createClient } from '@neondatabase/neon-js'

const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL ?? ''
const DATA_API_URL = import.meta.env.VITE_NEON_DATA_API_URL ?? ''

export const isNeonConfigured = Boolean(AUTH_URL && DATA_API_URL)

export const neon = isNeonConfigured
  ? createClient({
      auth: { url: AUTH_URL },
      dataApi: { url: DATA_API_URL },
    })
  : null

export interface AuthUser {
  id: string
  email: string
  name: string
}

/** 현재 로그인된 사용자를 반환합니다. 미로그인/미설정이면 null. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!neon) return null
  const { data } = await neon.auth.getSession()
  const user = data?.user
  return user ? { id: user.id, email: user.email, name: user.name } : null
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  if (!neon) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await neon.auth.signIn.email({ email, password })
  if (error) throw new Error(error.message ?? '로그인에 실패했습니다.')
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<void> {
  if (!neon) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await neon.auth.signUp.email({ name, email, password })
  if (error) throw new Error(error.message ?? '회원가입에 실패했습니다.')
}

/** Google 로그인 — Neon 콘솔 Auth 탭에서 Google provider 활성화가 필요합니다. */
export async function signInWithGoogle(): Promise<void> {
  if (!neon) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  await neon.auth.signIn.social({ provider: 'google', callbackURL: window.location.href })
}

export async function signOut(): Promise<void> {
  if (!neon) return
  await neon.auth.signOut()
}

/** 비밀번호 재설정 링크를 이메일로 발송합니다. 링크는 redirectTo?token=... 으로 옵니다. */
export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  if (!neon) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await neon.auth.requestPasswordReset({ email, redirectTo })
  if (error) throw new Error(error.message ?? '재설정 메일 발송에 실패했습니다.')
}

/** 이메일 링크의 token 으로 새 비밀번호를 설정합니다. */
export async function resetPassword(newPassword: string, token: string): Promise<void> {
  if (!neon) throw new Error('Neon 이 설정되지 않았습니다. docs/NEON-SETUP.md 를 참고하세요.')
  const { error } = await neon.auth.resetPassword({ newPassword, token })
  if (error) throw new Error(error.message ?? '비밀번호 재설정에 실패했습니다.')
}
