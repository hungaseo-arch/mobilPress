/**
 * Mobil Press — 장착 작업보고서 Drive 업로드 백엔드 (Google Apps Script)
 *
 * 배포 절차
 *  1) script.google.com → 새 프로젝트 → 이 코드 붙여넣기
 *  2) 아래 FOLDER_ID / ALLOWED_ORIGIN 수정
 *  3) 배포 → 새 배포 → 유형: 웹 앱
 *       실행 계정(Execute as)   : 나 (Me)
 *       액세스 권한(Who has access): 모든 사용자 (Anyone)
 *     ※ '모든 사용자' 여야 GitHub Pages 에서 호출됩니다. 실제 쓰기는
 *        아래 SHARED_TOKEN 으로 통제합니다.
 *  4) 발급된 /exec URL 을 .env 의 VITE_DRIVE_UPLOAD_URL 에 입력
 */

// ── 설정 ────────────────────────────────────────────────────
var FOLDER_ID    = 'PASTE_DRIVE_FOLDER_ID';   // Drive 폴더 URL 의 /folders/ 뒤 문자열
var SHARED_TOKEN = 'CHANGE_ME_RANDOM_STRING'; // 앱과 공유하는 단순 토큰 (선택, 빈 문자열이면 미검사)
var TZ           = 'Asia/Jakarta';
var MAX_MB       = 10;

// ── 역할 재검증 (권장) ──────────────────────────────────────
// 화면의 권한 표시는 UX 일 뿐이라 브라우저에서 우회할 수 있습니다.
// 아래를 true 로 두면 Apps Script 가 호출자의 Neon JWT 로 user_roles 를 직접
// 조회해 upload=staff 이상 / delete=admin 인지 서버에서 확인합니다.
//   ※ 먼저 false 로 배포해 업로드가 정상 동작하는지 확인한 뒤 true 로 전환하세요.
//      (앱이 JWT 를 못 넘기는 환경이면 true 에서 모든 업로드가 거부됩니다.)
var REQUIRE_ROLE_CHECK = false;
var DATA_API_URL       = 'PASTE_VITE_NEON_DATA_API_URL'; // 앱의 VITE_NEON_DATA_API_URL 과 동일
// ───────────────────────────────────────────────────────────

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, service: 'mobilpress-report-upload' });
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);

    if (SHARED_TOKEN && p.token !== SHARED_TOKEN) {
      throw new Error('unauthorized');
    }

    if (p.action === 'delete') {
      requireRole_(p.authToken, ['admin']);
      DriveApp.getFileById(p.fileId).setTrashed(true);
      return json_({ ok: true });
    }

    requireRole_(p.authToken, ['admin', 'staff']);

    // ── 업로드 ──
    if (!p.base64) throw new Error('no file');
    var bytes = Utilities.base64Decode(p.base64);
    if (bytes.length > MAX_MB * 1024 * 1024) throw new Error('file over ' + MAX_MB + 'MB');

    var name = sanitize_(p.fileName || ('LK_' + p.workDate + '.pdf'));
    var blob = Utilities.newBlob(bytes, p.mimeType || 'application/pdf', name);

    var file = monthFolder_(p.workDate).createFile(blob);
    file.setDescription(
      [p.workDate, p.customerName, (p.qty || 0) + ' pcs'].join(' | ')
    );

    // 사내 Workspace 정책상 외부 공유가 막혀 있으면 이 호출이 실패합니다.
    // 그 경우 파일은 정상 저장되고, 미리보기·다운로드는 Drive 접근 권한이 있는
    // Google 계정으로 로그인한 상태에서만 열립니다(보안상 오히려 권장).
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) { /* ignore */ }

    return json_({ ok: true, fileId: file.getId(), fileName: name });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/**
 * 호출자의 Neon JWT 로 user_roles 를 조회해 역할을 확인합니다.
 * RLS 가 본인 행만 반환하므로 필터 없이 첫 행을 읽으면 됩니다.
 */
function requireRole_(authToken, allowed) {
  if (!REQUIRE_ROLE_CHECK) return;
  if (!authToken) throw new Error('missing auth token');

  var res = UrlFetchApp.fetch(DATA_API_URL + '/user_roles?select=role&limit=1', {
    method: 'get',
    headers: { Authorization: 'Bearer ' + authToken },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('role check failed');

  var rows = JSON.parse(res.getContentText());
  var role = rows && rows[0] ? rows[0].role : null;
  if (allowed.indexOf(role) < 0) throw new Error('forbidden');
}

/** 작업일자 기준 월별 하위 폴더(2026-08) 자동 생성 */
function monthFolder_(workDate) {
  var root = DriveApp.getFolderById(FOLDER_ID);
  var ym = String(workDate || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) ym = Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  var it = root.getFoldersByName(ym);
  return it.hasNext() ? it.next() : root.createFolder(ym);
}

function sanitize_(s) {
  return String(s).replace(/[\\\/:*?"<>|]/g, '_').slice(0, 120);
}
