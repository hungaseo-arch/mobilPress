// Pretendard 웹폰트를 자체 호스팅용으로 public/fonts/ 에 생성합니다.
//
// 왜 CDN(jsDelivr) 대신 자체 호스팅인가 (docs/CHANGELOG.md 2026-09-06):
//   - CDN 의 dynamic-subset CSS 는 굵기 9종 × 서브셋 92개 = @font-face 828개(원본 613 KB)를
//     선언하고, 별도 출처라 DNS/TLS 왕복이 추가되어 첫 렌더를 약 1초 막았습니다.
//   - 앱은 굵기 400/500/600/700 만 쓰므로 그 4종만 남기고, woff 폴백을 제거해(모든 대상
//     브라우저가 woff2 지원) CSS 를 절반 이하로 줄입니다. 파일은 같은 출처에서 내려받습니다.
//
// 생성물(public/fonts/, .gitignore 대상)은 커밋하지 않고 postinstall / prebuild / predev 때
// node_modules/pretendard 에서 다시 만듭니다. 굵기를 바꾸려면 아래 WEIGHTS 만 수정하세요.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'node_modules/pretendard/dist/web/static')
const srcCss = path.join(srcDir, 'pretendard-dynamic-subset.css')
const outDir = path.join(root, 'public/fonts')
const outFontDir = path.join(outDir, 'pretendard')
const outCss = path.join(outDir, 'pretendard.css')

/** 앱에서 실제로 쓰는 굵기 — Tailwind font-normal/medium/semibold/bold. */
const WEIGHTS = new Set([400, 500, 600, 700])

if (!existsSync(srcCss)) {
  console.error(`[fonts] ${srcCss} 가 없습니다. npm install 을 먼저 실행하세요.`)
  process.exit(1)
}

const css = readFileSync(srcCss, 'utf8')
const header = css.slice(0, css.indexOf('/* [0] */')).trim() // OFL 라이선스 고지 유지

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outFontDir, { recursive: true })

const blocks = []
let copied = 0
for (const raw of css.split('@font-face').slice(1)) {
  const body = raw.slice(0, raw.indexOf('}') + 1)
  const weight = Number(/font-weight:\s*(\d+)/.exec(body)?.[1])
  if (!WEIGHTS.has(weight)) continue
  const file = /url\(\.\/woff2-dynamic-subset\/([^)]+\.woff2)\)/.exec(body)?.[1]
  if (!file) continue
  copyFileSync(path.join(srcDir, 'woff2-dynamic-subset', file), path.join(outFontDir, file))
  copied += 1
  // src 를 woff2 한 개로 교체하고 경로를 이 CSS 기준 상대경로로 바꿉니다.
  const rewritten = body.replace(/src:\s*[^;]+;/, `src: url(./pretendard/${file}) format('woff2');`)
  blocks.push(`@font-face${rewritten}`)
}

writeFileSync(outCss, `${header}\n${blocks.join('\n')}\n`)
console.log(
  `[fonts] public/fonts/pretendard.css: @font-face ${blocks.length}개, woff2 ${copied}개 (굵기 ${[...WEIGHTS].join('/')})`,
)
