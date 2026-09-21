import React, { useState, useMemo } from 'react';
import { AppData, Produk, PergerakanStok } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { IconSearch, IconPlus, IconEdit, IconTrash, IconX, IconCheck, IconAlertCircle } from '../common/Icons';
import { ConfirmModal } from '../common/ConfirmModal';

interface ProdukPageProps {
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export const ProdukPage: React.FC<ProdukPageProps> = ({ data, onUpdateData, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduk, setEditingProduk] = useState<Produk | null>(null);

  // Form fields
  const [formKode, setFormKode] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState('Umum');
  const [formHargaBeli, setFormHargaBeli] = useState('');
  const [formHargaJual, setFormHargaJual] = useState('');
  const [formStokAwal, setFormStokAwal] = useState('0');
  const [formStokMin, setFormStokMin] = useState('5');
  const [formAktif, setFormAktif] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Produk | null>(null);

  // Category list
  const categories = useMemo(() => {
    const set = new Set<string>();
    data.produk.forEach((p) => {
      if (p.kategori) set.add(p.kategori);
    });
    return ['Semua', ...Array.from(set)];
  }, [data.produk]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return data.produk.filter((p) => {
      const matchSearch =
        p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q);
      const matchCategory =
        selectedCategory === 'Semua' || p.kategori === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [data.produk, searchTerm, selectedCategory]);

  const openAddModal = () => {
    setEditingProduk(null);
    // Generate suggested code
    const count = data.produk.length + 1;
    setFormKode(`BRG${String(count).padStart(3, '0')}`);
    setFormNama('');
    setFormKategori('Bahan Pokok');
    setFormHargaBeli('0');
    setFormHargaJual('0');
    setFormStokAwal('0');
    setFormStokMin('5');
    setFormAktif(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Produk) => {
    setEditingProduk(p);
    setFormKode(p.kode);
    setFormNama(p.nama);
    setFormKategori(p.kategori);
    setFormHargaBeli(String(p.hargaBeli));
    setFormHargaJual(String(p.hargaJual));
    setFormStokAwal(String(p.stok)); // purely for display
    setFormStokMin(String(p.stokMinimum));
    setFormAktif(p.aktif);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduk = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const kodeTrimmed = formKode.trim().toUpperCase();
    const namaTrimmed = formNama.trim();

    if (!kodeTrimmed) {
      setFormError('Kode produk wajib diisi.');
      return;
    }
    if (!namaTrimmed) {
      setFormError('Nama produk wajib diisi.');
      return;
    }

    // Check unique code
    const duplicate = data.produk.find(
      (p) => p.kode.toUpperCase() === kodeTrimmed && (!editingProduk || p.id !== editingProduk.id)
    );
    if (duplicate) {
      setFormError(`Kode produk "${kodeTrimmed}" sudah digunakan oleh produk lain.`);
      return;
    }

    const hargaBeliNum = Math.max(0, parseInt(formHargaBeli, 10) || 0);
    const hargaJualNum = Math.max(0, parseInt(formHargaJual, 10) || 0);
    const stokMinNum = Math.max(0, parseInt(formStokMin, 10) || 0);

    const nowStr = new Date().toISOString();

    if (editingProduk) {
      // Edit existing product
      // Note: per rules, stock cannot be changed in product edit form
      const updatedList = data.produk.map((p) => {
        if (p.id === editingProduk.id) {
          return {
            ...p,
            kode: kodeTrimmed,
            nama: namaTrimmed,
            kategori: formKategori.trim() || 'Umum',
            hargaBeli: hargaBeliNum,
            hargaJual: hargaJualNum,
            stokMinimum: stokMinNum,
            aktif: formAktif,
            diubahPada: nowStr,
          };
        }
        return p;
      });

      onUpdateData({ ...data, produk: updatedList });
      showToast(`Produk "${namaTrimmed}" berhasil diperbarui`, 'success');
      setIsModalOpen(false);
    } else {
      // Create new product
      const stokAwalNum = Math.max(0, parseInt(formStokAwal, 10) || 0);
      const newProdId = `prd-${Date.now()}`;

      const newProduk: Produk = {
        id: newProdId,
        kode: kodeTrimmed,
        nama: namaTrimmed,
        kategori: formKategori.trim() || 'Umum',
        hargaBeli: hargaBeliNum,
        hargaJual: hargaJualNum,
        stok: stokAwalNum,
        stokMinimum: stokMinNum,
        aktif: formAktif,
        dibuatPada: nowStr,
        diubahPada: nowStr,
      };

      let newPergerakanStok = [...data.pergerakanStok];
      if (stokAwalNum > 0) {
        const movement: PergerakanStok = {
          id: `stk-${Date.now()}`,
          tanggal: nowStr,
          produkId: newProdId,
          jenis: 'masuk',
          qty: stokAwalNum,
          stokSebelum: 0,
          stokSesudah: stokAwalNum,
          referensi: 'Stok awal',
          catatan: 'Input produk baru',
        };
        newPergerakanStok = [movement, ...newPergerakanStok];
      }

      onUpdateData({
        ...data,
        produk: [...data.produk, newProduk],
        pergerakanStok: newPergerakanStok,
      });

      showToast(`Produk "${namaTrimmed}" berhasil ditambahkan`, 'success');
      setIsModalOpen(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    // Remove from products
    const updatedProduk = data.produk.filter((p) => p.id !== deleteTarget.id);
    onUpdateData({ ...data, produk: updatedProduk });
    showToast(`Produk "${deleteTarget.nama}" telah dihapus`, 'success');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Katalog Produk</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Kelola master data barang, harga beli modal, harga jual, dan stok minimum
          </p>
        </div>
        <button
          id="btn-tambah-produk"
          type="button"
          onClick={openAddModal}
          className="h-10 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:brightness-[0.92] active:brightness-[0.88] transition flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <IconPlus size={16} />
          Tambah Produk
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
              <IconSearch size={16} />
            </span>
            <input
              id="input-cari-produk"
              type="text"
              placeholder="Cari berdasarkan nama atau kode barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full pl-9 pr-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 transition ${
                  selectedCategory === cat
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Produk List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center mx-auto mb-3">
            <IconAlertCircle size={24} />
          </div>
          <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Produk Tidak Ditemukan</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Tidak ada produk yang sesuai dengan filter atau kata kunci yang dimasukkan.'
              : 'Belum ada produk yang terdaftar. Klik tombol Tambah Produk di atas.'}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={openAddModal}
              className="h-9 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-medium hover:brightness-[0.92] transition"
            >
              Tambah Produk Sekarang
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table (Hidden on Mobile) */}
          <div className="hidden lg:block border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden shadow-sm bg-[hsl(var(--card))]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[hsl(var(--muted))] text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))] h-11">
                  <th className="px-4">Kode</th>
                  <th className="px-4">Nama Produk</th>
                  <th className="px-4">Kategori</th>
                  <th className="px-4 text-right">Harga Beli</th>
                  <th className="px-4 text-right">Harga Jual</th>
                  <th className="px-4 text-center">Stok / Min</th>
                  <th className="px-4 text-center">Status Stok</th>
                  <th className="px-4 text-center">Status</th>
                  <th className="px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredProducts.map((p) => {
                  const isHabis = p.stok === 0;
                  const isMenipis = p.stok > 0 && p.stok <= p.stokMinimum;

                  return (
                    <tr key={p.id} className="h-14 hover:bg-[hsl(var(--muted))] transition text-sm">
                      <td className="px-4 font-mono text-xs font-medium text-[hsl(var(--muted-foreground))]">
                        {p.kode}
                      </td>
                      <td className="px-4 font-medium text-[hsl(var(--foreground))]">
                        {p.nama}
                      </td>
                      <td className="px-4 text-xs text-[hsl(var(--muted-foreground))]">
                        {p.kategori}
                      </td>
                      <td className="px-4 text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                        {formatRupiah(p.hargaBeli)}
                      </td>
                      <td className="px-4 text-right tabular-nums font-medium text-[hsl(var(--foreground))]">
                        {formatRupiah(p.hargaJual)}
                      </td>
                      <td className="px-4 text-center tabular-nums text-xs">
                        <span className="font-semibold text-[hsl(var(--foreground))]">{p.stok}</span>
                        <span className="text-[hsl(var(--muted-foreground))]"> / {p.stokMinimum}</span>
                      </td>
                      <td className="px-4 text-center">
                        {isHabis ? (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]">
                            Habis
                          </span>
                        ) : isMenipis ? (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]">
                            Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="px-4 text-center">
                        <span
                          className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium ${
                            p.aktif
                              ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                              : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] opacity-60'
                          }`}
                        >
                          {p.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="w-8 h-8 rounded-[calc(var(--radius)-2px)] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] flex items-center justify-center transition"
                            title="Ubah Produk"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="w-8 h-8 rounded-[calc(var(--radius)-2px)] border border-[hsl(var(--border))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] flex items-center justify-center transition"
                            title="Hapus Produk"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (<1024px) */}
          <div className="lg:hidden space-y-3">
            {filteredProducts.map((p) => {
              const isHabis = p.stok === 0;
              const isMenipis = p.stok > 0 && p.stok <= p.stokMinimum;

              return (
                <div
                  key={p.id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase">
                        {p.kode} • {p.kategori}
                      </span>
                      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mt-0.5">
                        {p.nama}
                      </h4>
                    </div>
                    {isHabis ? (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]">
                        Habis
                      </span>
                    ) : isMenipis ? (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]">
                        Menipis
                      </span>
                    ) : (
                      <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]">
                        Aman
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[hsl(var(--secondary))] p-2.5 rounded-[var(--radius)]">
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Harga Beli:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--foreground))]">
                        {formatRupiah(p.hargaBeli)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Harga Jual:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--primary))]">
                        {formatRupiah(p.hargaJual)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Stok Fisik:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--foreground))]">
                        {p.stok} unit
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Stok Min:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--foreground))]">
                        {p.stokMinimum} unit
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      Status: {p.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="h-8 px-3 rounded-[var(--radius)] border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--secondary))] transition flex items-center gap-1"
                      >
                        <IconEdit size={12} />
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="h-8 px-3 rounded-[var(--radius)] bg-[hsl(var(--destructive))] text-white text-xs font-medium hover:brightness-[0.92] transition flex items-center gap-1"
                      >
                        <IconTrash size={12} />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Floating Action Button (Mobile only) */}
      <button
        type="button"
        onClick={openAddModal}
        className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg flex items-center justify-center hover:brightness-[0.92] active:brightness-[0.88] transition"
        title="Tambah Produk Baru"
      >
        <IconPlus size={24} />
      </button>

      {/* Modal Form Tambah / Ubah Produk */}
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
              {editingProduk ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              Lengkapi informasi produk secara akurat
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-[var(--radius)] bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))] text-xs font-medium flex items-center gap-2">
                <IconAlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduk} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                    Kode Produk *
                  </label>
                  <input
                    id="input-form-kode"
                    type="text"
                    required
                    placeholder="BRG001"
                    value={formKode}
                    onChange={(e) => setFormKode(e.target.value)}
                    className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                    Kategori
                  </label>
                  <input
                    id="input-form-kategori"
                    type="text"
                    placeholder="Contoh: Bahan Pokok"
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                  Nama Produk *
                </label>
                <input
                  id="input-form-nama"
                  type="text"
                  required
                  placeholder="Contoh: Beras Ramos Premium 5kg"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                    Harga Beli Modal (Rp) *
                  </label>
                  <input
                    id="input-form-harga-beli"
                    type="number"
                    min={0}
                    required
                    value={formHargaBeli}
                    onChange={(e) => setFormHargaBeli(e.target.value)}
                    className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                    Harga Jual Kasir (Rp) *
                  </label>
                  <input
                    id="input-form-harga-jual"
                    type="number"
                    min={0}
                    required
                    value={formHargaJual}
                    onChange={(e) => setFormHargaJual(e.target.value)}
                    className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                    {editingProduk ? 'Stok Saat Ini' : 'Stok Awal'}
                  </label>
                  <input
                    id="input-form-stok"
                    type="number"
                    min={0}
                    disabled={!!editingProduk}
                    value={formStokAwal}
                    onChange={(e) => setFormStokAwal(e.target.value)}
                    className={`h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] text-sm tabular-nums ${
                      editingProduk
                        ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                        : 'bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'
                    }`}
                  />
                  {editingProduk && (
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 block">
                      Gunakan menu <strong>Stok</strong> untuk menambah atau mengurangi stok.
                    </span>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                    Stok Minimum (Peringatan)
                  </label>
                  <input
                    id="input-form-stok-min"
                    type="number"
                    min={0}
                    value={formStokMin}
                    onChange={(e) => setFormStokMin(e.target.value)}
                    className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))] cursor-pointer select-none">
                  <input
                    id="input-form-status-aktif"
                    type="checkbox"
                    checked={formAktif}
                    onChange={(e) => setFormAktif(e.target.checked)}
                    className="w-4 h-4 rounded text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))]"
                  />
                  <span>Produk Aktif (Tampil di kasir penjualan)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[hsl(var(--border))]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--secondary))] transition"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-produk"
                  type="submit"
                  className="h-10 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:brightness-[0.92] transition"
                >
                  {editingProduk ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Produk"
        message={`Apakah Anda yakin ingin menghapus produk "${deleteTarget?.nama}" (Kode: ${deleteTarget?.kode})? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Produk"
        cancelText="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
