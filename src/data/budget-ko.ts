// 예산 집행(budget_entries)의 항목·비고 한국어 대역 사전.
// DB 저장값은 인도네시아어가 정본이고(db/schema.sql 2b 참고) 여기서는 화면 표시만 바꾼다.
// 사전에 없는 값 — 사용자가 앱에서 새로 등록한 항목 — 은 원문 그대로 노출된다.
// 새 항목을 한국어로 보이게 하려면 인도네시아어 원문을 키로 여기에 한 줄 추가하면 된다.
export const budgetTextKo: Record<string, string> = {
  // ── 항목 ──
  'Pembelian Mobil Colt Diesel Box (Proban)': '콜트디젤 박스 차량 구입 (Proban)',
  'Pembuatan & Pemasangan Mesin Press': '프레스 기계 제작·설치',
  'Ring & Spacer (termasuk mesin press)': '링·스페이서 (프레스 기계 포함)',
  'Perbaikan Per Mobil': '차량 판스프링 수리',
  'Perbaikan Karoseri (cat, stiker, plafon, dinding)': '차체 보수 (도색·스티커·천장·벽면)',
  'Kompresor Listrik 5 HP': '전기 컴프레서 5HP',
  'Air Impact 1" + Selang Angin': '에어 임팩트 1" + 에어호스',
  'Sendok / Congkel Ban (3 pcs)': '타이어 레버 (3개)',
  'Kunci 1 Set + Kacamata + Sarung Tangan': '공구 1세트 + 보안경 + 장갑',
  'Dongkrak Botol 10 Ton': '보틀 잭 10톤',
  'Palu Bodem 5 Kg': '대형 해머 5kg',
  'Kunci Palang, Palu Karet, Ring Pas, Tang, Kunci Inggris': '십자 렌치, 고무망치, 스패너, 펜치, 몽키스패너',
  'Kabel Eterna 25m (baru)': 'Eterna 전선 25m (신규)',
  'Treck Bell (Cargo Lashing 35mm × 2000kg × 6mtr)': '화물 고정 벨트 (35mm × 2000kg × 6m)',
  'Tekiro Recoil Hose (Isian Angin 3 Fungsi)': 'Tekiro 리코일 호스 (3기능 공기주입)',
  'Seal Tape, Obeng, Cincin Klem': '실테이프, 드라이버, 호스클램프',
  'Kunci Sok 24 pcs (baru)': '소켓 렌치 24개 (신규)',
  'WD40 (baru)': 'WD40 (신규)',
  'Helm Putih 2 pcs (baru)': '흰색 안전모 2개 (신규)',
  'Steker Fort 3 Phase (baru)': '3상 플러그 (신규)',
  'APD (Helmet, Rompi, Safety Tool)': '보호장구 (안전모·조끼·안전용품)',
  'Wearpack (3 pcs)': '작업복 (3벌)',
  'Stiker Reflektor Merah & Kuning (baru)': '반사 스티커 적색·황색 (신규)',
  'Safety Shoes (sudah ada)': '안전화 (기보유)',
  'SIM A (2 org) + SIM B1 Umum (3 org)': '운전면허 A종 (2명) + B1 영업용 (3명)',
  'Congkel Ban (20", 24", 24")': '타이어 레버 (20", 24", 24")',
  'Impact + Selang Angin': '임팩트 + 에어호스',
  'Pertamina Dex': '경유 (Pertamina Dex)',
  'Mata Sock 33·30·32·27·26·24·21·20·19·17 mm': '소켓 비트 33·30·32·27·26·24·21·20·19·17mm',
  'Kaca Mata Bening, Adaptor Socket 1"×3/4", Tenka Toolbox No.125 (2 susun), Sarung Tangan Benang (1 lusin), Extention Bar Socket 8" 200mm, Deep Impact Socket 3/4" 6PT 34mm': '투명 보안경, 소켓 어댑터 1"×3/4", Tenka 공구함 No.125 (2단), 면장갑 (1다스), 소켓 연장바 8" 200mm, 딥 임팩트 소켓 3/4" 6각 34mm',
  'Sikat Gagang Plastik, Rompi Jaring Orange, Helm Proyek Putih, Gagang L Handle Socket 3/4", Rachet Handle 3/4" Auto Quick Release': '플라스틱 손잡이 브러시, 주황색 메쉬 조끼, 흰색 안전모, L형 소켓 핸들 3/4", 라쳇 핸들 3/4" 오토 퀵릴리즈',
  'Dongkrak 10 Ton, Palu Bodem 5 Kg': '잭 10톤, 대형 해머 5kg',
  'Wearpack': '작업복',
  'Cargo Lashing 35mm × 2000kg × 6mtr': '화물 고정 벨트 35mm × 2000kg × 6m',
  'Ring Pas 12~24mm, Tang Buaya 10", Kunci Inggris 12", Palu Karet 12oz, Kunci Palang 4': '스패너 12~24mm, 바이스플라이어 10", 몽키스패너 12", 고무망치 12oz, 십자 렌치 4',
  'E-Toll': '통행료 카드 (E-Toll)',
  'Kabel Eterna 3×2.5mm, Solasi Nitto': 'Eterna 전선 3×2.5mm, Nitto 절연테이프',
  'Print Standing Banner + Poster SOP': '배너 출력 + SOP 포스터',
  'Pertalite': '휘발유 (Pertalite)',
  'Parkir': '주차비',
  'Tekiro Recoil Hose, Isian Angin 3 Fungsi': 'Tekiro 리코일 호스, 3기능 공기주입',
  'Seal Tape, Obeng, Cincin Claim': '실테이프, 드라이버, 클램프 링',
  'Kunci Shock 1 Set 24 Pcs, WD40 333ml': '소켓 렌치 1세트 24개, WD40 333ml',
  'Helm': '안전모',
  'Steker 3 Phase': '3상 플러그',
  'Stiker Reflektor': '반사 스티커',
  'Kabel 2×1.5 50 Yard': '전선 2×1.5 50야드',
  'Terminal 2 Lubang (Broco)': '2구 터미널 (Broco)',
  'Kipas Angin Stand Fan (Cosmos)': '스탠드 선풍기 (Cosmos)',
  // ── 비고 ──
  'Selesai': '완료',
  'Termasuk mesin press': '프레스 기계에 포함',
  'Untuk ikat kompresor': '컴프레서 고정용',
  'Untuk keperluan isi angin dari kompresor': '컴프레서 공기주입용',
  'Sudah ada': '기보유',
  'Untuk buka pasang ban dari velg': '휠에서 타이어 탈착용',
  'Untuk buka baut ban': '타이어 볼트 해체용',
  'Untuk BBM Mobil': '차량 연료비',
  'Untuk bongkar pasang ban': '타이어 탈부착용',
  'Untuk perlengkapan operator': '작업자 장비용',
  'Angkat beban forklift': '지게차 하중 인양',
  'Seragam kerja': '작업복',
  'Untuk keperluan bongkar pasang ban': '타이어 탈부착 용도',
  'Untuk transaksi tol': '통행료 결제용',
  'Untuk listrik kompresor': '컴프레서 전원용',
  'SOP · Standing banner': 'SOP · 배너',
  'BBM motor': '오토바이 연료비',
  'Parkir motor': '오토바이 주차비',
  'Untuk buka baut velg': '휠 볼트 해체용',
  'Alat Pelindung Diri (untuk visit)': '개인보호장구 (방문용)',
  'Untuk sambungan listrik ke stop kontak': '콘센트 전원 연결용',
  'Untuk memenuhi standar kendaraan box': '박스차량 기준 충족용',
  'Untuk kabel Roll': '릴 케이블용',
  'Untuk pendinginan area kerja': '작업장 냉방용',
}

// 표기 흔들림(앞뒤 공백, 연속 공백, 대소문자, x/× 혼용)까지 흡수해 사전을 찾는다.
// 같은 항목을 손으로 다시 입력하면 'Kabel 2x1.5' 처럼 미묘하게 달라지기 쉬운데,
// 그때마다 사전에 키를 하나 더 넣지 않아도 되도록 정규화한 키로 한 번 더 조회한다.
function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/[x×]/gi, '×').toLowerCase()
}

const normalizedKo: Record<string, string> = Object.fromEntries(
  Object.entries(budgetTextKo).map(([id, ko]) => [normalize(id), ko]),
)

/** 인도네시아어 원문을 한국어로. 사전에 없으면 원문을 그대로 돌려준다. */
export function budgetKo(text: string): string {
  return budgetTextKo[text] ?? normalizedKo[normalize(text)] ?? text
}
