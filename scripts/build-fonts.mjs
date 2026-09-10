// Noto Sans KR 웹폰트를 자체 호스팅용으로 public/fonts/ 에 생성합니다.
//
// 왜 Noto Sans KR 인가 (ASM 디자인 가이드 — 아센도 BI 기준 v1.0, 5장):
//   - ASCENDO BI 매뉴얼 BS 09 「지정서체」가 Noto Sans 계열(본문 Light·제목 Bold)을 지정합니다.
//     웹 배포본인 Noto Sans KR 을 채택하며, 한글·영문·숫자를 이 한 벌로 모두 덮습니다
//     (Noto Sans KR 의 latin 서브셋이 곧 Noto Sans 이므로 별도 로드가 필요 없습니다).
//
// 왜 Google Fonts <link> 대신 자체 호스팅인가 (docs/CHANGELOG.md 2026-09-06):
//   - 가이드 5-1 은 fonts.googleapis.com 링크를 제시하지만, 별도 출처는 DNS/TLS 왕복이 추가되어
//     이 앱에서 첫 렌더를 약 1초 막았습니다. @fontsource 배포본은 Google 과 동일한
//     dynamic-subset(unicode-range 분할) 구조라, 같은 출처에서 받아도 실제 내려받는 파일은
//     화면에 쓰인 글자의 서브셋뿐입니다. 지정서체 준수와 첫 렌더 속도를 모두 지킵니다.
//
// 굵기는 400/500/700 만 남깁니다. BI 지정(본문 400 · 강조 500 · 제목 700)과 일치하고,
// 앱의 font-semibold(600)는 CSS 굵기 매칭 규칙에 따라 700 으로 대체되어 제목용 Bold 원칙과 맞습니다.
// woff 폴백은 제거합니다(모든 대상 브라우저가 woff2 지원).
//
// 생성물(public/fonts/, .gitignore 대상)은 커밋하지 않고 postinstall / prebuild / predev 때
// node_modules/@fontsource/noto-sans-kr 에서 다시 만듭니다. 굵기를 바꾸려면 아래 WEIGHTS 만 수정하세요.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'node_modules/@fontsource/noto-sans-kr')
const srcFontDir = path.join(srcDir, 'files')
const outDir = path.join(root, 'public/fonts')
const outFontDir = path.join(outDir, 'noto-sans-kr')
const outCss = path.join(outDir, 'noto-sans-kr.css')

/** 앱에서 실제로 쓰는 굵기 — 본문 400 · 강조 500 · 제목 700 (BI BS 09). */
const WEIGHTS = [400, 500, 700]

if (!existsSync(srcFontDir)) {
  console.error(`[fonts] ${srcFontDir} 가 없습니다. npm install 을 먼저 실행하세요.`)
  process.exit(1)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outFontDir, { recursive: true })

const blocks = []
let copied = 0
for (const weight of WEIGHTS) {
  const cssPath = path.join(srcDir, `${weight}.css`)
  if (!existsSync(cssPath)) {
    console.error(`[fonts] ${cssPath} 가 없습니다.`)
    process.exit(1)
  }
  for (const raw of readFileSync(cssPath, 'utf8').split('@font-face').slice(1)) {
    const body = raw.slice(0, raw.indexOf('}') + 1)
    const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(body)?.[1]
    if (!file) continue
    copyFileSync(path.join(srcFontDir, file), path.join(outFontDir, file))
    copied += 1
    // src 를 woff2 한 개로 교체하고 경로를 이 CSS 기준 상대경로로 바꿉니다.
    const rewritten = body.replace(/src:\s*[^;]+;/, `src: url(./noto-sans-kr/${file}) format('woff2');`)
    blocks.push(`@font-face${rewritten}`)
  }
}

const header = `/* Noto Sans KR — SIL Open Font License 1.1 (https://fonts.google.com/noto/specimen/Noto+Sans+KR/license)
   scripts/build-fonts.mjs 가 @fontsource/noto-sans-kr 에서 생성합니다. 직접 수정하지 마세요. */`
writeFileSync(outCss, `${header}\n${blocks.join('\n')}\n`)
console.log(
  `[fonts] public/fonts/noto-sans-kr.css: @font-face ${blocks.length}개, woff2 ${copied}개 (굵기 ${WEIGHTS.join('/')})`,
)
