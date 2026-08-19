// AuthGate(로그인 화면)와 HomeView 헤더(로그아웃 버튼)가 공유하는 세션 상태.
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { isNeonConfigured } from '@/lib/neon-config'
import { dataMode } from '@/lib/api'
import type { AuthUser } from '@/lib/neon-auth'

/** Neon 모드 + 설정 완료일 때만 로그인 게이트가 동작합니다. */
export const authEnabled = dataMode === 'neon' && isNeonConfigured

export const currentUser = ref<AuthUser | null>(null)

/** DB 의 user_roles 테이블 기준 역할. 행이 없으면 'user'(조회 전용).
 *  외부에서는 직접 변경하지 말고 canEdit/canDelete 를 사용하세요. */
type Role = 'admin' | 'staff' | 'user'
const userRole = ref<Role>('user')

/** 데이터 입력/수정 가능 여부 (staff 이상). mock/proxy 모드에서는 항상 허용. */
export const canEdit = computed(() => !authEnabled || userRole.value !== 'user')

/** 데이터 삭제 가능 여부 (admin 만). mock/proxy 모드에서는 항상 허용. */
export const canDelete = computed(() => !authEnabled || userRole.value === 'admin')

/** 로그 조회 등 관리자 전용 화면 노출 여부. mock/proxy 모드에서는 항상 허용. */
export const isAdmin = computed(() => !authEnabled || userRole.value === 'admin')

/** 현재 역할. 로그인 게이트가 꺼진 mock/proxy 모드에서는 admin 으로 간주합니다. */
export const role = computed<Role>(() => (authEnabled ? userRole.value : 'admin'))

// ── 작업보고서(스캔 PDF) 권한 정책 ──────────────────────────
// 정책을 바꿀 때는 아래 표만 수정하면 화면 전체에 반영됩니다.
//   view     : 미리보기(Drive 임베드 뷰어)로 열람
//   download : 파일 내려받기 — 파일이 사외로 반출되므로 staff 이상
//   upload   : 신규 첨부 / 교체
//   unlink   : 첨부 해제 (Drive 원본은 보존, DB 링크만 해제) — admin 전용
export interface ReportPermissions {
  view: boolean
  download: boolean
  upload: boolean
  unlink: boolean
}

const REPORT_POLICY: Record<Role, ReportPermissions> = {
  admin: { view: true, download: true, upload: true, unlink: true },
  staff: { view: true, download: true, upload: true, unlink: false },
  user: { view: true, download: false, upload: false, unlink: false },
}

export const reportPerms = computed<ReportPermissions>(() => REPORT_POLICY[role.value])
export const canViewReport = computed(() => reportPerms.value.view)
export const canDownloadReport = computed(() => reportPerms.value.download)
export const canUploadReport = computed(() => reportPerms.value.upload)
export const canUnlinkReport = computed(() => reportPerms.value.unlink)

export async function refreshUser(): Promise<void> {
  if (!authEnabled) return
  const { getCurrentUser, getNeonClient } = await import('@/lib/neon-auth')
  currentUser.value = await getCurrentUser()
  userRole.value = 'user'
  const client = currentUser.value ? getNeonClient() : null
  if (client) {
    // RLS 가 본인 행만 보여주므로 필터 없이 첫 행을 읽으면 됩니다.
    const { data, error } = await client.from('user_roles').select('role').limit(1)
    if (error) {
      // 조용히 user 로 남으면 원인을 알 수 없으므로 화면에 노출합니다.
      // (흔한 원인: Data API 의 Refresh schema cache 미실행, schema.sql 미적용)
      toast.error(`권한(user_roles) 조회 실패: ${error.message ?? JSON.stringify(error)}`)
      console.error('[auth-state] user_roles 조회 실패:', error)
      return
    }
    const role = (data as { role?: string }[] | null)?.[0]?.role
    if (role === 'admin' || role === 'staff') userRole.value = role
  }
}

export async function logout(): Promise<void> {
  if (!authEnabled) return
  const { signOut } = await import('@/lib/neon-auth')
  await signOut()
  currentUser.value = null
  userRole.value = 'user'
}
