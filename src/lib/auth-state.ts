// AuthGate(로그인 화면)와 HomeView 헤더(로그아웃 버튼)가 공유하는 세션 상태.
import { computed, ref } from 'vue'
import { type AuthUser, getCurrentUser, isNeonConfigured, neon, signOut } from '@/lib/neon-auth'
import { dataMode } from '@/lib/api'

/** Neon 모드 + 설정 완료일 때만 로그인 게이트가 동작합니다. */
export const authEnabled = dataMode === 'neon' && isNeonConfigured

export const currentUser = ref<AuthUser | null>(null)

/** DB 의 user_roles 테이블 기준 역할. 행이 없으면 'user'(조회 전용). */
export type Role = 'staff' | 'user'
export const userRole = ref<Role>('user')

/** 데이터 입력/수정/삭제 가능 여부. mock/proxy 모드에서는 항상 허용. */
export const canEdit = computed(() => !authEnabled || userRole.value === 'staff')

export async function refreshUser(): Promise<void> {
  if (!authEnabled) return
  currentUser.value = await getCurrentUser()
  userRole.value = 'user'
  if (currentUser.value && neon) {
    // RLS 가 본인 행만 보여주므로 필터 없이 첫 행을 읽으면 됩니다.
    const { data, error } = await neon.from('user_roles').select('role').limit(1)
    if (error) {
      // 조용히 user 로 남으면 원인을 알 수 없으므로 화면에 노출합니다.
      // (흔한 원인: Data API 의 Refresh schema cache 미실행, schema.sql 미적용)
      const { toast } = await import('vue-sonner')
      toast.error(`권한(user_roles) 조회 실패: ${error.message ?? JSON.stringify(error)}`)
      console.error('[auth-state] user_roles 조회 실패:', error)
      return
    }
    const role = (data as { role?: string }[] | null)?.[0]?.role
    if (role === 'staff') userRole.value = 'staff'
  }
}

export async function logout(): Promise<void> {
  await signOut()
  currentUser.value = null
  userRole.value = 'user'
}
