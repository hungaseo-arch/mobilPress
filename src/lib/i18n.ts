// 경량 2개 국어 지원 (기본: 인도네시아어, 보조: 한국어) — 외부 라이브러리 없음.
import { ref } from 'vue'

export type Lang = 'id' | 'ko'

const STORAGE_KEY = 'mobilpress-lang'

function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'ko' ? 'ko' : 'id' // 1언어: 인도네시아어
}

export const lang = ref<Lang>(initialLang())

export function setLang(next: Lang): void {
  lang.value = next
  localStorage.setItem(STORAGE_KEY, next)
}

const messages: Record<string, { id: string; ko: string }> = {
  'app.company': { id: 'PT Ascendo Internasional', ko: 'PT Ascendo Internasional' },
  'app.title': { id: 'Mobil Press', ko: '모바일 프레스' },

  'tab.customers': { id: 'Info Customer', ko: '고객 정보' },
  'tab.installations': { id: 'Laporan Kerja', ko: '장착 실적' },
  'tab.revenue': { id: 'Analisis Kinerja', ko: '실적 분석' },
  'revenue.byCustomer': { id: 'Pendapatan per Customer', ko: '고객별 매출' },
  'revenue.byMonth': { id: 'Pendapatan Bulanan', ko: '월별 매출' },
  'th.month': { id: 'Bulan', ko: '월' },
  'th.jobs': { id: 'Jumlah Kerja', ko: '작업 건수' },
  'revenue.monthsUnit': { id: 'bulan', ko: '개월' },
  'month.modalTitle': { id: 'Riwayat Pemakaian', ko: '이용 내역' },
  'request.modalTitle': { id: 'Riwayat Permintaan', ko: '요청 내역' },
  'month.rowHint': { id: 'Klik untuk melihat riwayat pemakaian', ko: '클릭하면 이용 내역을 볼 수 있습니다' },
  'th.userCustomer': { id: 'Customer Pengguna', ko: '장착고객' },
  'th.requestCustomer': { id: 'Customer Pemohon', ko: '요청고객' },
  'tab.operations': { id: 'Data Operasional', ko: '운영자료' },

  'seed.empty': {
    id: 'Belum ada data. Anda bisa mulai dengan data awal dari laporan.',
    ko: '등록된 데이터가 없습니다. 보고서 기반 초기 데이터로 시작할 수 있습니다.',
  },
  'seed.button': { id: 'Isi data awal dari laporan', ko: '보고서 기반 초기 데이터 등록' },

  'search.placeholder': { id: 'Cari perusahaan, produk, area...', ko: '회사명, 제품, 지역 검색...' },
  'btn.addInstallation': { id: 'Tambah Pemasangan', ko: '장착 등록' },
  'btn.cancel': { id: 'Batal', ko: '취소' },
  'btn.save': { id: 'Simpan', ko: '등록' },
  'btn.update': { id: 'Perbarui', ko: '수정' },
  'btn.saving': { id: 'Menyimpan...', ko: '저장 중...' },
  'btn.edit': { id: 'Edit', ko: '수정' },
  'btn.delete': { id: 'Hapus', ko: '삭제' },

  loading: { id: 'Memuat data...', ko: '데이터를 불러오는 중...' },

  'th.bizArea': { id: 'Bisnis / Area', ko: '업종 / 지역' },
  'th.vendorPrice': { id: 'Vendor / Harga Pasar', ko: '현재 업체 / 시장가' },
  'th.lastVisit': { id: 'Kunjungan Terakhir', ko: '최근 방문' },
  'th.workDate': { id: 'Tanggal', ko: '작업일' },
  'th.customer': { id: 'Customer', ko: '장착고객' },
  'th.productRim': { id: 'Produk', ko: '제품' },
  'th.qty': { id: 'Qty', ko: '수량' },
  'th.serviceFee': { id: 'Biaya Jasa', ko: '서비스 비용' },
  'th.mobFee': { id: 'Mobilisasi', ko: '출장비' },
  'th.discount': { id: 'Diskon', ko: '할인' },
  'th.received': { id: 'Diterima', ko: '수령액' },
  'th.rank': { id: 'No', ko: '순위' },
  'th.installCustomer': { id: 'Customer Pemasangan', ko: '장착고객' },

  'installations.empty': { id: 'Belum ada laporan kerja.', ko: '등록된 장착 실적이 없습니다.' },
  'revenue.empty': { id: 'Belum ada data pendapatan.', ko: '매출 데이터가 없습니다.' },
  'revenue.rowHint': { id: 'Klik untuk melihat riwayat detail', ko: '클릭하면 상세 히스토리를 볼 수 있습니다' },
  'revenue.total': { id: 'Total', ko: '합계' },
  'revenue.customersUnit': { id: 'customer', ko: '개 장착고객' },
  'revenue.modalTitle': { id: 'Riwayat Pendapatan Detail', ko: '매출 상세 히스토리' },
  'revenue.noHistory': { id: 'Tidak ada riwayat pemasangan.', ko: '장착 이력이 없습니다.' },
  'unit.items': { id: 'item', ko: '건' },

  'status.prospect': { id: 'Prospek', ko: '잠재 고객' },
  'status.active': { id: 'Aktif', ko: '거래 중' },
  'status.completed': { id: 'Selesai', ko: '완료' },
  'status.pending': { id: 'Terjadwal', ko: '예정' },
  'status.cancelled': { id: 'Batal', ko: '취소' },

  'confirm.delete': { id: "Hapus item '{name}'?", ko: "'{name}' 항목을 삭제할까요?" },

  // 고객 폼
  'form.customer.add': { id: 'Tambah Customer', ko: '고객 등록' },
  'form.customer.edit': { id: 'Edit Info Customer', ko: '고객 정보 수정' },
  'form.companyName': { id: 'Nama Perusahaan *', ko: '회사명 *' },
  'form.businessType': { id: 'Jenis Bisnis', ko: '' },
  'form.contactName': { id: 'PIC / Kontak', ko: '담당자' },
  'form.area': { id: 'Area', ko: '지역' },
  'form.branchInfo': { id: 'Cabang / Catatan', ko: '지점/비고' },
  'form.monthlyDemand': { id: 'Kebutuhan Bulanan (pcs)', ko: '월 수요 (pcs)' },
  'form.status': { id: 'Status', ko: '상태' },
  'form.currentPressVendor': { id: 'Vendor Press Saat Ini', ko: '현재 프레스 업체' },
  'form.marketPrice': { id: 'Info Harga Pasar', ko: '시장 가격 정보' },
  'form.insight': { id: 'Insight', ko: '인사이트' },
  'form.lastVisitDate': { id: 'Tanggal Kunjungan Terakhir', ko: '최근 방문일' },

  // 장착 폼
  'form.installation.add': { id: 'Tambah Pemasangan Ban', ko: '타이어 장착 등록' },
  'form.installation.edit': { id: 'Edit Info Pemasangan', ko: '장착 정보 수정' },
  'form.workDate': { id: 'Tanggal Kerja *', ko: '작업일 *' },
  'form.distributor': { id: 'Distributor', ko: '요청고객' },
  'form.customerName': { id: 'Customer *', ko: '장착고객 *' },
  'form.product': { id: 'Produk', ko: '제품' },
  'form.rimSize': { id: 'Ukuran Rim', ko: '림 사이즈' },
  'form.qty': { id: 'Qty (pcs)', ko: '수량 (pcs)' },
  'form.serialNumbers': { id: 'Serial Number', ko: '시리얼 번호' },
  'form.serialPlaceholder': { id: 'contoh: AJ220626269', ko: '예: AJ220626269' },
  'form.workTime': { id: 'Waktu Kerja', ko: '작업 시간' },
  'form.worker': { id: 'Petugas', ko: '작업자' },
  'form.enteredBy': { id: 'Diinput oleh', ko: '입력자' },
  'form.serviceFee': { id: 'Biaya Jasa (Rp)', ko: '서비스 비용 (Rp)' },
  'form.mobilizationFee': { id: 'Biaya Mobilisasi (Rp)', ko: '출장비 (Rp)' },
  'form.discountRate': { id: 'Diskon (%)', ko: '할인율 (%)' },
  'form.receivedAmount': { id: 'Jumlah Diterima (Rp)', ko: '수령액 (Rp)' },
  'form.note': { id: 'Keterangan', ko: '비고' },
  'aria.close': { id: 'Tutup', ko: '닫기' },
  'btn.logout': { id: 'Logout', ko: '로그아웃' },
  'gantt.done': { id: 'Selesai', ko: '완료' },
  'gantt.progress': { id: 'Sedang berjalan', ko: '진행 중' },
  'gantt.waiting': { id: 'Menunggu', ko: '대기' },
  'gantt.today': { id: 'Hari ini', ko: '오늘' },

  // 토스트
  'toast.loadFail': { id: 'Gagal memuat data.', ko: '데이터를 불러오지 못했습니다.' },
  'toast.customerUpdated': { id: 'Info customer diperbarui.', ko: '고객 정보를 수정했습니다.' },
  'toast.customerSaved': { id: 'Customer berhasil didaftarkan.', ko: '고객 정보를 등록했습니다.' },
  'toast.installationUpdated': { id: 'Info pemasangan diperbarui.', ko: '타이어 장착 정보를 수정했습니다.' },
  'toast.installationSaved': { id: 'Pemasangan berhasil didaftarkan.', ko: '타이어 장착 정보를 등록했습니다.' },
  'toast.saveFail': { id: 'Gagal menyimpan.', ko: '저장에 실패했습니다.' },
  'toast.deleted': { id: 'Berhasil dihapus.', ko: '삭제했습니다.' },
  'toast.deleteFail': { id: 'Gagal menghapus.', ko: '삭제에 실패했습니다.' },
  'toast.seedExists': {
    id: 'Sudah ada data terdaftar. Tambahkan item yang diperlukan secara manual.',
    ko: '이미 등록된 데이터가 있습니다. 필요한 항목만 직접 추가하세요.',
  },
  'toast.seedDone': { id: 'Data awal dari laporan berhasil didaftarkan.', ko: '첨부 보고서 기반 초기 데이터를 등록했습니다.' },
  'toast.seedFail': { id: 'Gagal mendaftarkan data awal.', ko: '초기 데이터 등록에 실패했습니다.' },
}

/** 현재 언어의 문자열 반환. {name} 형태 치환 지원. */
export function t(key: string, params?: Record<string, string>): string {
  const entry = messages[key]
  let text = entry ? entry[lang.value] : key
  if (params) {
    for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, v)
  }
  return text
}
