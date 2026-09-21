import React, { useState, useRef, useMemo } from 'react';
import { AppData } from '../../types';
import { exportAppDataAsJson, importAppDataFromJson, resetToSampleData, clearAllData, STORAGE_KEY } from '../../utils/storage';
import { ConfirmModal } from '../common/ConfirmModal';
import { IconDownload, IconUpload, IconRefresh, IconTrash, IconCheck, IconAlertCircle } from '../common/Icons';

interface DataPageProps {
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export const DataPage: React.FC<DataPageProps> = ({ data, onUpdateData, showToast }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals state
  const [showResetModal, setShowResetModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Storage size estimation
  const storageSizeKb = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '';
      return (new Blob([raw]).size / 1024).toFixed(2);
    } catch {
      return '0.00';
    }
  }, [data]);

  // Export JSON handler
  const handleExport = () => {
    try {
      exportAppDataAsJson(data);
      showToast('Cadangan data berhasil diunduh', 'success');
    } catch (err) {
      showToast('Gagal mengekspor data', 'error');
    }
  };

  // Import JSON file parser
  const processImportFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = importAppDataFromJson(content);
        if (imported) {
          onUpdateData(imported);
          showToast('Data berhasil dipulihkan dari file cadangan', 'success');
        } else {
          showToast('Format file JSON tidak valid untuk Kasir Gudang Simple', 'error');
        }
      } catch (err) {
        showToast('Gagal membaca file JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImportFile(file);
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImportFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Reset to Sample Data
  const handleConfirmReset = () => {
    const sample = resetToSampleData();
    onUpdateData(sample);
    setShowResetModal(false);
    showToast('Data telah direset ke contoh data awal', 'success');
  };

  // Clear All Data
  const handleConfirmClear = () => {
    const cleared = clearAllData();
    onUpdateData(cleared);
    setShowClearModal(false);
    showToast('Seluruh data aplikasi telah dikosongkan', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Manajemen & Cadangan Data</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Semua data tersimpan aman secara offline di browser lokal (localStorage). Lakukan ekspor rutin untuk membuat cadangan.
        </p>
      </div>

      {/* Statistik Penyimpanan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Produk</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {data.produk.length}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Item katalog barang</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Transaksi</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {data.transaksi.length}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {data.transaksiItem.length} rincian item transaksi
          </span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Riwayat Mutasi Stok</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {data.pergerakanStok.length}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Catatan keluar / masuk</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Ukuran Data di Browser</span>
          <span className="text-2xl font-semibold text-[hsl(var(--primary))] tabular-nums">
            {storageSizeKb} KB
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Kunci: {STORAGE_KEY}</span>
        </div>
      </div>

      {/* Aksi Ekspor & Impor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ekspor Data */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] flex items-center justify-center">
                <IconDownload size={18} />
              </div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Ekspor Cadangan (JSON)</h3>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Unduh seluruh salinan data kasir, produk, mutasi stok, dan laporan dalam satu file format JSON. File ini dapat dipindahkan ke perangkat lain atau disimpan sebagai arsip aman.
            </p>
          </div>

          <button
            id="btn-ekspor-data"
            type="button"
            onClick={handleExport}
            className="h-11 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:brightness-[0.92] active:brightness-[0.88] transition flex items-center justify-center gap-2 shadow-sm"
          >
            <IconDownload size={18} />
            Unduh Cadangan JSON Sekarang
          </button>
        </div>

        {/* Impor Data */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] flex items-center justify-center">
                <IconUpload size={18} />
              </div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Pulihkan Data (Impor)</h3>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              Unggah file JSON cadangan untuk memulihkan seluruh data aplikasi. Format file akan divalidasi terlebih dahulu sebelum diterapkan ke penyimpanan browser.
            </p>
          </div>

          {/* Area Drag and Drop & Manual Upload */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[var(--radius)] p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
              isDragging
                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] bg-[hsl(var(--secondary))]'
            }`}
          >
            <IconUpload size={20} className="text-[hsl(var(--muted-foreground))]" />
            <span className="text-xs font-medium text-[hsl(var(--foreground))]">
              Klik untuk memilih file atau seret file JSON ke sini
            </span>
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Format yang didukung: .json
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Zona Bahaya / Reset Data */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
            <IconAlertCircle size={18} className="text-[hsl(var(--destructive))]" />
            Pengaturan Ulang Data
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Gunakan opsi ini jika Anda ingin mengembalikan data ke contoh awal untuk demonstrasi, atau menghapus seluruh catatan transaksi toko.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[hsl(var(--border))]">
          {/* Reset ke Data Awal */}
          <div className="flex flex-col justify-between p-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Reset ke Data Contoh</h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Mengisi ulang sistem dengan 8 produk contoh dan transaksi demonstrasi. Data yang ada saat ini akan ditimpa.
              </p>
            </div>
            <button
              id="btn-reset-data-awal"
              type="button"
              onClick={() => setShowResetModal(true)}
              className="h-9 px-3 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] text-xs font-medium hover:bg-[hsl(var(--card))] transition flex items-center justify-center gap-1.5"
            >
              <IconRefresh size={14} />
              Reset ke Data Awal
            </button>
          </div>

          {/* Hapus Semua Data */}
          <div className="flex flex-col justify-between p-4 rounded-[var(--radius)] border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.05)] space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-[hsl(var(--destructive))]">Hapus Semua Data</h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Mengosongkan semua produk, transaksi penjualan, dan riwayat mutasi stok. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <button
              id="btn-hapus-semua-data"
              type="button"
              onClick={() => setShowClearModal(true)}
              className="h-9 px-3 rounded-[var(--radius)] bg-[hsl(var(--destructive))] text-white text-xs font-semibold hover:brightness-[0.92] transition flex items-center justify-center gap-1.5"
            >
              <IconTrash size={14} />
              Hapus Seluruh Data
            </button>
          </div>
        </div>
      </div>

      {/* Dialog Konfirmasi Reset */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset ke Data Contoh?"
        message="Apakah Anda yakin ingin mengatur ulang data ke data awal contoh? Semua perubahan dan transaksi baru yang belum dicadangkan akan ditimpa."
        confirmText="Ya, Reset Data"
        cancelText="Batal"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetModal(false)}
      />

      {/* Dialog Konfirmasi Hapus Semua Data */}
      <ConfirmModal
        isOpen={showClearModal}
        title="Hapus Seluruh Data Aplikasi?"
        message="PERINGATAN: Semua data master produk, transaksi, dan riwayat mutasi stok akan dihapus secara permanen dari browser. Pastikan Anda telah mengunduh cadangan JSON jika sewaktu-waktu membutuhkan data tersebut."
        confirmText="Hapus Permanen"
        cancelText="Batal"
        isDestructive={true}
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
};
