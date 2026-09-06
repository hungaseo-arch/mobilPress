// 일정 시간 활동이 없으면 자동 로그아웃합니다.
//
// 배경: 접속 기록(access_logs)의 logout 행은 neon_auth."session" 이 삭제될 때 트리거로
// 남습니다(db/schema.sql). 사용자가 로그아웃 버튼을 누르지 않고 탭만 닫으면 세션이 그대로
// 남아 체류시간이 계속 "접속 중"으로 표시됐습니다. 자동 로그아웃이 signOut() 을 호출하면
// 세션이 지워지므로 logout 행도 정상적으로 기록됩니다.
//
// 마지막 활동 시각은 setTimeout 이 아니라 **타임스탬프**로 관리합니다. 그래야
//   - 노트북 절전/탭 백그라운드로 타이머가 지연돼도 실제 경과 시간대로 판정되고,
//   - localStorage 를 통해 여러 탭이 같은 시각을 공유합니다(한 탭에서 작업 중이면 유지).
import { watch } from 'vue'
import { toast } from 'vue-sonner'
import { authEnabled, currentUser, logout } from '@/lib/auth-state'
import { t } from '@/lib/i18n'

/** 무활동 허용 시간. 이 값만 바꾸면 정책 전체가 바뀝니다. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30분
/** 자동 로그아웃 예고 시점(남은 시간). */
const WARN_BEFORE_MS = 60 * 1000 // 1분 전
/** 판정 주기 겸 localStorage 기록 간격 — 매 이벤트마다 쓰지 않기 위한 스로틀. */
const TICK_MS = 15 * 1000

const STORAGE_KEY = 'mobilpress-last-activity'

// localStorage 가 막힌 환경(사생활 보호 모드 등)에서도 동작하도록 메모리 값을 함께 둡니다.
let lastActivityAt = Date.now()

function readLastActivity(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? Number(raw) : NaN
    // 다른 탭이 더 최근에 활동했다면 그 시각을 따릅니다.
    return Number.isFinite(parsed) ? Math.max(parsed, lastActivityAt) : lastActivityAt
  } catch {
    return lastActivityAt
  }
}

function writeLastActivity(at: number): void {
  lastActivityAt = at
  try {
    window.localStorage.setItem(STORAGE_KEY, String(at))
  } catch {
    // 저장 실패해도 이 탭의 메모리 값으로 계속 동작합니다.
  }
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'] as const

let timer: ReturnType<typeof setInterval> | null = null
let warned = false
let signingOut = false

function markActive(): void {
  const now = Date.now()
  // 스로틀: 마지막 기록에서 TICK_MS 가 지났을 때만 실제로 저장합니다.
  if (now - lastActivityAt < TICK_MS) return
  warned = false
  writeLastActivity(now)
}

function onVisible(): void {
  // 절전에서 깨어나거나 탭으로 돌아온 순간 곧바로 판정합니다(다음 tick 을 기다리지 않음).
  if (document.visibilityState === 'visible') check()
}

async function check(): Promise<void> {
  if (signingOut || !currentUser.value) return
  const idleMs = Date.now() - readLastActivity()

  if (idleMs >= IDLE_TIMEOUT_MS) {
    signingOut = true
    try {
      await logout()
      toast.info(t('auth.idleLogout'))
    } finally {
      signingOut = false
      stop()
    }
    return
  }

  if (!warned && idleMs >= IDLE_TIMEOUT_MS - WARN_BEFORE_MS) {
    warned = true
    toast.warning(t('auth.idleWarn'))
  }
}

function start(): void {
  if (timer) return
  warned = false
  writeLastActivity(Date.now())
  for (const event of ACTIVITY_EVENTS) {
    window.addEventListener(event, markActive, { passive: true })
  }
  document.addEventListener('visibilitychange', onVisible)
  timer = setInterval(check, TICK_MS)
}

function stop(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  for (const event of ACTIVITY_EVENTS) {
    window.removeEventListener(event, markActive)
  }
  document.removeEventListener('visibilitychange', onVisible)
}

/**
 * 자동 로그아웃 감시를 시작합니다. 로그인 게이트(AuthGate)에서 한 번만 호출하세요.
 * mock/proxy 모드처럼 로그인이 없는 환경에서는 아무 일도 하지 않습니다.
 */
export function startIdleLogout(): void {
  if (!authEnabled) return
  watch(currentUser, (user) => (user ? start() : stop()), { immediate: true })
}
