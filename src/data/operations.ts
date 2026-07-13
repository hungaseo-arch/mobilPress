// 운영자료 탭 정적 데이터 — Mobil Press 전체 보고서(2026-07-08) 기반.
// 인도네시아어(기본) / 한국어 두 벌을 유지합니다. 보고서가 갱신되면 이 파일만 수정하세요.
import type { Lang } from '@/lib/i18n'

export interface OpsGanttItem {
  label: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  duration: string // 소요 시간 라벨 (막대에 강조 표시)
  status: 'done' | 'progress' | 'waiting'
}

export interface OpsGantt {
  rangeStart: string
  rangeEnd: string
  items: OpsGanttItem[]
}

export interface OpsSection {
  title: string
  note?: string
  table?: { headers: string[]; rows: string[][] }
  steps?: { title: string; items: string[] }[]
  gantt?: OpsGantt
  /** 섹션 제목 옆 버튼으로 여는 참조 모달 (예: 지그 규격) */
  modal?: { buttonLabel: string; title: string; table: { headers: string[]; rows: string[][] }; note?: string }
  /** true 면 표의 첫 번째 열(분류)을 기준으로 아코디언 그룹핑 */
  groupByFirstColumn?: boolean
}

export interface OpsTab {
  key: string
  label: string
  sections: OpsSection[]
  /** true 면 섹션(표)을 넓은 화면에서 한 행에 2개씩 배치 */
  pairSections?: boolean
}

const tabsKo: OpsTab[] = [
  {
    key: 'team',
    label: '① 팀 구성',
    sections: [
      {
        title: '팀 구성 (총괄: SEO)',
        table: {
          headers: ['이름', '소속', '근무지', '역할', '자격 (면허증)'],
          rows: [
            ['Riski', '영업팀 (Manager Sales)', '자카르타', '수주 영업 · 방문 일정 관리 · 가격 책정 · 코디네이터', 'SIM A'],
            ['Ranggi', '영업팀', '자카르타', '고객 방문 · 현장 조율', 'SIM B1'],
            ['Wisnu', '영업팀', '자카르타', '문서화 · 영업 지원', '-'],
            ['Firman', '운영팀 (General Manager)', '까라왕', '모빌 프레스 운영 · 차량/기계 유지보수 · 작업 보고', 'SIM A'],
            ['Harun', '운영팀', '까라왕', '운영 · 유지보수 · 작업 보고', 'SIM B1 Umum'],
            ['Arun', '운영팀', '까라왕', '운영 · 유지보수 · 작업 보고', 'SIM A'],
          ],
        },
        note: '매주 월요일 Sales Meeting 후 Mobil Press Review 진행 | 시험 운영 1개월: 하루 1개소 목표 (20개소)',
      },
    ],
  },
  {
    key: 'budget',
    label: '② 예산 집행',
    sections: [
      {
        title: '예산 요약',
        table: {
          headers: ['구분', '금액 (Rp)', '비고'],
          rows: [
            ['Grand Total 집행액', '358,054,129', '차량 + 공구'],
            ['차량·설비', '321,431,640', '완료 100%'],
            ['공구 (운영 예산)', '36,622,489', '—'],
            ['운영 예산 합계', '17,130,474', '사용 12,967,000 | 잔액 4,163,474'],
          ],
        },
      },
      {
        title: '차량·설비',
        table: {
          headers: ['No', '항목', '예산 (Rp)', '실적 (Rp)'],
          rows: [
            ['1', 'Colt Diesel Box 구매 (Proban)', '157,761,640', '157,761,640'],
            ['2', '유압 프레스 제작·설치', '135,120,000', '135,120,000'],
            ['3', 'Ring & Spacer (프레스 포함)', 'Include', 'Include'],
            ['4', '스프링 수리', '800,000', '800,000'],
            ['5', '카로세리 개조 (도장·스티커·플라폰·벽면)', '27,750,000', '27,750,000'],
            ['', '차량·설비 소계', '321,431,640', '321,431,640'],
          ],
        },
      },
      {
        title: '공구·장비 (운영 예산)',
        table: {
          headers: ['항목', '예산 (Rp)'],
          rows: [
            ['전동 컴프레셔 5 HP', '21,289,489'],
            ['Air Impact 1" + 에어 호스', '2,850,000'],
            ['타이어 주걱/콩켈 (3pcs)', '267,000'],
            ['공구 세트 + 안전경 + 장갑', '1,403,500'],
            ['보틀 잭 10톤', '580,000'],
            ['해머 5kg', '435,000'],
            ['크로스렌치·고무망치·링파스·플라이어·영국렌치', '485,500'],
            ['전선 Eterna 25m', '660,000'],
            ['소켓 렌치 24pcs', '780,000'],
            ['WD40', '77,500'],
            ['흰 헬멧 2개', '50,000'],
            ['3상 플러그', '25,000'],
            ['APD (헬멧·조끼·안전용품)', '1,332,000'],
            ['작업복 Wearpack 3벌', '555,000'],
            ['반사 스티커 적색·황색', '1,260,000'],
            ['Safety Shoes (기보유)', '0'],
            ['SIM A (2명) + SIM B1 Umum (3명)', '4,572,000'],
            ['공구 소계', '36,622,489'],
          ],
        },
        note: '✔ 운영 예산 합계 Rp 17,130,474 | 사용 Rp 12,967,000 | 잔액 Rp 4,163,474',
      },
      {
        title: '운영 예산 지출 내역 (연료·통행료 등)',
        table: {
          headers: ['날짜', '항목', '수량', '금액 (Rp)', '비고'],
          rows: [
            ['2026-04-10', 'Sendok Congkel Ban', '3 pcs', '267,000', ''],
            ['2026-04-16', 'Impact + 에어 호스', '1 pcs', '2,850,000', ''],
            ['2026-04-17', 'Pertamina Dex (연료)', '13,78 L', '200,000', ''],
            ['2026-05-05', '공구 세트 + 안전경 + 장갑', '1 Set', '1,403,500', ''],
            ['2026-05-13', 'Safety Tools (조끼·헬멧·소켓·라쳇)', 'All', '1,332,000', ''],
            ['2026-05-18', '보틀 잭 10톤', '1 pcs', '580,000', ''],
            ['2026-05-18', '해머 5kg', '1 pcs', '435,000', ''],
            ['2026-05-18', 'Wearpack', '3 pcs', '555,000', ''],
            ['2026-06-05', 'Treck Bell', '3 pcs', '525,000', ''],
            ['2026-06-05', '공구 (링파스 + 크로스렌치)', '11 pcs', '486,000', ''],
            ['2026-06-18', 'Pertamina Dex (연료)', '10,08 L', '250,000', ''],
            ['2026-06-18', 'E-Toll', '1', '100,000', ''],
            ['2026-06-18', 'Tol Bekasi Timur', '1', '9,500', ''],
            ['2026-06-18', 'Tol Cikunir 4', '1', '17,000', ''],
            ['2026-06-25', '전선 Eterna 3×2.5mm', '25 m', '660,000', '컴프레셔 전선 연결'],
            ['2026-06-25', 'Solasi Nitto', '1 pcs', '13,000', ''],
            ['2026-06-29', 'Pertamina Dex (연료)', '20,16 L', '501,000', ''],
            ['2026-06-29', '스탠딩 배너 + SOP 포스터 인쇄', '3 pcs', '555,500', ''],
            ['2026-06-29', 'Pertalite (오토바이 연료)', '3,3 L', '33,000', ''],
            ['2026-06-29', '주차', '1', '2,000', ''],
            ['2026-06-30', '소켓 렌치 1 Set 24 pcs', '1 Set', '780,000', ''],
            ['2026-06-30', 'WD40', '1 pcs', '77,500', ''],
            ['2026-06-30', '흰 헬멧', '2 pcs', '50,000', ''],
            ['2026-06-30', '3상 플러그', '1 pcs', '25,000', ''],
            ['2026-07-04', '반사 스티커 적색·황색', '1 pcs', '1,260,000', '박스 차량 규정'],
            ['', '운영 실적 합계', '', '12,967,000', ''],
          ],
        },
      },
    ],
  },
  {
    key: 'tools',
    label: '③ 공구',
    sections: [
      {
        title: '공구 전체 목록',
        modal: {
          buttonLabel: '지그 규격 (Ring/Spacer)',
          title: 'Ring / Spacer 표준 규격 (mm)',
          table: {
            headers: ['벨그', '하단 Spacer OD/ID', '하단 T', '상단 Spacer OD/ID', '상단 T', 'Ring Lock'],
            rows: [
              ['8"', 'OD 180', '110', 'ID 270', '250', '공용'],
              ['9"', 'OD 210', '250', 'ID 300', '250', '공용'],
              ['10"', 'OD 220', '300', 'ID 300', '250', '공용'],
              ['12"', 'OD 275', '300', 'ID 400', '230', '공용'],
              ['15" 분리(Bongkar)', 'ID 300', '250', 'ID 480', '240', '전용'],
              ['15" 장착(Pasang)', 'OD 430', '240', 'ID 480', '240', '전용'],
            ],
          },
          note: 'OD=외경, ID=내경, T=높이(mm) | 15" 벨그: 분리와 장착 시 하단 스파이서 규격 상이 — 반드시 구분 | 8"~15" 전 사이즈 테스트 완료 ✔',
        },
        groupByFirstColumn: true,
        table: {
          headers: ['분류', '항목', '규격', '수량', '금액 (Rp)'],
          rows: [
            ['렌치·소켓', 'Kunci Shock 1 Set 24 pcs', '완전 세트', '1 Set', '780,000'],
            ['렌치·소켓', '링파스 + 크로스렌치', '14"', '11 pcs', '486,000'],
            ['타이어 탈착', 'Sendok / Congkel Ban (Tekiro)', '20 & 24 mm', '3 pcs', '267,000'],
            ['타이어 탈착', '해머 Palu Bodem (Krisbow)', '5 KG', '1 pcs', '435,000'],
            ['타이어 탈착', '고무망치', '-', '1 pcs', '-'],
            ['타이어 탈착', '보틀 잭 (Krisbow)', '10 Ton', '1 pcs', '580,000'],
            ['에어 공구', 'Kompresor Shark 5 HP', '5 HP', '1 pcs', '21,289,489'],
            ['에어 공구', 'Air Impact (Orange)', '1"', '1 pcs', '2,850,000'],
            ['에어 공구', 'Kabel Eterna 3×2.5mm', '25 m', '1', '660,000'],
            ['에어 공구', '3상 플러그', '-', '1 pcs', '25,000'],
            ['결박·기타', 'Treck Bell', '6 M', '3 pcs', '525,000'],
            ['결박·기타', 'WD40', '-', '1 pcs', '77,500'],
            ['안전장비', '헬멧·조끼·Safety Tool', '-', 'Set', '1,332,000'],
            ['안전장비', '흰 헬멧', '-', '2 pcs', '50,000'],
            ['안전장비', '장갑 + 안전경', '-', 'Set', '-'],
            ['안전장비', 'Wearpack (Asgard)', 'XXXL', '3 pcs', '555,000'],
            ['안전장비', '반사 스티커 적색·황색', '-', '1 set', '1,260,000'],
            ['안전장비', 'Safety Shoes (기보유)', '-', '-', '-'],
          ],
        },
      },
    ],
  },
  {
    key: 'schedule',
    label: '④ 일정표',
    sections: [
      {
        title: '진행 일정 간트차트 — 소요 시간 기준',
        gantt: {
          rangeStart: '2026-04-01',
          rangeEnd: '2026-09-30',
          items: [
            { label: '① 카로세리 수리·개조', start: '2026-04-01', end: '2026-05-31', duration: '약 2개월', status: 'done' },
            { label: '② 차량 서비스 (오일·튠업)', start: '2026-05-15', end: '2026-05-31', duration: '약 2주', status: 'done' },
            { label: '③ 운영자 교육', start: '2026-06-01', end: '2026-06-14', duration: '약 2주', status: 'done' },
            { label: '④ 고객 테스트 장착', start: '2026-06-15', end: '2026-06-28', duration: '약 2주', status: 'done' },
            { label: '⑤ 🚀 정식 운영 개시', start: '2026-06-29', end: '2026-09-30', duration: '가동 중 (6월 말~)', status: 'done' },
            { label: '⑥ 차량 추가 서비스 (연료탱크·필터)', start: '2026-06-25', end: '2026-07-05', duration: '약 10일', status: 'done' },
            { label: '⑦ STNK 명의변경 (BBN)', start: '2026-06-15', end: '2026-07-15', duration: '최대 21 영업일', status: 'progress' },
            { label: '⑧ KIR 차량 검사', start: '2026-07-16', end: '2026-07-20', duration: '약 2일 · BBN 완료 후', status: 'waiting' },
            { label: '⑨ IBM 하역 허가', start: '2026-07-16', end: '2026-07-20', duration: '약 2 영업일 · BBN 완료 후', status: 'waiting' },
            { label: '⑩ BPKB 발급', start: '2026-06-15', end: '2026-09-15', duration: '약 3개월 (운행 지장 없음)', status: 'progress' },
          ],
        },
        note: '✔ 정식 운영 개시 완료 — 2026년 6월 말부터 서비스 가동 | ⚠️ STNK 명의변경 완료 후 KIR · IBM 순차 진행',
      },
    ],
  },
  {
    key: 'sop',
    label: '⑤ SOP',
    sections: [
      {
        title: '작업 절차 SOP — 유압 프레스 솔리드 타이어 교체',
        steps: [
          {
            title: '1. K3 (안전) 준비',
            items: [
              '포크리프트를 평탄·단단·미끄럽지 않은 바닥에 주차',
              '포크 지면에 내리고 엔진 정지',
              '주차 브레이크 체결, 교체 안 하는 바퀴에 고임목',
              'PPE 착용: 안전화·장갑·작업복',
              '공구 준비: 소켓 렌치, 유압 잭, 에어 임팩트',
            ],
          },
          {
            title: '2. 프레스 기동',
            items: ['차량 엔진 시동', '클러치 밟고 → PTO 레버 당기기', '시동키 옆 검정 버튼으로 RPM 2,000 조정'],
          },
          {
            title: '3. 휠·타이어 탈거',
            items: [
              '휠 볼트 느슨하게 풀기 (잭 설치 전 완전 탈거 금지)',
              '제조사 지정 잭 포인트에 유압 잭 배치',
              '타이어가 지면에서 떨어질 때까지 들어올리기',
              '너트를 대각선 교차 순서로 탈거 → 휠·타이어 분리',
            ],
          },
          {
            title: '4. 타이어 교체',
            items: [
              '스파이서 하단(벨그 사이즈에 맞게)을 프레스에 배치',
              '그 위에 휠+타이어 올리기',
              '타이어 사이드월 위에 스파이서 상단 올리기',
              '유압 레버 당겨 압력 적용 (스플릿 휠: 휠 분리 / 원피스 휠: 링 분리)',
              '타이어 완전 분리까지 압력 유지',
              '신품 타이어 역순 조립',
            ],
          },
        ],
        note: '최소 청구: Rp 500,000/방문 | 목표: 주문 다음 날 (H+1) | K3 준수 — 안전 최우선',
      },
    ],
  },
  {
    key: 'pricing',
    label: '⑥ 서비스 요금',
    pairSections: true,
    sections: [
      {
        title: '서비스 요금표',
        table: {
          headers: ['림 사이즈', '기본 요금/타이어 (Rp)', '4~7 pcs', '8~15 pcs', '16 pcs↑'],
          rows: [
            ['Rim 8"', '200,000', '5%', '10%', '15%'],
            ['Rim 9"', '200,000', '5%', '10%', '15%'],
            ['Rim 10"', '350,000', '5%', '10%', '15%'],
            ['Rim 12"', '350,000', '5%', '10%', '15%'],
            ['Rim 15"', '400,000', '-', '-', '-'],
          ],
        },
        note: '최소 청구: Rp 500,000/방문 | 기존 고객 할인: Rp 50,000',
      },
      {
        title: '출동비 (Zone별)',
        table: {
          headers: ['Zone', '거리', '출동비 (Rp)'],
          rows: [
            ['Zone 1', '0~20 km', '100,000'],
            ['Zone 2', '20~50 km', '150,000'],
            ['Zone 3', '50~100 km', '300,000'],
            ['Zone 4', '>100 km', '협의'],
          ],
        },
      },
      {
        title: '긴급 요금',
        table: {
          headers: ['긴급 조건', '추가 요금 (Rp)'],
          rows: [
            ['업무시간 외 (18:00–06:00)', '+500,000'],
            ['주말·공휴일', '+750,000'],
            ['긴급 호출 4시간 이내', '+1,000,000'],
          ],
        },
      },
      {
        title: '시험 운영',
        table: {
          headers: ['구분', '내용'],
          rows: [
            ['시험 운영', '1개월, 하루 1개소 (20개소)'],
            ['시험 할인', '50% (서비스 + 출동비)'],
            ['일일 최소 목표', '2개소 / 4 pcs'],
            ['리드타임', 'H+1'],
          ],
        },
      },
      {
        title: '프로모션',
        table: {
          headers: ['구분', '내용'],
          rows: [
            ['프로모션 기간', '6개월'],
            ['프로모션 서비스 할인', '30%'],
            ['프로모션 출동비 할인', 'Rp 100,000'],
          ],
        },
      },
    ],
  },
  {
    key: 'visits',
    label: '⑦ 고객 방문',
    sections: [
      {
        title: '고객 방문 인텔리전스 (잠재 고객)',
        table: {
          headers: ['날짜', '회사명', '업종', '경쟁사 Press 정보', '시장 가격', '주요 인사이트'],
          rows: [
            [
              '2026-04-14',
              'PT. Tonggak Modern Dakara (Bp. Sangga)',
              '포크리프트 타이어 렌탈·판매, Diamond 유통',
              'Wisma Ban, Surya Mas Agung (Cikarang)',
              'Rim 8-9: 150K | Rim 10-12: 250K | Rim 15: 350K | Rim 20: 500K',
              '50 pcs/월 · 야간·주말 주문 많음 · 볼트 슬립·절단 리스크 → 벨그 교체 요구 · 포크리프트 장착 +50K · 4 pcs 30분',
            ],
            [
              '2026-04-14',
              'PT. Piramid Indo Raya',
              '포크리프트 렌탈·판매 (30+대), 오일 판매',
              '-',
              '-',
              '스마랑·수라바야 지점 · 5톤 포크리프트 후륜 7.00-12 내구성 문제',
            ],
            [
              '2026-04-14',
              'PT. Adya Bisnis Solusindo',
              '포크리프트 렌탈·판매 (20+대)',
              '-',
              '-',
              '스마랑·수라바야 지점 · 영업 2인 (오너 포함)',
            ],
            [
              '2026-05-06',
              'PT. Kantka Lestari Energi (Bp. Chris Yosafat)',
              '산업용 타이어·오일·연료·배터리 공급',
              'Sinar Bahagia (고정), Pak Pur · Pak Afib (이동)',
              'Rim 8-10: 175K | Up 10": 300K',
              'Diamond·BS·Armor 취급 · 30 pcs/월 · 고객: Sunter·Balaraja·Cikarang · 2개 40분 · H+2~3 · 전동 임팩트 사용 · 고무 완충재·컨베이어 커팅 필요',
            ],
            [
              '2026-05-07',
              'PT. Tonggak Modern Dakara (방문 2회차)',
              '렌탈·판매, 전 브랜드 100 pcs/월',
              'Solid King Bekasi (이동), Maxam Tangerang (이동)',
              'Rim 8-9: 150K | Rim 10: 200K | Rim 12-15: 250K | Rim 20: 500K (+50K 출동 시)',
              '최소 주문 4 pcs · 스파어파츠 판매 · Ascendo 가격: 스마랑 경쟁 가능, 자카르타는 어려움',
            ],
          ],
        },
        note: '📊 경쟁사 분석: 시장 가격 대비 Ascendo 30~50K 높음 → 프리미엄 + 방문 서비스로 포지셔닝 | 대부분 고정 press (이동 불가) → Ascendo 핵심 강점: 현장 방문 | 일부 모빌 프레스는 컴프레셔 없음 → Ascendo가 더 완비 | 주요 리스크: 벨그·볼트 손상 → SOP·기술 숙련도 철저 관리 필요',
      },
    ],
  },
]

const tabsId: OpsTab[] = [
  {
    key: 'team',
    label: '① Tim',
    sections: [
      {
        title: 'Struktur Tim (Penanggung Jawab: Mr. SEO JH)',
        table: {
          headers: ['Nama', 'Tim', 'Lokasi Kerja', 'Tugas', 'Lisensi (SIM)'],
          rows: [
            ['Riski', 'Tim Sales (Manager Sales)', 'Jakarta', 'Cari order (sales) · Scheduling kunjungan · Pricing · Koordinator', 'SIM A'],
            ['Ranggi', 'Tim Sales', 'Jakarta', 'Kunjungan customer · Koordinasi lapangan', 'SIM B1'],
            ['Wisnu', 'Tim Sales', 'Jakarta', 'Dokumentasi · Support sales', '-'],
            ['Firman', 'Tim Operasional (General Manager)', 'Karawang', 'Operasional Mobil Press · Maintenance kendaraan & mesin · Report kegiatan', 'SIM A'],
            ['Harun', 'Tim Operasional', 'Karawang', 'Operasional · Maintenance · Report kegiatan', 'SIM B1 Umum'],
            ['Arun', 'Tim Operasional', 'Karawang', 'Operasional · Maintenance · Report kegiatan', 'SIM A'],
          ],
        },
        note: 'Realisasi anggaran SIM: SIM A 2 org + SIM B1 Umum 3 org (Rp 4,572,000) — pembagian per orang belum tercantum di laporan, mohon dikonfirmasi | Review setiap Senin setelah Meeting Sales | Target uji coba: 1 bulan, 1 tempat/hari (20 tempat) | Perubahan: Tim Operasional diperbarui — Harun & Arun bergabung',
      },
    ],
  },
  {
    key: 'budget',
    label: '② Anggaran',
    sections: [
      {
        title: 'Ringkasan Anggaran',
        table: {
          headers: ['Kategori', 'Jumlah (Rp)', 'Keterangan'],
          rows: [
            ['Grand Total Realisasi', '358,054,129', 'Kendaraan + Tools'],
            ['Kendaraan & Mesin', '321,431,640', 'Selesai 100%'],
            ['Tools (Budget Ops)', '36,622,489', '—'],
            ['Total Budget Ops', '17,130,474', 'Terpakai 12,967,000 | Sisa 4,163,474'],
          ],
        },
      },
      {
        title: 'Kendaraan & Mesin',
        table: {
          headers: ['No', 'Item', 'Budget (Rp)', 'Realisasi (Rp)'],
          rows: [
            ['1', 'Pembelian Mobil Colt Diesel Box (Proban)', '157,761,640', '157,761,640'],
            ['2', 'Pembuatan & Pemasangan Mesin Press', '135,120,000', '135,120,000'],
            ['3', 'Ring & Spacer (termasuk mesin press)', 'Include', 'Include'],
            ['4', 'Perbaikan Per Mobil', '800,000', '800,000'],
            ['5', 'Perbaikan Karoseri (cat, stiker, plafon, dinding)', '27,750,000', '27,750,000'],
            ['', 'Subtotal Kendaraan & Mesin', '321,431,640', '321,431,640'],
          ],
        },
      },
      {
        title: 'Tools & Perlengkapan (Budget Operasional)',
        table: {
          headers: ['Item', 'Budget (Rp)'],
          rows: [
            ['Kompresor Listrik 5 HP', '21,289,489'],
            ['Air Impact 1" + Selang Angin', '2,850,000'],
            ['Sendok / Congkel Ban (3 pcs)', '267,000'],
            ['Kunci 1 Set + Kacamata + Sarung Tangan', '1,403,500'],
            ['Dongkrak Botol 10 Ton', '580,000'],
            ['Palu Bodem 5 Kg', '435,000'],
            ['Kunci Palang, Palu Karet, Ring Pas, Tang, Kunci Inggris', '485,500'],
            ['Kabel Eterna 25m (baru)', '660,000'],
            ['Kunci Sok 24 pcs (baru)', '780,000'],
            ['WD40 (baru)', '77,500'],
            ['Helm Putih 2 pcs (baru)', '50,000'],
            ['Steker Fort 3 Phase (baru)', '25,000'],
            ['APD (Helmet, Rompi, Safety Tool)', '1,332,000'],
            ['Wearpack (3 pcs)', '555,000'],
            ['Stiker Reflektor Merah & Kuning (baru)', '1,260,000'],
            ['Safety Shoes (sudah ada)', '0'],
            ['SIM A (2 org) + SIM B1 Umum (3 org)', '4,572,000'],
            ['Subtotal Tools', '36,622,489'],
          ],
        },
        note: '✔ Total Budget Ops Rp 17,130,474 | Terpakai Rp 12,967,000 | Sisa Saldo Rp 4,163,474',
      },
      {
        title: 'Realisasi Anggaran Operasional (BBM, Tol, dll)',
        table: {
          headers: ['Tanggal', 'Item', 'Qty', 'Total (Rp)', 'Keterangan'],
          rows: [
            ['2026-04-10', 'Sendok Congkel Ban', '3 pcs', '267,000', ''],
            ['2026-04-16', 'Impact + Selang Angin', '1 pcs', '2,850,000', ''],
            ['2026-04-17', 'Pertamina Dex (BBM)', '13,78 L', '200,000', ''],
            ['2026-05-05', 'Tools Kunci + Kacamata + Sarung Tangan', '1 Set', '1,403,500', ''],
            ['2026-05-13', 'Safety Tools (Rompi, Helm, Soket, Rachet)', 'All', '1,332,000', ''],
            ['2026-05-18', 'Dongkrak 10 Ton', '1 pcs', '580,000', ''],
            ['2026-05-18', 'Palu Bodem 5 Kg', '1 pcs', '435,000', ''],
            ['2026-05-18', 'Wearpack', '3 pcs', '555,000', ''],
            ['2026-06-05', 'Treck Bell', '3 pcs', '525,000', ''],
            ['2026-06-05', 'Tools Kunci (Ring Pas + Palang)', '11 pcs', '486,000', ''],
            ['2026-06-18', 'Pertamina Dex (BBM)', '10,08 L', '250,000', ''],
            ['2026-06-18', 'E-Toll', '1', '100,000', ''],
            ['2026-06-18', 'Tol Bekasi Timur', '1', '9,500', ''],
            ['2026-06-18', 'Tol Cikunir 4', '1', '17,000', ''],
            ['2026-06-25', 'Kabel Eterna 3×2.5mm', '25 m', '660,000', 'Sambungan listrik kompresor'],
            ['2026-06-25', 'Solasi Nitto', '1 pcs', '13,000', ''],
            ['2026-06-29', 'Pertamina Dex (BBM)', '20,16 L', '501,000', ''],
            ['2026-06-29', 'Print Standing Banner + Poster SOP', '3 pcs', '555,500', ''],
            ['2026-06-29', 'Pertalite (BBM Motor)', '3,3 L', '33,000', ''],
            ['2026-06-29', 'Parkir', '1', '2,000', ''],
            ['2026-06-30', 'Kunci Shock 1 Set 24 Pcs', '1 Set', '780,000', ''],
            ['2026-06-30', 'WD40', '1 pcs', '77,500', ''],
            ['2026-06-30', 'Helm Putih', '2 pcs', '50,000', ''],
            ['2026-06-30', 'Steker 3 Phase', '1 pcs', '25,000', ''],
            ['2026-07-04', 'Stiker Reflektor Merah & Kuning', '1 pcs', '1,260,000', 'Standar kendaraan box'],
            ['', 'Total Realisasi Ops', '', '12,967,000', ''],
          ],
        },
      },
    ],
  },
  {
    key: 'tools',
    label: '③ Tools',
    sections: [
      {
        title: 'Daftar Lengkap Peralatan',
        modal: {
          buttonLabel: 'Standar Jig (Ring/Spacer)',
          title: 'Standar Pemakaian Ring / Spacer (mm)',
          table: {
            headers: ['Velg', 'Spacer Bawah OD/ID', 'T', 'Spacer Atas OD/ID', 'T', 'Ring Lock'],
            rows: [
              ['8"', 'OD 180', '110', 'ID 270', '250', 'Umum'],
              ['9"', 'OD 210', '250', 'ID 300', '250', 'Umum'],
              ['10"', 'OD 220', '300', 'ID 300', '250', 'Umum'],
              ['12"', 'OD 275', '300', 'ID 400', '230', 'Umum'],
              ['15" Bongkar', 'ID 300', '250', 'ID 480', '240', 'Khusus'],
              ['15" Pasang', 'OD 430', '240', 'ID 480', '240', 'Khusus'],
            ],
          },
          note: 'OD=Diameter Luar, ID=Diameter Dalam, T=Tinggi (mm) | Velg 15": Spacer bawah berbeda antara Bongkar dan Pasang — wajib dibedakan | Testing 8"–15" semua sudah OK ✔',
        },
        groupByFirstColumn: true,
        table: {
          headers: ['Kategori', 'Item', 'Ukuran', 'Jml', 'Total (Rp)'],
          rows: [
            ['Kunci & Soket', 'Kunci Shock 1 Set 24 Pcs (baru)', 'Lengkap', '1 Set', '780,000'],
            ['Kunci & Soket', 'Kunci Ring Pas + Kunci Palang', '14"', '11 pcs', '486,000'],
            ['Alat Lepas Ban', 'Sendok / Congkel Ban (Tekiro)', '20 & 24 mm', '3 pcs', '267,000'],
            ['Alat Lepas Ban', 'Palu Bodem (Krisbow)', '5 KG', '1 pcs', '435,000'],
            ['Alat Lepas Ban', 'Palu Karet', '-', '1 pcs', '-'],
            ['Alat Lepas Ban', 'Dongkrak Botol (Krisbow)', '10 Ton', '1 pcs', '580,000'],
            ['Alat Udara', 'Kompresor Shark 5 HP', '5 HP', '1 pcs', '21,289,489'],
            ['Alat Udara', 'Air Impact (Orange)', '1"', '1 pcs', '2,850,000'],
            ['Alat Udara', 'Kabel Eterna 3×2.5mm (baru)', '25 m', '1', '660,000'],
            ['Alat Udara', 'Steker Fort 3 Phase (baru)', '-', '1 pcs', '25,000'],
            ['Pengikat & Lainnya', 'Treck Bell', '6 M', '3 pcs', '525,000'],
            ['Pengikat & Lainnya', 'WD40 (baru)', '-', '1 pcs', '77,500'],
            ['APD', 'Helm, Rompi, Safety Tool', '-', 'Set', '1,332,000'],
            ['APD', 'Helm Putih (baru)', '-', '2 pcs', '50,000'],
            ['APD', 'Sarung Tangan + Kacamata', '-', 'Set', '-'],
            ['APD', 'Wearpack (Asgard)', 'XXXL', '3 pcs', '555,000'],
            ['APD', 'Stiker Reflektor Merah & Kuning (baru)', '-', '1 set', '1,260,000'],
            ['APD', 'Safety Shoes (sudah ada)', '-', '-', '-'],
          ],
        },
      },
    ],
  },
  {
    key: 'schedule',
    label: '④ Jadwal',
    sections: [
      {
        title: 'Gantt Chart Jadwal — Fokus Durasi',
        gantt: {
          rangeStart: '2026-04-01',
          rangeEnd: '2026-09-30',
          items: [
            { label: '① Perbaikan & Modifikasi Karoseri', start: '2026-04-01', end: '2026-05-31', duration: '±2 bulan', status: 'done' },
            { label: '② Service Mobil (Oli · Tune Up)', start: '2026-05-15', end: '2026-05-31', duration: '±2 minggu', status: 'done' },
            { label: '③ Operator Training', start: '2026-06-01', end: '2026-06-14', duration: '±2 minggu', status: 'done' },
            { label: '④ Test Pasang di Customer', start: '2026-06-15', end: '2026-06-28', duration: '±2 minggu', status: 'done' },
            { label: '⑤ 🚀 Start Operasional', start: '2026-06-29', end: '2026-09-30', duration: 'Aktif (akhir Juni~)', status: 'done' },
            { label: '⑥ Service Mobil (Tangki solar · Filter)', start: '2026-06-25', end: '2026-07-05', duration: '±10 hari', status: 'done' },
            { label: '⑦ Balik Nama STNK (BBN)', start: '2026-06-15', end: '2026-07-15', duration: 'Maks. 21 hari kerja', status: 'progress' },
            { label: '⑧ KIR Kendaraan', start: '2026-07-16', end: '2026-07-20', duration: '±2 hari · setelah BBN', status: 'waiting' },
            { label: '⑨ Izin Bongkar Muat (IBM)', start: '2026-07-16', end: '2026-07-20', duration: '±2 hari kerja · setelah BBN', status: 'waiting' },
            { label: '⑩ Penerbitan BPKB', start: '2026-06-15', end: '2026-09-15', duration: '±3 bulan (tetap operasional)', status: 'progress' },
          ],
        },
        note: '※ Item tanpa tanggal pasti di laporan diposisikan berdasarkan estimasi dari catatan pembelian/pekerjaan (label durasi adalah acuan) | ✔ Start Operasional sudah berjalan — pelayanan aktif per Juni 2026 | ⚠️ Setelah BBN selesai → KIR & IBM menyusul',
      },
    ],
  },
  {
    key: 'sop',
    label: '⑤ SOP',
    sections: [
      {
        title: 'Prosedur Kerja (SOP) — Penggantian Ban Solid dengan Mesin Press Hidrolik',
        steps: [
          {
            title: '1. Persiapan K3',
            items: [
              'Parkir forklift di permukaan rata, keras, tidak licin',
              'Turunkan garpu ke tanah, matikan mesin',
              'Aktifkan rem parkir, ganjal roda yang tidak diganti',
              'Gunakan APD: safety shoes, sarung tangan, wearpack',
              'Siapkan tools: kunci soket, dongkrak, air impact',
            ],
          },
          {
            title: '2. Menghidupkan Mesin Press',
            items: ['Hidupkan mesin kendaraan', 'Injak kopling → tarik tuas PTO', 'Atur RPM ke 2,000 dengan tombol hitam dekat kunci kontak'],
          },
          {
            title: '3. Melepas Velg & Ban dari Forklift',
            items: [
              'Kendorkan baut roda (jangan lepas sebelum dongkrak terpasang)',
              'Tempatkan dongkrak pada titik angkat pabrikan',
              'Angkat forklift hingga ban tidak menyentuh lantai',
              'Lepas mur roda secara menyilang → lepas velg & ban',
            ],
          },
          {
            title: '4. Mengganti Ban',
            items: [
              'Letakkan spacer bawah (sesuai ukuran velg) di frame mesin press',
              'Letakkan velg + ban di atas spacer',
              'Letakkan spacer atas (sesuai lebar sidewall) di atas ban',
              'Tarik tuas hidrolik untuk memberi tekanan (Velg split: congkel velg / Velg one piece: congkel ring)',
              'Tahan tekanan hingga ban terlepas sepenuhnya',
              'Pasang ban baru — rakitan terbalik',
            ],
          },
        ],
        note: 'Minimum charge: Rp 500,000/kunjungan | Target H+1 dari order | K3 wajib — utamakan keselamatan',
      },
    ],
  },
  {
    key: 'pricing',
    label: '⑥ Harga Jasa',
    pairSections: true,
    sections: [
      {
        title: 'Daftar Harga Jasa',
        table: {
          headers: ['Ukuran Rim', 'Harga/Ban (Rp)', '4~7 pcs', '8~15 pcs', '16 pcs↑'],
          rows: [
            ['Rim 8"', '200,000', '5%', '10%', '15%'],
            ['Rim 9"', '200,000', '5%', '10%', '15%'],
            ['Rim 10"', '350,000', '5%', '10%', '15%'],
            ['Rim 12"', '350,000', '5%', '10%', '15%'],
            ['Rim 15"', '400,000', '-', '-', '-'],
          ],
        },
        note: 'Minimum charge: Rp 500,000/kunjungan | Diskon pelanggan lama: Rp 50,000',
      },
      {
        title: 'Biaya Mobilisasi (per Zone)',
        table: {
          headers: ['Zone', 'Jarak', 'Mobilisasi (Rp)'],
          rows: [
            ['Zone 1', '0~20 km', '100,000'],
            ['Zone 2', '20~50 km', '150,000'],
            ['Zone 3', '50~100 km', '300,000'],
            ['Zone 4', '>100 km', 'Nego'],
          ],
        },
      },
      {
        title: 'Biaya Urgent',
        table: {
          headers: ['Kondisi Urgent', 'Tambahan (Rp)'],
          rows: [
            ['Diluar jam kerja (18:00–06:00)', '+500,000'],
            ['Akhir pekan · Libur Nasional', '+750,000'],
            ['Panggilan darurat <4 jam', '+1,000,000'],
          ],
        },
      },
      {
        title: 'Uji Coba',
        table: {
          headers: ['Keterangan', 'Detail'],
          rows: [
            ['Masa Uji Coba', '1 bulan, 1 tempat/hari (20 tempat)'],
            ['Diskon Uji Coba', '50% (jasa + mobilisasi)'],
            ['Target Harian Minimum', '2 tempat / 4 pcs'],
            ['Lead Time', 'H+1'],
          ],
        },
      },
      {
        title: 'Promosi',
        table: {
          headers: ['Keterangan', 'Detail'],
          rows: [
            ['Masa Promosi', '6 bulan'],
            ['Diskon Promosi Jasa', '30%'],
            ['Diskon Mobilisasi Promosi', 'Rp 100,000'],
          ],
        },
      },
    ],
  },
  {
    key: 'visits',
    label: '⑦ Visit Customer',
    sections: [
      {
        title: 'Rekap Kunjungan Customer (Intelligence Pasar)',
        table: {
          headers: ['Tanggal', 'Perusahaan', 'Jenis Bisnis', 'Info Kompetitor / Press', 'Harga Pasar', 'Insight Penting'],
          rows: [
            [
              '2026-04-14',
              'PT. Tonggak Modern Dakara (Bp. Sangga)',
              'Rental & Jual Ban Forklift, Distributor Diamond',
              'Wisma Ban, Surya Mas Agung (Cikarang)',
              'Rim 8-9: 150K | Rim 10-12: 250K | Rim 15: 350K | Rim 20: 500K',
              '50 pcs/bulan · Banyak order diluar jam kerja & Sabtu-Minggu · Risiko baut slek/doll/patah → customer minta ganti velg · Bongkar pasang di Forklift: +50K · Durasi 4 pcs: 30 menit',
            ],
            [
              '2026-04-14',
              'PT. Piramid Indo Raya',
              'Rental & Sales Forklift (30+ unit), Jual Oli',
              '-',
              '-',
              'Cabang Semarang & Surabaya · Ban 7.00-12 belakang Forklift 5T tidak kuat',
            ],
            [
              '2026-04-14',
              'PT. Adya Bisnis Solusindo',
              'Rental & Sales Forklift (20+ unit)',
              '-',
              '-',
              'Cabang Semarang & Surabaya · 2 sales (termasuk owner)',
            ],
            [
              '2026-05-06',
              'PT. Kantka Lestari Energi (Bp. Chris Yosafat)',
              'Supplier Ban Industri, Oli, BBM, Aki',
              'Sinar Bahagia (stand press), Pak Pur & Pak Afib (mobil press)',
              'Rim 8-10: 175K | Up 10": 300K',
              'Brand: Diamond, BS, Armor · 30 pcs/bulan · Customer di Sunter, Balaraja, Cikarang · Durasi 2 ban: 40 menit · Pelaksanaan H+2-3 · Pakai impact listrik · Perlu bantalan karet & conveyor dipotong',
            ],
            [
              '2026-05-07',
              'PT. Tonggak Modern Dakara (kunjungan ke-2)',
              'Rental & Jual, All Brand: 100 pcs/bln',
              'Solid King Bekasi (mobil press), Maxam Tangerang (mobil press)',
              'Rim 8-9: 150K | Rim 10: 200K | Rim 12-15: 250K | Rim 20: 500K (+50K kalau mobil datang)',
              'Min order 4 pcs · Jual sparepart forklift · Harga Ascendo: Semarang bisa masuk, Jakarta terlalu mahal',
            ],
          ],
        },
        note: '📊 Analisis Kompetitor: Harga Ascendo ±30-50K lebih tinggi → posisikan sebagai premium + mobile service | Mayoritas kompetitor pakai stand press (tidak mobile) → keunggulan utama Ascendo: datang ke lokasi | Beberapa mobil press tanpa kompresor → Ascendo lebih lengkap | Risiko utama: kerusakan velg/baut → SOP & teknik wajib ketat',
      },
    ],
  },
]

export function getOperationsTabs(lang: Lang): OpsTab[] {
  return lang === 'ko' ? tabsKo : tabsId
}
