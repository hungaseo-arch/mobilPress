// 장착 작업보고서(스캔 PDF) — Google Drive 저장 헬퍼.
//
// Neon Data API 에는 파일 저장소가 없으므로 파일 본체는 Google Drive 에 두고,
// DB(installations)에는 Drive 파일 ID / 파일명만 보관합니다.
// 업로드 엔드포인트는 Apps Script 웹앱(apps-script/Code.gs)입니다.
// 설정: .env 의 VITE_DRIVE_UPLOAD_URL — docs/DRIVE-REPORT-SETUP.md 참고.
import { canUnlinkReport, canUploadReport } from '@/lib/auth-state'
import { getAuthToken } from '@/lib/neon-auth'

const UPLOAD_URL = import.meta.env.VITE_DRIVE_UPLOAD_URL ?? ''
// 단순 공유 토큰. 프런트엔드 번들에 포함되므로 '비밀'이 아니라 무작위 호출 차단용입니다.
// 실질적 보호는 Drive 폴더 권한과 Apps Script 실행 계정에서 이뤄집니다.
const UPLOAD_TOKEN = import.meta.env.VITE_DRIVE_UPLOAD_TOKEN ?? ''

/** 업로드 엔드포인트가 설정되어 있는지 (미설정이면 UI 에서 업로드 버튼을 숨깁니다) */
export const driveEnabled = Boolean(UPLOAD_URL)

export const MAX_UPLOAD_MB = 10
export const ACCEPT_TYPES = 'application/pdf,image/jpeg,image/png'

export function reportPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

export function reportDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

/** LK_20260814_RAJAPART_2PCS.pdf 형태로 파일명을 표준화합니다. */
export function buildReportName(
  meta: { workDate: string; customerName: string; qty: number },
  originalName: string,
): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : 'pdf'
  const date = (meta.workDate || '').replace(/-/g, '') || 'NODATE'
  const customer = (meta.customerName || 'CUSTOMER')
    .replace(/^PT\.?\s*/i, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 24) || 'CUSTOMER'
  return `LK_${date}_${customer}_${Number(meta.qty) || 0}PCS.${ext}`
}

/** 화면 권한은 UX 이고 실제 차단은 Apps Script(역할 재검증) + Drive 폴더 권한에서 이뤄집니다. */
async function authHeaderToken(): Promise<string> {
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
    fileName: buildReportName(meta, file.name),
    mimeType: file.type || 'application/pdf',
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
