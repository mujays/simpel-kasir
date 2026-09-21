import React, { useState, useMemo } from 'react';
import { AppData, JenisPergerakanStok, PergerakanStok } from '../../types';
import { formatTanggalWaktu, toDateInputValue } from '../../utils/formatters';
import { IconArrowIn, IconArrowOut, IconPlus, IconSearch, IconX, IconAlertCircle } from '../common/Icons';

interface StokPageProps {
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export const StokPage: React.FC<StokPageProps> = ({ data, onUpdateData, showToast }) => {
  // Modal Catat Stok
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formProdukId, setFormProdukId] = useState('');
  const [formJenis, setFormJenis] = useState<JenisPergerakanStok>('masuk');
  const [formQty, setFormQty] = useState('');
  const [formReferensi, setFormReferensi] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filters for History
  const [filterJenis, setFilterJenis] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [filterProdukId, setFilterProdukId] = useState<string>('semua');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected product in form
  const selectedFormProduct = useMemo(() => {
    return data.produk.find((p) => p.id === formProdukId);
  }, [data.produk, formProdukId]);

  // Open modal with default product if any
  const handleOpenModal = (defaultJenis: JenisPergerakanStok = 'masuk') => {
    setFormJenis(defaultJenis);
    if (data.produk.length > 0 && !formProdukId) {
      setFormProdukId(data.produk[0].id);
    }
    setFormQty('');
    setFormReferensi(defaultJenis === 'masuk' ? 'Penerimaan supplier' : 'Penyesuaian stok opname');
    setFormCatatan('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveStok = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const targetProduct = data.produk.find((p) => p.id === formProdukId);
    if (!targetProduct) {
      setFormError('Harap pilih produk yang valid.');
      return;
    }

    const qtyNum = parseInt(formQty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFormError('Jumlah unit pergerakan wajib lebih dari 0.');
      return;
    }

    if (formJenis === 'keluar' && qtyNum > targetProduct.stok) {
      setFormError(`Stok tidak mencukupi. Stok saat ini hanya ${targetProduct.stok} unit.`);
      return;
    }

    const nowStr = new Date().toISOString();
    const stokSebelum = targetProduct.stok;
    const stokSesudah = formJenis === 'masuk' ? stokSebelum + qtyNum : stokSebelum - qtyNum;

    // 1. Update product stock
    const updatedProduk = data.produk.map((p) => {
      if (p.id === formProdukId) {
        return {
          ...p,
          stok: stokSesudah,
          diubahPada: nowStr,
        };
      }
      return p;
    });

    // 2. Create PergerakanStok record
    const newMovement: PergerakanStok = {
      id: `stk-${Date.now()}`,
      tanggal: nowStr,
      produkId: formProdukId,
      jenis: formJenis,
      qty: qtyNum,
      stokSebelum,
      stokSesudah,
      referensi: formReferensi.trim() || (formJenis === 'masuk' ? 'Stok masuk manual' : 'Stok keluar manual'),
      catatan: formCatatan.trim(),
    };

    onUpdateData({
      ...data,
      produk: updatedProduk,
      pergerakanStok: [newMovement, ...data.pergerakanStok],
    });

    showToast(
      `Stok ${targetProduct.nama} berhasil diubah: ${stokSebelum} → ${stokSesudah}`,
      'success'
    );
    setIsModalOpen(false);
  };

  // Filtered stock history
  const filteredMovements = useMemo(() => {
    return data.pergerakanStok.filter((item) => {
      // Filter Jenis
      if (filterJenis !== 'semua' && item.jenis !== filterJenis) {
        return false;
      }
      // Filter Produk
      if (filterProdukId !== 'semua' && item.produkId !== filterProdukId) {
        return false;
      }
      // Filter Tanggal
      const itemDateStr = toDateInputValue(new Date(item.tanggal));
      if (filterDateStart && itemDateStr < filterDateStart) {
        return false;
      }
      if (filterDateEnd && itemDateStr > filterDateEnd) {
        return false;
      }
      // Search term (referensi, catatan, atau nama produk)
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const prod = data.produk.find((p) => p.id === item.produkId);
        const prodName = prod ? prod.nama.toLowerCase() : '';
        const prodKode = prod ? prod.kode.toLowerCase() : '';
        const ref = (item.referensi || '').toLowerCase();
        const notes = (item.catatan || '').toLowerCase();
        if (
          !prodName.includes(q) &&
          !prodKode.includes(q) &&
          !ref.includes(q) &&
          !notes.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    data.pergerakanStok,
    data.produk,
    filterJenis,
    filterProdukId,
    filterDateStart,
    filterDateEnd,
    searchTerm,
  ]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Kelola & Mutasi Stok</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Catat barang masuk dari supplier, stok keluar/rusak, dan pantau riwayat mutasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-catat-stok-masuk"
            type="button"
            onClick={() => handleOpenModal('masuk')}
            className="h-10 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:brightness-[0.92] transition flex items-center gap-2 shadow-sm"
          >
            <IconArrowIn size={16} />
            Stok Masuk
          </button>
          <button
            id="btn-catat-stok-keluar"
            type="button"
            onClick={() => handleOpenModal('keluar')}
            className="h-10 px-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--secondary))] transition flex items-center gap-2"
          >
            <IconArrowOut size={16} />
            Stok Keluar
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Cari kata kunci */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
              <IconSearch size={16} />
            </span>
            <input
              id="input-cari-mutasi"
              type="text"
              placeholder="Cari produk / referensi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full pl-9 pr-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          {/* Filter Jenis */}
          <div>
            <select
              id="select-filter-jenis"
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as any)}
              className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            >
              <option value="semua">Semua Jenis Pergerakan</option>
              <option value="masuk">Hanya Stok Masuk</option>
              <option value="keluar">Hanya Stok Keluar</option>
            </select>
          </div>

          {/* Filter Produk */}
          <div>
            <select
              id="select-filter-produk"
              value={filterProdukId}
              onChange={(e) => setFilterProdukId(e.target.value)}
              className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            >
              <option value="semua">Semua Produk</option>
              {data.produk.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.kode} - {p.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Rentang Tanggal */}
          <div className="flex items-center gap-2">
            <input
              id="input-stok-tgl-mulai"
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="h-10 w-full px-2 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              placeholder="Dari"
            />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">-</span>
            <input
              id="input-stok-tgl-selesai"
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="h-10 w-full px-2 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              placeholder="Sampai"
            />
          </div>
        </div>
      </div>

      {/* Tabel & Tumpukan Kartu Riwayat Mutasi Stok */}
      {filteredMovements.length === 0 ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center mx-auto mb-3">
            <IconAlertCircle size={24} />
          </div>
          <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Tidak Ada Riwayat Stok</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
            {searchTerm || filterJenis !== 'semua' || filterProdukId !== 'semua'
              ? 'Tidak ada pergerakan stok yang cocok dengan kriteria filter Anda.'
              : 'Belum ada pergerakan stok yang tercatat dalam sistem.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (≥1024px) */}
          <div className="hidden lg:block border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden shadow-sm bg-[hsl(var(--card))]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[hsl(var(--muted))] text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))] h-11">
                  <th className="px-4">Waktu</th>
                  <th className="px-4">Produk</th>
                  <th className="px-4 text-center">Jenis</th>
                  <th className="px-4 text-right">Jumlah</th>
                  <th className="px-4 text-center">Stok Sebelum → Sesudah</th>
                  <th className="px-4">Referensi</th>
                  <th className="px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredMovements.map((m) => {
                  const prod = data.produk.find((p) => p.id === m.produkId);
                  const isMasuk = m.jenis === 'masuk';

                  return (
                    <tr key={m.id} className="h-14 hover:bg-[hsl(var(--muted))] transition text-sm">
                      <td className="px-4 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                        {formatTanggalWaktu(m.tanggal)}
                      </td>
                      <td className="px-4">
                        <div className="font-medium text-[hsl(var(--foreground))]">
                          {prod ? prod.nama : 'Produk Dihapus'}
                        </div>
                        <div className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                          {prod?.kode}
                        </div>
                      </td>
                      <td className="px-4 text-center">
                        <span
                          className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium ${
                            isMasuk
                              ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
                              : 'bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]'
                          }`}
                        >
                          {isMasuk ? 'Masuk' : 'Keluar'}
                        </span>
                      </td>
                      <td className="px-4 text-right tabular-nums font-semibold">
                        <span className={isMasuk ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
                          {isMasuk ? `+${m.qty}` : `-${m.qty}`} unit
                        </span>
                      </td>
                      <td className="px-4 text-center tabular-nums text-xs text-[hsl(var(--muted-foreground))]">
                        <span>{m.stokSebelum}</span>
                        <span className="mx-1">→</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{m.stokSesudah}</span>
                      </td>
                      <td className="px-4 text-xs font-medium text-[hsl(var(--foreground))]">
                        {m.referensi || '-'}
                      </td>
                      <td className="px-4 text-xs text-[hsl(var(--muted-foreground))] max-w-xs truncate">
                        {m.catatan || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (<1024px) */}
          <div className="lg:hidden space-y-3">
            {filteredMovements.map((m) => {
              const prod = data.produk.find((p) => p.id === m.produkId);
              const isMasuk = m.jenis === 'masuk';

              return (
                <div
                  key={m.id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatTanggalWaktu(m.tanggal)}
                      </span>
                      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mt-0.5">
                        {prod ? prod.nama : 'Produk Dihapus'}
                      </h4>
                      <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{prod?.kode}</p>
                    </div>
                    <span
                      className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium shrink-0 ${
                        isMasuk
                          ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]'
                      }`}
                    >
                      {isMasuk ? 'Masuk' : 'Keluar'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[hsl(var(--secondary))] p-2.5 rounded-[var(--radius)]">
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Perubahan:</span>
                      <p className={`font-semibold tabular-nums ${isMasuk ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
                        {isMasuk ? `+${m.qty}` : `-${m.qty}`} unit
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Sebelum → Sesudah:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--foreground))]">
                        {m.stokSebelum} → {m.stokSesudah}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[hsl(var(--muted-foreground))]">Referensi:</span>
                      <p className="font-medium text-[hsl(var(--foreground))]">{m.referensi || '-'}</p>
                      {m.catatan && (
                        <p className="text-[hsl(var(--muted-foreground))] mt-0.5">{m.catatan}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Form Catat Stok Masuk / Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] rounded-[var(--radius)] p-6 w-full max-w-md shadow-lg relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <IconX size={20} />
            </button>

            <h3 className="text-lg font-semibold mb-1 text-[hsl(var(--card-foreground))]">
              Catat Mutasi Stok Barang
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              Perbarui stok barang secara akurat beserta alasan pergerakannya
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-[var(--radius)] bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))] text-xs font-medium flex items-center gap-2">
                <IconAlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStok} className="space-y-4">
              {/* Jenis Pergerakan */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[hsl(var(--foreground))]">
                  Jenis Pergerakan Stok *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormJenis('masuk')}
                    className={`h-10 px-3 rounded-[var(--radius)] text-xs font-semibold flex items-center justify-center gap-2 transition border ${
                      formJenis === 'masuk'
                        ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success))]'
                        : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
                    }`}
                  >
                    <IconArrowIn size={16} />
                    Stok Masuk (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormJenis('keluar')}
                    className={`h-10 px-3 rounded-[var(--radius)] text-xs font-semibold flex items-center justify-center gap-2 transition border ${
                      formJenis === 'keluar'
                        ? 'bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]'
                        : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
                    }`}
                  >
                    <IconArrowOut size={16} />
                    Stok Keluar (-)
                  </button>
                </div>
              </div>

              {/* Pilih Produk */}
              <div>
                <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                  Pilih Produk *
                </label>
                <select
                  id="select-stok-produk"
                  required
                  value={formProdukId}
                  onChange={(e) => setFormProdukId(e.target.value)}
                  className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                >
                  {data.produk.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.kode}] {p.nama} (Stok Saat Ini: {p.stok})
                    </option>
                  ))}
                </select>
                {selectedFormProduct && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 flex justify-between">
                    <span>Stok saat ini: <strong>{selectedFormProduct.stok} unit</strong></span>
                    <span>Stok min: <strong>{selectedFormProduct.stokMinimum} unit</strong></span>
                  </div>
                )}
              </div>

              {/* Jumlah Qty */}
              <div>
                <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                  Jumlah Unit (Qty) *
                </label>
                <input
                  id="input-stok-qty"
                  type="number"
                  min={1}
                  required
                  placeholder="Contoh: 10"
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>

              {/* Referensi */}
              <div>
                <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                  Referensi / Asal Transaksi *
                </label>
                <input
                  id="input-stok-referensi"
                  type="text"
                  required
                  placeholder="Contoh: PO-001, Barang Rusak, Koreksi Opname"
                  value={formReferensi}
                  onChange={(e) => setFormReferensi(e.target.value)}
                  className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                  Catatan Keterangan (Opsional)
                </label>
                <textarea
                  id="input-stok-catatan"
                  rows={2}
                  placeholder="Keterangan tambahan mutasi barang..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full p-2.5 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--secondary))] transition"
                >
                  Batal
                </button>
                <button
                  id="btn-simpan-mutasi-stok"
                  type="submit"
                  className="h-10 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:brightness-[0.92] transition"
                >
                  Simpan Perubahan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
