// 조회 전용(user) 계정 마스킹 — 금액·고객명·위치를 가려서 표시합니다.
//
// 정책은 auth-state.ts 의 maskSensitive 한 곳에서만 정하고, 화면은 아래 helper 로
// 값을 감쌉니다(마스킹 대상이 아니면 원래 서식 함수와 동일하게 동작).
//
// ⚠️ 한계 — 이것은 "화면 표시" 마스킹입니다. Data API 응답에는 원값이 그대로 들어오므로
//    개발자도구로 열어보면 확인할 수 있습니다. 서버에서 실제로 감추려면 조회 전용 역할용
//    별도 뷰(금액·고객명 컬럼 제외)를 만들어 RLS 로 분기해야 합니다.
import { maskSensitive } from '@/lib/auth-state'
import { formatIDR, formatPercent } from '@/lib/format'

const DOT = '•'

/** 형태 자체를 감춰야 하는 값(좌표·비율 등)의 고정 대체 문자 */
export const MASKED = DOT.repeat(4)

/** 마스킹된 금액 표기 — 자릿수(금액 규모)까지 감추기 위해 길이를 고정합니다. */
export const MASKED_IDR = `Rp ${DOT.repeat(6)}`

/** 이름·회사명·지역 — 단어별 첫 글자만 남깁니다 ('PT. Astra Jaya' → 'P•• A•••• J•••').
 *  행마다 다른 모양이 남으므로 표의 행 구분·순위 비교는 그대로 유지됩니다. */
function maskWords(value: string): string {
  return (value ?? '')
    .split(/(\s+)/)
    .map((part) => (part && !/\s/.test(part) ? part[0] + DOT.repeat(part.length - 1) : part))
    .join('')
}

/** 고객명·담당자명·지역 등 이름성 텍스트 */
export function maskedName(value: string): string {
  return maskSensitive.value ? maskWords(value ?? '') : (value ?? '')
}

/** 좌표·지도 링크·시세 문구 등 일부만 남겨도 추정이 가능한 값 — 전부 가립니다. */
export function maskedValue(value: string): string {
  if (!maskSensitive.value) return value ?? ''
  return value ? MASKED : (value ?? '')
}

/** 금액 (Rp). dashIfZero 는 값이 없을 때 '-' 로 두는 기존 표기를 유지하는 옵션이며,
 *  마스킹 중에는 값의 유무조차 드러내지 않도록 항상 가린 값을 돌려줍니다. */
export function maskedIDR(value: number, dashIfZero = false): string {
  if (maskSensitive.value) return MASKED_IDR
  return dashIfZero && !value ? '-' : formatIDR(value)
}

/** 할인율 — 서비스 비용과 조합하면 단가가 역산되므로 금액과 같이 취급합니다. */
export function maskedPercent(value: number): string {
  return maskSensitive.value ? MASKED : formatPercent(value)
}

/** 보고서 파일명 — 고객명 조각만 가립니다 (LK_20260814_••••_2PCS.pdf).
 *  buildReportName 형식이 아닌 파일명은 통째로 가립니다. */
export function maskedFileName(name: string): string {
  if (!maskSensitive.value || !name) return name ?? ''
  const parts = /^([A-Za-z]+_\d{8}_)(.+?)(_\d+PCS\.[A-Za-z0-9]+)$/.exec(name ?? '')
  return parts ? `${parts[1]}${MASKED}${parts[3]}` : MASKED
}
