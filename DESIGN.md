---
name: MobilPress
description: ASCENDO BI를 따르는 평면·촘촘한 운영 데스크. 견적서 양식의 표와 파란 괘선으로 운영 데이터를 훑어보게 한다.
colors:
  primary: "#0062c6"
  primary-hover: "#0053a8"
  primary-active: "#00458b"
  primary-soft: "#e6eff9"
  primary-6: "#f0f6fc"
  primary-15: "#d9e7f6"
  primary-20: "#cce0f4"
  primary-40: "#99c0e8"
  ink: "#333333"
  ink-muted: "#666666"
  page: "#f5f5f5"
  card: "#ffffff"
  secondary: "#f3f3f3"
  muted: "#ebebeb"
  line: "#d6d6d6"
  line-soft: "#ebebeb"
  success: "#1e7b34"
  success-soft: "#e6f4ea"
  success-border: "#a8d5b3"
  warning: "#8a5a00"
  warning-soft: "#fff6e0"
  warning-border: "#f5d580"
  danger: "#c62828"
  danger-soft: "#fce9e9"
  danger-border: "#f0a3a3"
  neutral: "#5f5f5f"
  neutral-soft: "#ededed"
  neutral-border: "#d6d6d6"
  chart-amber: "#e08a00"
typography:
  title:
    fontFamily: "'Noto Sans KR', 'Noto Sans', KoPubDotum, 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  modal-title:
    fontFamily: "'Noto Sans KR', 'Noto Sans', KoPubDotum, 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Noto Sans KR', 'Noto Sans', KoPubDotum, 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  table:
    fontFamily: "'Noto Sans KR', 'Noto Sans', KoPubDotum, 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "'Noto Sans KR', 'Noto Sans', KoPubDotum, 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  badge:
    fontFamily: "'Noto Sans KR', 'Noto Sans', KoPubDotum, 'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
components:
  table-header:
    backgroundColor: "{colors.primary-6}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    height: "36px"
    padding: "9px 12px"
  table-cell:
    textColor: "{colors.ink}"
    typography: "{typography.table}"
    height: "38px"
    padding: "9px 12px"
  table-total:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    padding: "9px 12px"
  badge-info:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.badge}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 8px"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.badge}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 8px"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.badge}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 8px"
  badge-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.badge}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 8px"
  role-pill:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    height: "28px"
    padding: "0 10px"
  modal:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: MobilPress

## Overview

**Creative North Star: "The Operations Desk"**

관리자가 PC 앞에 앉아 고객, 장착 실적, 매출, 예산을 훑는 작업대다. 화면은 평면이고, 라운드는 직각에 가깝고(4·6·8px), 구조는 ASCENDO 견적서 양식에서 빌려 온 회색 헤더와 파란 괘선이다. 장식은 BI가 정한 것만 쓴다. 상단 4px 블루 바, 카드 제목의 3px 블루 세로선, 로그인·빈 상태의 심볼 워터마크다. 나머지는 모두 정보를 읽기 쉽게 하는 데 쓴다.

성격은 차분하고 촘촘하다. 본문은 14px, 표는 13px, 행 높이는 38px로 한 화면에 많은 행이 들어가게 한다. 색은 파란 하나로 강조하고, 초록·노랑·빨강은 상태를 말할 때만 쓴다. 숫자는 `tabular-nums`로 우측 정렬한다. 같은 화면이 인도네시아어와 한국어로 나오므로 문구 길이가 변해도 표와 버튼이 깨지지 않아야 한다.

색, 폰트, 모서리, 그림자의 값은 「ASCENDO Brand Identity Design Guidelines」에서 온 것이며 임의로 바꾸지 않는다. 가이드가 바뀌면 `src/assets/main.css`와 이 문서를 함께 고친다. 라이트 모드 전용이다.

**Key Characteristics:**
- 평면 우선. 그림자는 떠 있는 요소(드롭다운, 토스트, 모달)에만 쓴다.
- 강조색은 BI 블루(#0062C6) 하나다.
- 표가 중심이다. 헤더 아래 2px 블루 괘선, 가로 구분선만, 합계 행은 연한 블루로 강조한다.
- 상태는 soft 배경 + 진한 글자 + 테두리 세 가지를 한 세트로 표시한다.
- 화면에서 색을 직접 쓰지 않고 시맨틱 변수·유틸리티 클래스로만 참조한다.

## Colors

BI 블루와 다크 그레이, 거기서 파생한 회색 단계, 상태 3색으로 이루어진 절제된 팔레트다. 원본 BI 색(블루, 다크 그레이, 화이트)만 변경 금지이고 나머지는 파생값이다.

### Primary
- **BI Blue** (#0062c6): 링크, 활성 메뉴, 카드 제목의 세로선, 표 헤더 아래 괘선, 합계 행 글자, 상단 액센트 바. 화면 대부분은 회색과 흰색이어야 하며 파랑은 가장 중요한 곳에만 나타난다.
- **Blue Pressed** (#0053a8 hover, #00458b active): 버튼 상태.
- **Blue Wash** (#e6eff9 soft, #f0f6fc 6%): 표 헤더·행 hover(6%), 활성 메뉴·배지·합계 행(soft).
- **Blue Ring** (#99c0e8): 포커스 링과 info 테두리.

### Neutral
- **Dark Gray Ink** (#333333): 본문과 제목. 흰 바탕에서 12.6:1.
- **Quiet Gray** (#666666): 부제, 단위, placeholder, 보조 정보. 5.7:1.
- **Desk Gray** (#f5f5f5): 페이지 바탕. 흰 카드가 떠 보이도록 한 단계 어둡다.
- **Paper White** (#ffffff): 카드, 표, 팝오버.
- **Rule Gray** (#d6d6d6): 카드·표·입력창 테두리. **Hairline Gray** (#ebebeb): 표 행 구분선.
- **Wash Grays** (#f3f3f3 secondary, #ebebeb muted): hover 배경, 비활성 영역.

### Status
- **Success** (#1e7b34), **Warning** (#8a5a00), **Danger** (#c62828), **Neutral** (#5f5f5f)는 각각 soft 배경과 테두리를 가진다. 모두 WCAG AA 이상이다. Info는 BI 블루를 그대로 쓴다.
- **Chart**: 블루(당기·자사), 다크 그레이(전기·목표선), 초록, 앰버(#e08a00), 연한 블루(전년·참고). 앰버는 차트 전용이다.

### Named Rules
**The One Blue Rule.** 강조는 BI 블루 하나다. 새 강조색을 만들지 않고, 상태가 아니면 초록·노랑·빨강을 쓰지 않는다.

**The Three-Part Status Rule.** 상태 표시는 soft 배경, 진한 글자, 테두리를 한 세트로 쓴다. 색만으로 상태를 전달하지 않고 텍스트 라벨을 함께 둔다.

**The Variable Rule.** 화면에서 hex를 직접 쓰지 않는다. 변수 또는 그 변수에 매핑된 유틸리티 클래스로 참조한다. 모달 오버레이(`rgb(51 51 51 / 0.5)`)처럼 BI 다크 그레이에서 파생한 값만 예외로 쓴다.

## Typography

**Font:** Noto Sans KR (자체 호스팅, 400/500/700), 대체 Noto Sans, KoPubDotum, Malgun Gothic, Apple SD Gothic Neo, system-ui
**Mono:** 시스템 모노스페이스. `code`와 `pre`에만 쓰고 화면에 노출되는 곳은 없다.

**Character:** BI 지정서체 한 벌로 한글·라틴·숫자를 모두 덮는다. 제목은 Bold, 본문은 Regular로 대비를 만들고 굵기 외의 장식은 쓰지 않는다.

### Hierarchy
- **Modal Title** (700, 20px, tracking -0.025em): 모달 헤더.
- **Card Title** (700, 1.125rem, 좌측 3px 블루 세로선과 10px 안쪽 여백): 카드와 섹션 제목.
- **Body** (400, 14px): 기본 본문. OS 기본 16px에 의존하지 않는다.
- **Table** (400, 13px, 행 38px): 표 셀. 숫자 열은 우측 정렬에 `tabular-nums`, 날짜 열은 ISO 8601 형식에 줄바꿈 금지.
- **Label** (500, 12px): 표 헤더와 보조 정보(`.sub`는 12px muted).
- **Kicker** (500, 11px, tracking 0.06em, 블루): 섹션 앞의 "BS 01" 스타일 번호.
- **Badge** (700, 11px, tracking 0.04em): 상태 배지.

### Named Rules
**The Bold-Only Hierarchy Rule.** 위계는 굵기와 크기로만 만든다. 세미볼드(600)는 700으로 대체되므로 쓰지 않는 것으로 취급한다.

**The Tabular Numbers Rule.** 금액, 수량, 거리 등 숫자는 우측 정렬하고 `tabular-nums`를 쓴다.

## Layout

관리자용 PC 화면이 기준이고 모바일 웹도 깨지지 않는다. 페이지 컨테이너는 `max-w-300`(75rem)에 가운데 정렬이며 안쪽 여백은 `p-4`(모바일)에서 `p-6`(sm 이상)이다. 상단에는 sticky 4px 블루 액센트 바가 있고 그 아래에 앱 헤더가 있다. 배경은 Desk Gray, 콘텐츠는 흰 카드에 담는다.

밀도는 높다. 표 셀 패딩은 9px 12px, 헤더 36px, 행 38px이며 긴 목록은 sticky 헤더로 스크롤해도 열 이름이 보이게 한다. 넓은 표는 `overflow-x-auto`로 가로 스크롤하고 열 폭은 `w-1/6` 같은 비율과 `whitespace-nowrap`으로 고정해 언어가 바뀌어도 열이 흔들리지 않게 한다. 빈 상태 안내는 `colspan` 셀로 자체 여백(py-14)을 갖고, 로딩은 표 자리의 독립 박스가 같은 여백을 쓴다.

## Elevation & Depth

평면 우선이다. 카드, 표, 버튼, 헤더, 입력창에는 그림자가 없고 1px `Rule Gray` 테두리와 배경색 차이로 구분한다. 그림자는 떠 있는 요소에만 쓴다.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 4px 12px rgb(51 51 51 / 0.12)`): 드롭다운, 팝오버, 토스트.
- **Overlay** (`box-shadow: 0 12px 32px rgb(51 51 51 / 0.18)`): 모달.
- **Focus Ring** (`box-shadow: 0 0 0 3px #99c0e8`): 모든 `a, button, input, select, textarea, summary, [tabindex]`의 `:focus-visible`.

### Named Rules
**The Flat-By-Default Rule.** 표면은 평면이다. 그림자는 요소가 다른 요소 위에 떠 있을 때만 쓴다.

## Shapes

직각에 가까운 최소 라운드다. 배지와 태그는 4px(`sm`), 버튼·입력창·드롭다운은 6px(`md`), 카드와 모달은 8px(`lg`)이다. `xl`과 `2xl`도 8px로 고정되어 있어 Tailwind 기본(12·16px)이 새어 나오지 않는다. 완전한 원형은 역할 pill 하나뿐이다. 구분은 1px 테두리가 맡고, 모달만 위쪽에 4px 블루 테두리를 얹는다.

## Components

### Tables (`.asm-table`)
- **Header:** 배경 Blue Wash 6%(#f0f6fc), 12px/500, 높이 36px, 아래 2px BI Blue 괘선. sticky.
- **Rows:** 13px, 높이 38px, 구분선은 `td`의 1px Hairline Gray, 세로선 없음. `data-hover`가 붙은 행에만 hover 배경 Blue Wash 6%. 현재 장착 실적 표는 이름 버튼으로만 열어 행 hover를 쓰지 않는다.
- **Total row:** Blue Wash soft(#e6eff9) 배경, 블루 700 글자.
- **Helpers:** `.sub`(12px muted 보조 정보), `.date`(줄바꿈 금지).

### Status Badges (`.asm-badge--*`)
높이 20px, 4px 라운드, 11px/700, 소프트 배경 + 진한 글자 + 테두리. 종류는 info, success, warning, danger, neutral이다.

### Role Pill (`.asm-pill`)
높이 28px 완전 원형, Blue Wash soft 배경에 블루 700 글자. 사용자 역할(user, staff, admin) 표시에 쓴다.

### Card Title (`.asm-title`)
1.125rem/700, 좌측 3px 블루 세로선. 밑줄이나 배경 강조는 쓰지 않는다.

### Modal (`BaseModal`)
8px 라운드, 1px 테두리, 위쪽 4px 블루 테두리, Overlay 그림자. 오버레이는 다크 그레이 50%. 헤더는 20px/700에 닫기 아이콘 버튼이 있고, 본문 패딩은 24px, 폭은 최대 50.4rem이다. Esc로 닫히고 열릴 때 포커스가 이동하며 닫으면 트리거로 돌아간다.

### Segmented Control (`PeriodFilter`)
라벨이 붙은 36px 분절 컨트롤. 선택은 `bg-secondary` 배경에 700 굵기와 1px 안쪽 링(`ring-1 ring-inset ring-foreground`)으로 표시하고, 서브탭의 파란 선택색(`primary-soft`)과 섞지 않는다. 선택 관용구는 "중립 배경 + 진한 안쪽 링"이다. hover는 같은 `bg-secondary`에 링 없이 두어 선택과 구분하며 파란색을 쓰지 않는다. "필터 적용 중" 표시는 버튼 뒤 고정 슬롯(`min-w-24`, 비활성일 때 `invisible`)에 두어 나타나도 버튼이 움직이지 않는다. 비활성은 선택 링을 풀고 사유(note)를 같은 슬롯에 적는다.

### Scope Tag (`ScopeTag`)
모달 표 바로 위 한 줄. `asm-badge asm-badge--neutral`에 기간 범위를 적고, 옆에 "전체 기간 보기" 텍스트 버튼(모달 로컬 상태)을 둔다. 기간 필터가 적용되는 표가 있는 모달(고객 매출·요청고객)에서 같은 위치를 쓰며, 월별 모달은 필터와 무관해 쓰지 않는다. 토글은 높이 24px 이상이고 전환 결과를 `role=status`로 알린다.

### KPI Strip
장착 실적 탭 표 위의 4칸 `<dl>`. 칸은 `min-h-18`, 값은 `text-lg` 700 굵기, 증감 수치는 `text-sm` 500 굵기이고, 가려진 증감 문구만 `text-xs`다. 위 안내 블록은 범위 줄과 비교 기준 줄(`min-h-4`)을 항상 예약해 기간을 바꿔도 아래가 밀리지 않는다. 로딩 중에는 같은 그리드·`h-18` 칸의 스켈레톤을 보이고, 조회 전용 계정의 증감은 가려졌다는 문구로 대신한다.

### Request Toggle (`+N`)
요청고객이 둘 이상이면 셀 안쪽 `flex` 줄에 첫 이름과 `+N`만 둔다. 이름은 `min-w-0 truncate`로 줄고, 토글은 `shrink-0 min-h-6`이라 긴 이름에도 잘리지 않는다. 펼치면 줄바꿈하며 전체 이름과 "접기"가 보인다. 접근 가능한 이름은 눈에 보이는 글자로 시작하고 상태에 따라 바뀐다(접힘: "+N 요청고객 N곳 더 보기", 펼침: "접기 요청고객 목록"). 보이는 글자를 `aria-hidden`으로 가리지 않고 보충 문구만 `sr-only`로 붙이며, `min-w-6`으로 한 자리 `+N`도 터치 폭을 확보한다. 토글은 펼친 목록(`aria-controls`)과 연결하고, 기간이 바뀌면 모두 접는다.

### Saved-Hidden Toast
저장한 행이 현재 기간·검색에 가려지면 10초 토스트와 "필터 해제" 버튼을 보인다. 판정은 서버가 돌려준 id, 없으면 저장 전후 목록 차이(새 행이 하나일 때만), 그것도 없으면 입력값(날짜·고객·제품) 일치 순서로 한다. 저장 뒤 재조회가 실패하면 판정하지 않는다. 해제하면 장착 실적 탭으로 돌아와 그 행의 페이지로 이동하고, "저장한 행: N페이지"를 먼저 알리고 150ms 뒤 이름 버튼에 포커스를 준다. 행을 찾지 못하면 "저장한 행을 찾지 못했습니다"를 알린다. 행은 4초 동안 작업 열까지 `primary-soft` 배경과 왼쪽 2px 블루 선(`data-highlight`)으로 강조한다. 이 선은 `.asm-title` 3px 세로선 규칙의 유일한 예외이며 표 행에서 4초만 보인다.

### Status Boxes
로딩과 오류는 표 자리에 독립 박스(8px 라운드)로 나온다. 로딩은 `py-14` 여백의 스피너와 한 줄 문구(`role=status`)이고, 오류는 `px-5 py-6` 카드(`role=alert`)에 제목·원인·"다시 시도" 버튼을 둔다. 첫 로딩과 오류 뒤 재시도에만 스피너를 쓰고, 저장·삭제 뒤 재조회는 표를 그대로 둔다. 기간·탭·검색·저장 행 이동 알림은 `role=status`인 sr-only 영역 하나로 낭독하고, 로딩 박스와 ScopeTag의 전환 알림만 따로 둔다.

### Toasts
vue-sonner를 BI 스타일로 덮는다. 흰 배경, 1px 테두리, 좌측 4px 상태 색 바, 6px 라운드, 13px, Float 그림자.

### Brand Motifs
- **Accent Bar** (`.asm-accent-bar`): 4px BI Blue, 페이지 최상단 sticky.
- **Symbol Watermark** (`.asm-motif`): 불투명도 6%(블루 바탕 위에서는 흰색 10%). 로그인, 빈 상태, 오류 화면에만 쓴다.

### Icon Buttons
Lucide 아이콘, 6px 라운드, 패딩 1.5(6px). 평소에는 muted 글자이고 hover에서 secondary 배경과 ink 글자로 바뀐다. 삭제는 hover에서 danger 15% 배경과 danger 글자다.

## Do's and Don'ts

### Do:
- **Do** 모든 색을 시맨틱 변수 또는 유틸리티 클래스(`text-primary`, `bg-card`, `border-border`)로 참조한다.
- **Do** 새 표는 `.asm-table`을 옵트인해 헤더, 행 높이, 괘선, 합계 행을 한 곳의 규격에서 가져온다.
- **Do** 숫자 열은 우측 정렬과 `tabular-nums`를 쓰고, 날짜는 ISO 8601에 줄바꿈 금지로 둔다.
- **Do** 상태는 soft 배경 + 진한 글자 + 테두리 + 텍스트 라벨로 표시한다.
- **Do** 인도네시아어와 한국어 문구 길이가 달라도 열 폭, 버튼, 배지가 유지되는지 확인한다.
- **Do** 조회 전용(user) 역할에서는 마스킹된 값이 비어 보이지 않고 가려졌다는 것이 드러나게 한다.

### Don't:
- **Don't** BI 표에 없는 색을 새로 만들거나 두 번째 강조색을 쓰지 않는다.
- **Don't** 카드, 표, 버튼, 입력창에 그림자를 넣지 않는다. 그림자는 떠 있는 요소에만 쓴다.
- **Don't** 12px를 넘는 라운드를 쓰지 않는다. 카드·모달 최대는 8px이다.
- **Don't** 심볼 워터마크를 데이터 표나 입력 폼 뒤에 깔지 않는다. 가독성이 떨어진다.
- **Don't** 표에 세로 구분선을 긋지 않는다.
- **Don't** 카드 제목을 밑줄이나 배경색으로 강조하지 않는다. 3px 블루 세로선만 쓴다(저장 행 강조의 2px 선은 예외).
- **Don't** 다크 모드를 추가하지 않는다. BI 가이드가 1차 범위에서 제외했다.
