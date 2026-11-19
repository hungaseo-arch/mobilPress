# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

관리자(admin)가 PC 브라우저에서 가장 많이 쓴다. 한국·인도네시아 측 관리자가 고객, 장착 실적, 매출, 예산 집행, 회원을 분석하고 관리하는 일이 중심이다. 현장 직원(staff)의 등록·수정과 조회 전용(user)은 보조 사용자다. 현장의 모바일 사용 비중은 확인되지 않았으므로 모바일 웹도 깨지지 않게 하되 PC를 우선한다.

## Product Purpose

PT Ascendo Internasional의 이동식 타이어 프레스(Mobil Press) 사업 운영 웹앱이다. 고객, 타이어 장착 실적, 매출 분석, 예산 집행, 운영자료, 접속·변경 기록, 회원 관리를 한 화면에서 다룬다. 성공은 관리자가 여러 문서와 시트를 오가지 않고 이 앱 하나로 운영 상태를 파악하고 처리하는 것이다.

## Operating Context

- 작업보고서 PDF와 주행거리계 사진은 Google Drive(Apps Script 웹앱)에 저장한다.
- 운영 모드는 Neon(Postgres Data API + Neon Auth)이고, env가 없으면 localStorage 기반 mock 모드로 동작한다.
- 배포는 GitHub Pages이며 `main` push 시 GitHub Actions가 자동 배포한다.

## Capabilities and Constraints

- UI는 인도네시아어가 기본이고 한국어를 함께 지원한다. 문구 길이가 언어마다 다르므로 레이아웃이 이를 견뎌야 한다.
- 역할은 DB의 `user_roles`로 정한다. 행이 없으면 조회 전용 user다. 접속기록·변경이력·회원관리는 admin 전용이고, 삭제는 admin만 가능하다.
- 조회 전용 계정의 민감 정보 마스킹은 2026-11-20에 해제했다(`MASK_USER_ROLE` 스위치로 재적용 가능). 역할별 권한 차이(등록·수정·삭제·보고서 열람)는 유지한다.
- mock 모드(로그인 없음, 모든 권한)가 env 없이도 동작해야 한다.
- 별도 서버 없이 브라우저에서 백엔드를 직접 호출한다.

## Brand Commitments

ASCENDO BI를 따른다. 색과 폰트의 단일 출처는 brand-guidelines 스킬이다. 폰트는 BI 지정서체인 Noto Sans 계열이며, 웹폰트는 Noto Sans KR을 자체 호스팅한다(`npm run fonts`로 생성).

## Evidence on Hand

- 보고서 기반 시드 데이터가 있다. 앱의 "초기 데이터 등록"으로 채울 수 있다.
- 문서는 README.md, docs/ARCHITECTURE.md, docs/ROLES.md, docs/NEON-SETUP.md에 있다.
- 실제 사용자 수, 사용 빈도, 기기 분포 데이터는 없다. 만들어 내지 않는다.

## Product Principles

1. 관리자가 PC에서 빠르게 훑고 판단할 수 있게 한다. 밀도와 스캔성이 장식보다 앞선다.
2. 권한 경계가 화면에서 분명해야 한다. 조회 전용에서 무엇이 가려지는지 사용자가 알 수 있다.
3. 인도네시아어와 한국어가 동등하게 작동한다. 어느 한쪽 문구에 맞춘 레이아웃을 만들지 않는다.
4. 데이터를 잃거나 오해하게 만드는 동작(삭제, 마스킹, 저장 실패)은 숨기지 않고 명시한다.
5. BI는 일관된 디테일로 드러내고 과한 연출은 하지 않는다.

## Accessibility & Inclusion

확인된 표준은 없다. 인도네시아어·한국어 이중 언어 사용자를 전제로 한다.
