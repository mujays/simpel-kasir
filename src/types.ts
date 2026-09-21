export interface Produk {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  aktif: boolean;
  dibuatPada: string;
  diubahPada: string;
}

export type MetodePembayaran = 'Cash' | 'QRIS';

export interface Transaksi {
  id: string;
  nomor: string;
  tanggal: string;
  metodePembayaran: MetodePembayaran;
  total: number;
  totalModal: number;
  labaKotor: number;
  bayar: number;
  kembalian: number;
}

export interface TransaksiItem {
  id: string;
  transaksiId: string;
  produkId: string;
  namaProduk: string;
  qty: number;
  hargaJual: number;
  hargaBeli: number;
  subtotal: number;
  subtotalModal: number;
}

export type JenisPergerakanStok = 'masuk' | 'keluar';

export interface PergerakanStok {
  id: string;
  tanggal: string;
  produkId: string;
  jenis: JenisPergerakanStok;
  qty: number;
  stokSebelum: number;
  stokSesudah: number;
  referensi: string;
  catatan: string;
}

export interface Pengaturan {
  namaToko: string;
  mataUang: string;
}

export interface AppData {
  produk: Produk[];
  transaksi: Transaksi[];
  transaksiItem: TransaksiItem[];
  pergerakanStok: PergerakanStok[];
  pengaturan: Pengaturan;
}

export type ActivePage = 
  | 'dashboard' 
  | 'kasir' 
  | 'produk' 
  | 'stok' 
  | 'cekStok' 
  | 'laporan' 
  | 'data';

export interface ToastMessage {
  id?: string;
  type: 'success' | 'error';
  text: string;
}

export interface CartItem {
  produk: Produk;
  qty: number;
}
