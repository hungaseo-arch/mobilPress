#!/usr/bin/env node
/* global process, Buffer */
// 모바일 카드형 결과 목록 회귀 테스트 (mock 전용, 설치 불필요).
//
// 무엇을 보나
//   390×844 : 페이지 가로 넘침 없음 / 320×700 : 결과 영역 넘침 없음(툴바 기존 넘침은 NOTE 로 기록), Laporan Kerja / Pendapatan per Customer / Pendapatan Bulanan 의
//                     핵심 수치(날짜·고객·수량·수령액, 고객명·수량·수령액, 월·건수·수량·수령액)와 합계가
//                     옆으로 밀지 않아도 화면 안에 잘리지 않고 보이는지, 긴 무공백 고객명이 줄바꿈되는지,
//                     상세 팝업(클릭·키보드 Enter), 검색·기간·정렬·페이지, 보고서·삭제 동작, 빈 상태, 중복 id.
//   1440×900        : 기존 표(열 수, 정렬 헤더)가 그대로 보이고 카드 목록은 보이지 않는지.
//   ID / KO         : 카드 라벨이 언어에 맞게 바뀌는지.
//
// 실행
//   1) mock 모드 dev 서버(loopback, 4173 제외 포트). 저장소의 .env 를 쓰지 않도록 VITE_* 를 프로세스 환경에서 덮어씁니다.
//      VITE_DATA_MODE=mock VITE_NEON_AUTH_URL= VITE_NEON_DATA_API_URL= VITE_API_PROXY_TARGET= \
//      VITE_DRIVE_UPLOAD_URL= VITE_DRIVE_UPLOAD_TOKEN= npm run dev -- --host 127.0.0.1 --port 4176 --strictPort
//   2) node tests/mobile-cards.mjs --url http://127.0.0.1:4176/ [--out dist-mobile-c] [--chrome <path>]
//
// 데이터는 브라우저 localStorage(mock 저장소)에 넣는 가상 고정 데이터뿐이며, loopback 이 아닌 요청이 하나라도 나가면 실패합니다.
// Chrome 은 --out 아래 임시 프로필로 띄우고 끝나면 이 스크립트가 띄운 프로세스만 종료합니다.

import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]])
    return acc
  }, []),
)
const BASE = args.url ?? 'http://127.0.0.1:4176/'
const OUT = path.resolve(args.out ?? 'dist-mobile-c')
const CHROME = args.chrome ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(BASE)) {
  console.error('loopback URL 만 허용합니다:', BASE)
  process.exit(2)
}
if (!path.basename(OUT).startsWith('dist')) {
  console.error('--out 은 dist* 디렉터리여야 합니다:', OUT)
  process.exit(2)
}

// ── 고정 데이터 (가상) ─────────────────────────────────────────
const LONG = 'PTSUPERPANJANGTAMBANGBATUBARAKALIMANTANTIMURSEJAHTERAABADI'
const ALPHA = 'PT Alpha Mining'
const BETA = 'CV Beta Logistik'
const now = '2026-11-01T00:00:00.000Z'
const customer = (id, companyName, area) => ({
  id, companyName, area, businessType: '', contactName: '', branchInfo: '', monthlyDemand: 0,
  currentPressVendor: '', marketPrice: '', insight: '', status: 'active', lastVisitDate: '', createdAt: now, updatedAt: now,
})
const inst = (id, workDate, customerName, qty, receivedAmount, extra = {}) => ({
  id, workDate, customerName, qty, receivedAmount, distributor: '', product: 'Ban 1000-20', rimSize: '', serialNumbers: '',
  workTime: '', odometer: '', installArea: '', locationUrl: '', worker: '', enteredBy: '', status: 'completed', note: '',
  reportFileId: '', reportFileName: '', reportFileId2: '', reportFileName2: '', reportFileId3: '', reportFileName3: '',
  odometerFileId: '', odometerFileName: '', tirePrice: 0, serviceFee: receivedAmount, mobilizationFee: 0, discountRate: 0,
  createdAt: now, updatedAt: now, ...extra,
})
const FIXTURE = {
  customers: [customer('c1', LONG, 'Kalimantan Timur'), customer('c2', ALPHA, 'Sumatra'), customer('c3', BETA, 'Jawa')],
  installations: [
    inst('i01', '2026-11-20', LONG, 8, 1234567890, {
      distributor: 'PT Distributor Satu', reportFileId: 'fixture-file-a', reportFileName: 'laporan-a.pdf',
      reportFileId2: 'fixture-file-b', reportFileName2: 'laporan-b.pdf',
    }),
    inst('i02', '2026-11-15', ALPHA, 4, 2700000),
    inst('i03', '2026-11-03', BETA, 2, 1350000),
    inst('i04', '2026-10-28', ALPHA, 6, 4050000),
    inst('i05', '2026-10-21', BETA, 1, 675000),
    inst('i06', '2026-10-14', LONG, 12, 8100000),
    inst('i07', '2026-10-07', ALPHA, 3, 2025000),
    inst('i08', '2026-10-02', BETA, 5, 3375000),
    inst('i09', '2026-09-25', ALPHA, 2, 1350000),
    inst('i10', '2026-09-18', LONG, 20, 13500000),
    inst('i11', '2026-09-09', BETA, 0, 0),
    inst('i12', '2025-12-30', ALPHA, 7, 4725000),
  ],
  budgetEntries: [],
}
const fmt = (n) => new Intl.NumberFormat('en-US').format(n)
const idr = (n) => `Rp ${fmt(n)}`
const totalReceived = FIXTURE.installations.reduce((s, i) => s + i.receivedAmount, 0)
const totalQty = FIXTURE.installations.reduce((s, i) => s + i.qty, 0)
const nov = FIXTURE.installations.filter((i) => i.workDate.startsWith('2026-11'))
const novReceived = nov.reduce((s, i) => s + i.receivedAmount, 0)
const longReceived = FIXTURE.installations.filter((i) => i.customerName === LONG).reduce((s, i) => s + i.receivedAmount, 0)

// ── 최소 CDP 클라이언트 ────────────────────────────────────────
mkdirSync(OUT, { recursive: true })
const profile = path.join(OUT, 'chrome-profile-mobile-cards')
rmSync(profile, { recursive: true, force: true })
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
  '--disable-component-update', '--disable-sync', '--metrics-recording-only', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' })
const cleanup = () => {
  try { chrome.kill('SIGKILL') } catch { /* 이미 종료 */ }
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* 무시 */ }
}
process.on('exit', cleanup)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130) })
// 전체 제한 시간 — 멈춰도 Chrome 을 남기지 않는다
setTimeout(() => { console.error('TIMEOUT'); cleanup(); process.exit(3) }, 150000).unref()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function devtoolsPort() {
  const file = path.join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 100; i++) {
    if (existsSync(file)) {
      const [port] = readFileSync(file, 'utf8').split('\n')
      if (port) return port
    }
    await sleep(100)
  }
  throw new Error('Chrome DevTools 포트를 찾지 못했습니다')
}
const port = await devtoolsPort()
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
let seq = 0
const pending = new Map()
const listeners = []
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(msg.error.message))
    else resolve(msg.result)
  } else if (msg.method) listeners.forEach((fn) => fn(msg))
}
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq
    // 요청마다 짧은 제한 시간 — 응답이 없으면 실패로 넘기고 정리한다
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 5000)
    pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v) }, reject: (e) => { clearTimeout(timer); reject(e) } })
    ws.send(JSON.stringify({ id, method, params }))
  })
const foreignRequests = []
listeners.push((m) => {
  if (m.method === 'Network.requestWillBeSent') {
    const u = m.params.request.url
    if (!/^(data:|blob:|about:|chrome|https?:\/\/(127\.0\.0\.1|localhost|\[::1\])[:/])/.test(u)) foreignRequests.push(u)
  }
})
await send('Page.enable')
await send('Network.enable')
await send('Runtime.enable')

// 페이지 안에서 쓰는 도우미 — 매 evaluate 마다 함께 주입합니다.
const HELPERS = String.raw`
const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
// 화면 안에서 잘리지 않고 읽히는지: 뷰포트 안, 가로 스크롤/클립 조상 안, 말줄임 없음
const readable = (el) => {
  if (!vis(el)) return { ok: false, why: 'hidden' };
  const r = el.getBoundingClientRect();
  if (r.left < -0.5 || r.right > innerWidth + 0.5) return { ok: false, why: 'viewport', left: r.left, right: r.right };
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (cs.overflowX !== 'visible') {
      const ar = a.getBoundingClientRect();
      if (r.left < ar.left - 0.5 || r.right > ar.right + 0.5) return { ok: false, why: 'clipped', right: r.right, clipRight: ar.right };
    }
  }
  if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') return { ok: false, why: 'truncated' };
  return { ok: true, left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) };
};
const scope = () => document.querySelector('main') ?? document.body;
// 결과 영역(장착 실적 섹션 / 실적 분석 탭 패널) — KPI 요약의 같은 값과 섞이지 않게 수치는 여기서만 찾는다
const sec = () => [...document.querySelectorAll('main section')].find((x) => x.querySelector('table')) ?? scope();
// 정확히 그 글자를 가진 가장 안쪽의 보이는 요소
const byText = (text, root = sec()) => {
  const all = [...root.querySelectorAll('*')].filter((e) => vis(e) && e.textContent.trim() === text);
  return all.find((e) => ![...e.children].some((c) => c.textContent.trim() === text)) ?? all[0] ?? null;
};
const allByText = (text, root = sec()) => [...root.querySelectorAll('*')].filter((e) => vis(e) && e.textContent.trim() === text && ![...e.children].some((c) => c.textContent.trim() === text));
const visibleButtons = (pred) => [...scope().querySelectorAll('button')].filter((b) => vis(b) && pred(b));
// 결과 영역 안에서 화면 오른쪽(clientWidth)을 넘는 보이는 요소 수 — 툴바 등 영역 밖 넘침과 구분합니다
const secOverflow = () => { const w = document.documentElement.clientWidth; const r = sec().getBoundingClientRect(); return { secRight: Math.round(r.right), clientWidth: w, over: [...sec().querySelectorAll('*')].filter((e) => vis(e) && e.getBoundingClientRect().right > w + 0.5).length }; };
const overflow = () => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, bodyScroll: document.body.scrollWidth });
const dupIds = () => { const m = {}; document.querySelectorAll('[id]').forEach((e) => (m[e.id] = (m[e.id] ?? 0) + 1)); return Object.entries(m).filter(([, n]) => n > 1).map(([k]) => k); };
const dialogTitle = () => { const d = document.querySelector('[role=dialog]'); if (!d) return null; const id = d.getAttribute('aria-labelledby'); return (id && document.getElementById(id)?.textContent.trim()) || d.textContent.trim().slice(0, 40); };
`
async function evaluate(expr) {
  const res = await send('Runtime.evaluate', {
    expression: `(async () => { ${HELPERS}\n return (${expr}); })()`,
    awaitPromise: true,
    returnByValue: true,
  })
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text)
  return res.result.value
}
async function waitFor(expr, timeout = 3000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await evaluate(expr).catch(() => false)) return true
    await sleep(100)
  }
  return false
}
async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: width < 800 ? 2 : 1, mobile: width < 800 })
  await send('Emulation.setTouchEmulationEnabled', { enabled: width < 800 })
}
async function open(query = '', lang = 'id') {
  await send('Page.navigate', { url: BASE })
  await waitFor(`document.readyState === 'complete'`)
  await evaluate(`(localStorage.setItem('mobilpress-data-v1', ${JSON.stringify(JSON.stringify(FIXTURE))}), localStorage.setItem('mobilpress-lang', '${lang}'), true)`)
  await send('Page.navigate', { url: BASE + query })
  // 고정 데이터가 실제로 그려질 때까지(로딩 상자 없음 + 결과 영역에 금액 표시)
  const ready = await waitFor(`document.readyState === 'complete' && !document.querySelector('main [role=status].py-14') && /Rp \\d/.test(sec().textContent)`, 10000)
  if (!ready) throw new Error(`화면 준비 실패: ${query}`)
  await sleep(250)
}
async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
}
async function pressEnter() {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
}
async function pressEscape() {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
}

// ── 판정 ─────────────────────────────────────────────────────
const results = []
function check(name, ok, measured) {
  results.push({ name, ok: !!ok, measured })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(measured)}`)
}
const noOverflow = (o) => o.scrollWidth <= o.clientWidth && o.bodyScroll <= o.clientWidth

async function mobileInstallations(width, height, label) {
  await viewport(width, height)
  await open()
  const o = await evaluate('overflow()')
  if (width >= 390) check(`${label} Laporan Kerja: 페이지 가로 넘침 없음`, noOverflow(o), o)
  else {
    // 320: 기존 툴바(기간 필터·검색+등록 버튼)의 넘침은 이 카드 범위 밖 — 기록만 하고 결과 영역만 판정합니다
    console.log(`NOTE  ${label} 페이지 scrollWidth ${o.scrollWidth} / clientWidth ${o.clientWidth} (툴바 기존 넘침, 범위 밖)`)
    const so = await evaluate('secOverflow()')
    check(`${label} Laporan Kerja: 결과 영역 가로 넘침 없음`, so.over === 0 && so.secRight <= so.clientWidth, so)
  }
  const firstDate = await evaluate(`readable(byText('2026-11-20'))`)
  check(`${label} Laporan Kerja: 첫 건 날짜 보임`, firstDate.ok, firstDate)
  const name = await evaluate(`(() => { const e = byText(${JSON.stringify(LONG)}); return { ...readable(e), lines: e ? Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 20)) : 0 }; })()`)
  check(`${label} Laporan Kerja: 긴 무공백 고객명이 잘리지 않고 줄바꿈`, name.ok && name.lines >= 2, name)
  const qty = await evaluate(`readable(byText('8 pcs'))`)
  check(`${label} Laporan Kerja: 수량 보임`, qty.ok, qty)
  const amt = await evaluate(`readable(byText(${JSON.stringify(idr(1234567890))}))`)
  check(`${label} Laporan Kerja: 수령액 전체 수치 보임`, amt.ok, amt)
  const total = await evaluate(`readable(byText(${JSON.stringify(idr(totalReceived))}))`)
  check(`${label} Laporan Kerja: 합계 수령액 보임`, total.ok, { ...total, value: idr(totalReceived) })
  const totalQ = await evaluate(`readable(byText(${JSON.stringify(`${fmt(totalQty)} pcs`)}))`)
  check(`${label} Laporan Kerja: 합계 수량 보임`, totalQ.ok, totalQ)
  const actions = await evaluate(`({
    report: visibleButtons((b) => (b.getAttribute('aria-label') ?? '').startsWith('Buka laporan (2)')).map((b) => readable(b)),
    del: visibleButtons((b) => (b.getAttribute('aria-label') ?? '').startsWith('Hapus: 2026-11-20')).map((b) => readable(b)),
  })`)
  check(`${label} Laporan Kerja: 보고서·삭제 버튼이 화면 안에 보임`, actions.report.length === 1 && actions.report[0].ok && actions.del.length === 1 && actions.del[0].ok, actions)
  const ids = await evaluate('dupIds()')
  check(`${label} Laporan Kerja: 중복 id 없음`, ids.length === 0, ids)
  return o
}

async function run() {
  // 390 — Laporan Kerja
  await mobileInstallations(390, 844, '390')
  await shot('390-installations')
  // 상세 팝업: 클릭
  await evaluate(`byText(${JSON.stringify(LONG)})?.closest('button')?.click(), true`)
  const opened = await waitFor(`!!document.querySelector('[role=dialog]')`)
  check('390 Laporan Kerja: 고객명 탭 → 상세 팝업', opened, await evaluate('dialogTitle()'))
  await shot('390-installations-detail')
  await pressEscape()
  await waitFor(`!document.querySelector('[role=dialog]')`)
  // 키보드 Enter
  await evaluate(`(byText('PT Alpha Mining')?.closest('button')?.focus(), true)`)
  const focused = await evaluate(`document.activeElement?.textContent.includes('PT Alpha Mining') && vis(document.activeElement)`)
  await pressEnter()
  const kOpened = await waitFor(`!!document.querySelector('[role=dialog]')`)
  check('390 Laporan Kerja: 키보드 Enter → 상세 팝업', focused && kOpened, { focused, opened: kOpened })
  await pressEscape()
  await waitFor(`!document.querySelector('[role=dialog]')`)
  const back = await evaluate(`document.activeElement?.textContent.includes('PT Alpha Mining') ?? false`)
  check('390 Laporan Kerja: 팝업 닫으면 포커스 복귀', back, back)

  // 페이지
  const p1 = await evaluate(`allByText('2026-11-20').length + allByText('2025-12-30').length`)
  await evaluate(`visibleButtons((b) => !!b.closest('section nav') && b.textContent.trim() === '2')[0]?.click(), true`)
  await sleep(200)
  const p2 = await evaluate(`({ last: readable(byText('2025-12-30')).ok, first: !!byText('2026-11-20') })`)
  check('390 Laporan Kerja: 2페이지 이동', p1 === 1 && p2.last && !p2.first, { page1Visible: p1, page2: p2 })
  await evaluate(`visibleButtons((b) => !!b.closest('section nav') && b.textContent.trim() === '1')[0]?.click(), true`)
  await sleep(200)

  // 정렬 (모바일 정렬 컨트롤: 수량 많은 순)
  const sortCtl = await evaluate(`(() => { const s = [...scope().querySelectorAll('select')].find((x) => vis(x) && [...x.options].some((o) => o.value === 'qty:desc')); if (!s) return null; s.value = 'qty:desc'; s.dispatchEvent(new Event('change')); return { label: s.labels?.[0]?.textContent.trim() ?? s.getAttribute('aria-label'), r: readable(s) }; })()`)
  await sleep(200)
  const firstQty = await evaluate(`(() => { const e = allByText('20 pcs')[0]; const d = allByText('2026-11-20')[0]; if (!e) return null; return { top20: Math.round(e.getBoundingClientRect().top), topNovDate: d ? Math.round(d.getBoundingClientRect().top) : null }; })()`)
  check('390 Laporan Kerja: 모바일 정렬(수량 많은 순) → 20 pcs 건이 맨 위', !!sortCtl && sortCtl.r.ok && firstQty && (firstQty.topNovDate === null || firstQty.top20 < firstQty.topNovDate), { sortCtl, firstQty })
  await evaluate(`(() => { const s = [...scope().querySelectorAll('select')].find((x) => vis(x) && [...x.options].some((o) => o.value === 'workDate:desc')); if (s) { s.value = 'workDate:desc'; s.dispatchEvent(new Event('change')); } return true; })()`)
  await sleep(200)

  // 검색
  await evaluate(`(() => { const i = scope().querySelector('input[type=search]'); i.value = 'Beta'; i.dispatchEvent(new Event('input')); return true; })()`)
  await sleep(250)
  const beta = await evaluate(`({ beta: allByText('CV Beta Logistik').length, alpha: allByText('PT Alpha Mining').length, total: readable(byText(${JSON.stringify(idr(1350000 + 675000 + 3375000))})) })`)
  check('390 Laporan Kerja: 검색(Beta) → 4건, 합계 보임', beta.beta === 4 && beta.alpha === 0 && beta.total.ok, beta)
  await shot('390-installations-search')
  await evaluate(`(() => { const i = scope().querySelector('input[type=search]'); i.value = 'zzz-none'; i.dispatchEvent(new Event('input')); return true; })()`)
  await sleep(250)
  const empty = await evaluate(`({ msg: readable(byText("Tidak ada hasil untuk 'zzz-none'.")), clear: visibleButtons((b) => b.textContent.trim() === 'Hapus pencarian').map(readable), o: overflow() })`)
  check('390 Laporan Kerja: 검색 결과 없음 안내·지우기 버튼 보임', empty.msg.ok && empty.clear.length === 1 && empty.clear[0].ok && noOverflow(empty.o), empty)
  await evaluate(`visibleButtons((b) => b.textContent.trim() === 'Hapus pencarian')[0]?.click(), true`)
  await sleep(200)

  // 기간: 이번 달
  await evaluate(`visibleButtons((b) => b.textContent.trim() === 'Bulan ini')[0].click(), true`)
  await sleep(250)
  const period = await evaluate(`({ n: allByText('2026-11-20').length + allByText('2026-11-15').length + allByText('2026-11-03').length, oct: allByText('2026-10-28').length, total: readable(byText(${JSON.stringify(idr(novReceived))})) })`)
  check('390 Laporan Kerja: 기간(이번 달) → 11월 3건, 합계 보임', period.n === 3 && period.oct === 0 && period.total.ok, { ...period, expectedTotal: idr(novReceived) })
  await shot('390-installations-thismonth')

  // 390 — 고객별
  await open('?tab=revenue')
  let o = await evaluate('overflow()')
  check('390 고객별: 페이지 가로 넘침 없음', noOverflow(o), o)
  const cName = await evaluate(`(() => { const e = byText(${JSON.stringify(LONG)}); return { ...readable(e), lines: e ? Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 20)) : 0 }; })()`)
  check('390 고객별: 긴 고객명 잘리지 않고 줄바꿈', cName.ok && cName.lines >= 2, cName)
  const cAmt = await evaluate(`readable(byText(${JSON.stringify(idr(longReceived))}))`)
  check('390 고객별: 고객 수령액 전체 수치 보임', cAmt.ok, { ...cAmt, value: idr(longReceived) })
  const cQty = await evaluate(`readable(byText('40 pcs'))`)
  check('390 고객별: 고객 수량 보임', cQty.ok, cQty)
  const cTot = await evaluate(`({ amt: readable(byText(${JSON.stringify(idr(totalReceived))})), qty: readable(byText(${JSON.stringify(`${fmt(totalQty)} pcs`)})) })`)
  check('390 고객별: 합계(수량·수령액) 보임', cTot.amt.ok && cTot.qty.ok, cTot)
  const req = await evaluate(`readable(byText('PT Distributor Satu'))`)
  check('390 고객별: 요청고객 링크 보임', req.ok, req)
  check('390 고객별: 중복 id 없음', (await evaluate('dupIds()')).length === 0, await evaluate('dupIds()'))
  await shot('390-revenue-customer')
  await evaluate(`byText(${JSON.stringify(LONG)})?.closest('button')?.click(), true`)
  check('390 고객별: 고객명 탭 → 상세 팝업', await waitFor(`!!document.querySelector('[role=dialog]')`), await evaluate('dialogTitle()'))
  await pressEscape()
  await waitFor(`!document.querySelector('[role=dialog]')`)

  // 390 — 월별
  await open('?tab=revenue&sub=month')
  o = await evaluate('overflow()')
  check('390 월별: 페이지 가로 넘침 없음', noOverflow(o), o)
  const mAmt = await evaluate(`({ month: readable(byText('2026-11')), amt: readable(byText(${JSON.stringify(idr(novReceived))})), jobs: readable(byText('3 item')), qty: readable(byText('14 pcs')) })`)
  check('390 월별: 월·건수·수량·수령액 보임', mAmt.month.ok && mAmt.amt.ok && mAmt.jobs.ok && mAmt.qty.ok, mAmt)
  const mTot = await evaluate(`({ label: readable(byText('Total (4 bulan)')) , amt: readable(byText(${JSON.stringify(idr(totalReceived))})) })`)
  check('390 월별: 합계 라벨·수령액 보임', mTot.label.ok && mTot.amt.ok, mTot)
  check('390 월별: 중복 id 없음', (await evaluate('dupIds()')).length === 0, await evaluate('dupIds()'))
  await shot('390-revenue-month')
  await evaluate(`byText('2026-11')?.closest('button')?.click(), true`)
  check('390 월별: 월 탭 → 상세 팝업', await waitFor(`!!document.querySelector('[role=dialog]')`), await evaluate('dialogTitle()'))
  await pressEscape()

  // 320
  await mobileInstallations(320, 700, '320')
  await shot('320-installations')
  await open('?tab=revenue')
  o = await evaluate('secOverflow()')
  check('320 고객별: 결과 영역 넘침 없음 + 수령액 보임', o.over === 0 && (await evaluate(`readable(byText(${JSON.stringify(idr(longReceived))}))`)).ok, o)
  await open('?tab=revenue&sub=month')
  o = await evaluate('secOverflow()')
  check('320 월별: 결과 영역 넘침 없음 + 수령액 보임', o.over === 0 && (await evaluate(`readable(byText(${JSON.stringify(idr(novReceived))}))`)).ok, o)

  // KO 390
  await viewport(390, 844)
  await open('', 'ko')
  const ko = await evaluate(`({ tab: !!byText('장착 실적', scope()), received: allByText('수령액').length, qty: allByText('수량').length, o: overflow() })`)
  check('390 KO Laporan Kerja: 카드 라벨 한국어(수령액·수량)', ko.tab && ko.received > 0 && ko.qty > 0 && noOverflow(ko.o), ko)
  await shot('390-ko-installations')
  await open('?tab=revenue', 'ko')
  const koC = await evaluate(`({ received: allByText('수령액').length, total: readable(byText('합계 · 장착고객 3곳')), o: overflow() })`)
  check('390 KO 고객별: 라벨·합계 한국어, 넘침 없음', koC.received > 0 && koC.total.ok && noOverflow(koC.o), koC)
  await open('?tab=revenue&sub=month', 'ko')
  const koM = await evaluate(`({ received: allByText('수령액').length, total: readable(byText('합계 (4 개월)')), o: overflow() })`)
  check('390 KO 월별: 라벨·합계 한국어, 넘침 없음', koM.received > 0 && koM.total.ok && noOverflow(koM.o), koM)

  // 1440 — 기존 표
  await viewport(1440, 900)
  for (const [q, label, cols] of [['', 'Laporan Kerja', 9], ['?tab=revenue', '고객별', 7], ['?tab=revenue&sub=month', '월별', 7]]) {
    await open(q)
    const d = await evaluate(`(() => { const t = [...scope().querySelectorAll('table')].find(vis); return { table: !!t, cols: t ? t.querySelectorAll('thead th').length : 0, rows: t ? t.querySelectorAll('tbody tr').length : 0, cards: [...scope().querySelectorAll('[data-card-list]')].filter(vis).length, o: overflow(), dup: dupIds() }; })()`)
    check(`1440 ${label}: 기존 표 유지(열 ${cols}), 카드 숨김`, d.table && d.cols === cols && d.cards === 0 && noOverflow(d.o) && d.dup.length === 0, d)
    await shot(`1440-${label === 'Laporan Kerja' ? 'installations' : label === '고객별' ? 'revenue-customer' : 'revenue-month'}`)
  }
  await open()
  const sortHdr = await evaluate(`(() => { const b = [...scope().querySelectorAll('thead button')].filter(vis).map((x) => x.textContent.trim()); return b; })()`)
  check('1440 Laporan Kerja: 정렬 헤더 버튼 3개 유지', sortHdr.length === 3, sortHdr)

  check('loopback 외 요청 없음', foreignRequests.length === 0, foreignRequests)
}

let code = 0
try {
  await run()
} catch (e) {
  console.error('ERROR', e)
  code = 2
}
const failed = results.filter((r) => !r.ok)
writeFileSync(path.join(OUT, 'mobile-cards-result.json'), JSON.stringify({ base: BASE, results }, null, 2))
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? `, ${failed.length} failed` : ''}`)
ws.close()
// Chrome 본체 종료를 기다린 뒤 프로필을 지운다 — 하위(GPU·렌더러) 프로세스가 남지 않게
const exited = new Promise((r) => chrome.once('exit', r))
cleanup()
await Promise.race([exited, sleep(3000)])
for (let i = 0; i < 20; i++) {
  if (!spawnSync('pgrep', ['-f', `user-data-dir=${profile}`]).stdout.toString().trim()) break
  await sleep(150)
}
rmSync(profile, { recursive: true, force: true })
process.exit(code || (failed.length ? 1 : 0))
