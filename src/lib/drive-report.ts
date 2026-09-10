// 장착 작업보고서(스캔 PDF) — Google Drive 저장 헬퍼.
//
// Neon Data API 에는 파일 저장소가 없으므로 파일 본체는 Google Drive 에 두고,
// DB(installations)에는 Drive 파일 ID / 파일명만 보관합니다.
// 업로드 엔드포인트는 Apps Script 웹앱(apps-script/Code.gs)입니다.
// 설정: .env 의 VITE_DRIVE_UPLOAD_URL — docs/DRIVE-REPORT-SETUP.md 참고.
import { canUnlinkReport, canUploadReport, canViewReport } from '@/lib/auth-state'

const UPLOAD_URL = import.meta.env.VITE_DRIVE_UPLOAD_URL ?? ''
// 단순 공유 토큰. 프런트엔드 번들에 포함되므로 '비밀'이 아니라 무작위 호출 차단용입니다.
// 실질적 보호는 Drive 폴더 권한과 Apps Script 실행 계정에서 이뤄집니다.
const UPLOAD_TOKEN = import.meta.env.VITE_DRIVE_UPLOAD_TOKEN ?? ''

/** 업로드 엔드포인트가 설정되어 있는지 (미설정이면 UI 에서 업로드 버튼을 숨깁니다) */
export const driveEnabled = Boolean(UPLOAD_URL)

export const MAX_UPLOAD_MB = 10
export const ACCEPT_TYPES = 'application/pdf,image/jpeg,image/png'
/** 주행거리계 사진은 현장에서 찍은 이미지만 받습니다(PDF 제외). */
export const ACCEPT_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'

/** 업로드 종류. 파일명 접두어와 기본 MIME 타입이 달라집니다.
 *  report = 작업보고서 스캔(LK_), odometer = 주행거리계 사진(KM_) */
export type UploadKind = 'report' | 'odometer'
const KIND_PREFIX: Record<UploadKind, string> = { report: 'LK', odometer: 'KM' }
const KIND_FALLBACK_MIME: Record<UploadKind, string> = {
  report: 'application/pdf',
  odometer: 'image/jpeg',
}

/** Drive 임베드 뷰어 URL — 보는 사람의 Google 로그인 세션이 필요하므로 폴백 용도로만 씁니다.
 *  (본 경로는 fetchReportBlob 으로 파일을 직접 받아 blob: 으로 표시합니다.) */
export function reportPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`
}

/** Drive 파일을 새 탭에서 여는 URL — 미리보기가 막혔을 때의 최종 탈출구. */
export function reportViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
}

/** Drive 직접 다운로드 URL.
 *  구형 `drive.google.com/uc?export=download` 는 drive.usercontent.google.com 으로 리다이렉트되며,
 *  Google 계정이 여러 개 로그인된 브라우저에서는 계정 선택 화면으로 새는 일이 있어 최종 주소를 씁니다. */
export function reportDownloadUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`
}

/** LK_20260814_RAJAPART_2PCS.pdf (주행거리계 사진은 KM_...) 형태로 파일명을 표준화합니다. */
export function buildReportName(
  meta: { workDate: string; customerName: string; qty: number },
  originalName: string,
  kind: UploadKind = 'report',
): string {
  const fallbackExt = kind === 'odometer' ? 'jpg' : 'pdf'
  const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : fallbackExt
  const date = (meta.workDate || '').replace(/-/g, '') || 'NODATE'
  const customer = (meta.customerName || 'CUSTOMER')
    .replace(/^PT\.?\s*/i, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 24) || 'CUSTOMER'
  return `${KIND_PREFIX[kind]}_${date}_${customer}_${Number(meta.qty) || 0}PCS.${ext}`
}

/** 화면 권한은 UX 이고 실제 차단은 Apps Script(역할 재검증) + Drive 폴더 권한에서 이뤄집니다. */
async function authHeaderToken(): Promise<string> {
  const { getAuthToken } = await import('@/lib/neon-auth')
  return (await getAuthToken()) ?? ''
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

export interface ReportUploadResult {
  fileId: string
  fileName: string
}

/**
 * Drive 로 업로드하고 파일 ID 를 돌려줍니다.
 * Content-Type 을 text/plain 으로 보내는 이유: Apps Script 웹앱은 CORS preflight(OPTIONS)를
 * 처리하지 못하므로 단순 요청(simple request)으로 만들어야 합니다.
 */
export async function uploadReport(
  file: File,
  meta: { workDate: string; customerName: string; qty: number },
  kind: UploadKind = 'report',
): Promise<ReportUploadResult> {
  if (!driveEnabled) throw new Error('VITE_DRIVE_UPLOAD_URL 이 설정되지 않았습니다.')
  if (!canUploadReport.value) throw new Error('업로드 권한이 없습니다.')
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`파일이 ${MAX_UPLOAD_MB} MB 를 초과합니다.`)
  }

  const payload = {
    action: 'upload',
    token: UPLOAD_TOKEN,
    authToken: await authHeaderToken(),
    workDate: meta.workDate,
    customerName: meta.customerName,
    qty: Number(meta.qty) || 0,
    fileName: buildReportName(meta, file.name, kind),
    mimeType: file.type || KIND_FALLBACK_MIME[kind],
    base64: await fileToBase64(file),
  }

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })

  const json = (await res.json()) as { ok?: boolean; fileId?: string; fileName?: string; error?: string }
  if (!json.ok || !json.fileId) throw new Error(json.error ?? '업로드에 실패했습니다.')
  return { fileId: json.fileId, fileName: json.fileName ?? payload.fileName }
}

export interface ReportBlob {
  /** blob: URL — 다 쓰고 나면 revokeReportBlob 으로 해제해야 합니다. */
  url: string
  fileName: string
  mimeType: string
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

/**
 * Drive 파일 본체를 Apps Script(폴더 소유 계정으로 실행)를 통해 받아 blob: URL 로 돌려줍니다.
 *
 * drive.google.com 임베드 뷰어와 직접 다운로드 링크는 '보는 사람'의 Google 세션에 의존해서,
 * 계정이 여러 개 로그인돼 있거나 서드파티 쿠키가 차단된 브라우저에서는 빈 화면·계정 선택
 * 화면으로 새어 미리보기와 다운로드가 모두 실패합니다. 파일을 앱이 직접 받아오면 Google
 * 로그인 상태와 무관하게 동작하고, 접근 통제는 Apps Script 의 역할 재검증이 담당합니다.
 */
export async function fetchReportBlob(fileId: string): Promise<ReportBlob> {
  if (!driveEnabled) throw new Error('VITE_DRIVE_UPLOAD_URL 이 설정되지 않았습니다.')
  if (!fileId) throw new Error('파일 ID 가 없습니다.')
  if (!canViewReport.value) throw new Error('열람 권한이 없습니다.')

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'get',
      token: UPLOAD_TOKEN,
      authToken: await authHeaderToken(),
      fileId,
    }),
  })

  const json = (await res.json()) as {
    ok?: boolean
    base64?: string
    fileName?: string
    mimeType?: string
    error?: string
  }
  if (!json.ok || !json.base64) throw new Error(json.error ?? '파일을 불러오지 못했습니다.')

  const mimeType = json.mimeType || 'application/pdf'
  return { url: URL.createObjectURL(base64ToBlob(json.base64, mimeType)), fileName: json.fileName ?? '', mimeType }
}

/** fetchReportBlob 이 만든 blob: URL 을 해제합니다(모달을 닫을 때 반드시 호출). */
export function revokeReportBlob(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

/** 파일을 받아 브라우저 다운로드를 시작합니다. 실패 원인은 호출한 화면이 표시하도록 그대로 던집니다. */
export async function downloadReport(fileId: string, fileName = ''): Promise<void> {
  const file = await fetchReportBlob(fileId)
  const anchor = document.createElement('a')
  anchor.href = file.url
  anchor.download = fileName || file.fileName || fileId
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // 클릭 직후 해제하면 일부 브라우저가 저장을 시작하기 전에 URL 이 사라집니다.
  setTimeout(() => revokeReportBlob(file.url), 60_000)
}

/** Drive 에서 파일을 삭제(휴지통 이동)합니다. 실패해도 DB 링크 해제는 진행합니다. */
export async function deleteReport(fileId: string): Promise<void> {
  if (!driveEnabled || !fileId) return
  if (!canUnlinkReport.value) throw new Error('삭제 권한이 없습니다.')
  await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'delete',
      token: UPLOAD_TOKEN,
      authToken: await authHeaderToken(),
      fileId,
    }),
  }).catch(() => undefined)
}
