import { AppData } from '../types';
import { initialAppData } from '../data/initialData';

export const STORAGE_KEY = 'kasir_gudang_simple_v1';
const FIRST_VISIT_FLAG_KEY = 'kasir_gudang_simple_visited_v1';

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAppData));
      return initialAppData;
    }
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.produk) &&
      Array.isArray(parsed.transaksi) &&
      Array.isArray(parsed.transaksiItem) &&
      Array.isArray(parsed.pergerakanStok)
    ) {
      return parsed as AppData;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAppData));
    return initialAppData;
  } catch (err) {
    console.error('Error reading localStorage data', err);
    return initialAppData;
  }
}

export function saveAppData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('Error saving to localStorage', err);
    return false;
  }
}

export function getStoredAppData(): { data: AppData; isNew: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAppData));
      return { data: initialAppData, isNew: true };
    }
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.produk) &&
      Array.isArray(parsed.transaksi) &&
      Array.isArray(parsed.transaksiItem) &&
      Array.isArray(parsed.pergerakanStok)
    ) {
      return { data: parsed as AppData, isNew: false };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAppData));
    return { data: initialAppData, isNew: true };
  } catch (err) {
    console.error('Error reading localStorage data', err);
    return { data: initialAppData, isNew: true };
  }
}

export const saveStoredAppData = saveAppData;

export function isFirstVisitWarningNeeded(): boolean {
  try {
    return !localStorage.getItem(FIRST_VISIT_FLAG_KEY);
  } catch {
    return false;
  }
}

export function dismissFirstVisitWarning(): void {
  try {
    localStorage.setItem(FIRST_VISIT_FLAG_KEY, 'true');
  } catch (err) {
    console.warn('Could not persist first visit flag', err);
  }
}

export function validateImportedData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Format berkas tidak valid. Harap pilih berkas JSON yang benar.' };
  }
  if (!Array.isArray(data.produk)) {
    return { valid: false, error: 'Data tidak memiliki daftar produk (array "produk" hilang).' };
  }
  if (!Array.isArray(data.transaksi)) {
    return { valid: false, error: 'Data tidak memiliki daftar transaksi (array "transaksi" hilang).' };
  }
  if (!Array.isArray(data.transaksiItem)) {
    return { valid: false, error: 'Data tidak memiliki rincian transaksi (array "transaksiItem" hilang).' };
  }
  if (!Array.isArray(data.pergerakanStok)) {
    return { valid: false, error: 'Data tidak memiliki riwayat stok (array "pergerakanStok" hilang).' };
  }
  return { valid: true };
}

export function clearAllAppData(): AppData {
  return clearAllData();
}

export function clearAllData(): AppData {
  const emptyData: AppData = {
    produk: [],
    transaksi: [],
    transaksiItem: [],
    pergerakanStok: [],
    pengaturan: {
      namaToko: 'Toko Saya',
      mataUang: 'IDR',
    },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
  return emptyData;
}

export function resetToSampleData(): AppData {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAppData));
  return initialAppData;
}

export function exportAppDataAsJson(data: AppData): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `kasir_gudang_backup_${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importAppDataFromJson(jsonString: string): AppData | null {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateImportedData(parsed);
    if (!validation.valid) {
      return null;
    }
    const cleanData: AppData = {
      produk: parsed.produk,
      transaksi: parsed.transaksi,
      transaksiItem: parsed.transaksiItem,
      pergerakanStok: parsed.pergerakanStok,
      pengaturan: parsed.pengaturan || {
        namaToko: 'Toko Saya',
        mataUang: 'IDR',
      },
    };
    saveAppData(cleanData);
    return cleanData;
  } catch (err) {
    console.error('Failed to import JSON data', err);
    return null;
  }
}
