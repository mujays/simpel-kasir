import { Transaksi } from '../types';

/**
 * Format nominal uang Rupiah: Rp1.250.000
 * Pemisah ribuan titik, tanpa desimal
 */
export function formatRupiah(nominal: number): string {
  if (isNaN(nominal) || nominal === null || nominal === undefined) {
    return 'Rp0';
  }
  const rounded = Math.round(nominal);
  const parts = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = rounded < 0 ? '-' : '';
  return `${sign}Rp${parts}`;
}

const BULAN_INDONESIA = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

const BULAN_PANJANG_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format tanggal: 12 Mar 2026
 */
export function formatTanggal(dateStr: string | Date): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';

  const tgl = d.getDate();
  const bln = BULAN_INDONESIA[d.getMonth()];
  const thn = d.getFullYear();

  return `${tgl} ${bln} ${thn}`;
}

/**
 * Format tanggal dan waktu: 12 Mar 2026, 14:30
 */
export function formatTanggalWaktu(dateStr: string | Date): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';

  const tgl = d.getDate();
  const bln = BULAN_INDONESIA[d.getMonth()];
  const thn = d.getFullYear();
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');

  return `${tgl} ${bln} ${thn} ${jam}:${menit}`;
}

/**
 * Format nama bulan dan tahun: September 2026
 */
export function formatBulanTahun(year: number, monthIndex: number): string {
  return `${BULAN_PANJANG_INDONESIA[monthIndex]} ${year}`;
}

/**
 * Mendapatkan string YYYY-MM-DD lokal
 */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generate Nomor Transaksi Otomatis format TRX-YYYYMMDD-NNN
 */
export function generateNomorTransaksi(existingTransactions: Transaksi[]): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `TRX-${yyyy}${mm}${dd}-`;

  // Cari transaksi dengan prefix hari ini
  const todayTrx = existingTransactions.filter((t) => t.nomor && t.nomor.startsWith(prefix));

  let maxNum = 0;
  for (const trx of todayTrx) {
    const numPart = trx.nomor.replace(prefix, '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }

  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}
