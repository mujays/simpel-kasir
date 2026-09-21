import React, { useState, useMemo } from 'react';
import { AppData, ActivePage } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { IconSearch, IconAlertCircle, IconArrowIn } from '../common/Icons';

interface CekStokPageProps {
  data: AppData;
  onNavigate: (page: ActivePage) => void;
}

type StatusStokFilter = 'semua' | 'aman' | 'menipis' | 'habis';

export const CekStokPage: React.FC<CekStokPageProps> = ({ data, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<StatusStokFilter>('semua');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    data.produk.forEach((p) => {
      if (p.kategori) set.add(p.kategori);
    });
    return ['Semua', ...Array.from(set)];
  }, [data.produk]);

  // Overall Inventory Stats
  const totalJenisProduk = data.produk.length;
  const totalUnitStok = useMemo(() => {
    return data.produk.reduce((acc, p) => acc + (p.stok || 0), 0);
  }, [data.produk]);

  const totalNilaiPersediaan = useMemo(() => {
    return data.produk.reduce((acc, p) => acc + (p.stok || 0) * (p.hargaBeli || 0), 0);
  }, [data.produk]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return data.produk.filter((p) => {
      // Search
      const matchSearch =
        p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q);
      if (!matchSearch) return false;

      // Category
      if (selectedCategory !== 'Semua' && p.kategori !== selectedCategory) {
        return false;
      }

      // Status
      const isHabis = p.stok === 0;
      const isMenipis = p.stok > 0 && p.stok <= p.stokMinimum;
      const isAman = p.stok > p.stokMinimum;

      if (statusFilter === 'habis' && !isHabis) return false;
      if (statusFilter === 'menipis' && !isMenipis) return false;
      if (statusFilter === 'aman' && !isAman) return false;

      return true;
    });
  }, [data.produk, searchTerm, selectedCategory, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Cek Stok & Valuasi Persediaan</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Pantau saldo fisik barang gudang dan total nilai kapitalisasi stok
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('stok')}
          className="h-10 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:brightness-[0.92] transition flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <IconArrowIn size={16} />
          Mutasi Stok Masuk/Keluar
        </button>
      </div>

      {/* 3 Kartu Ringkasan Valuasi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Jenis Produk</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {totalJenisProduk} SKU
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Semua barang terdaftar</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Unit Fisik</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {totalUnitStok} unit
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Total akumulasi stok gudang</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Nilai Persediaan</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums text-[hsl(var(--primary))]">
            {formatRupiah(totalNilaiPersediaan)}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Berdasarkan stok × harga beli</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
              <IconSearch size={16} />
            </span>
            <input
              id="input-cari-cek-stok"
              type="text"
              placeholder="Cari kode atau nama barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full pl-9 pr-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          {/* Filter Status Stok */}
          <div className="inline-flex rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('semua')}
              className={`h-9 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                statusFilter === 'semua'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('aman')}
              className={`h-9 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                statusFilter === 'aman'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Stok Aman
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('menipis')}
              className={`h-9 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                statusFilter === 'menipis'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Stok Menipis
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('habis')}
              className={`h-9 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                statusFilter === 'habis'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Habis
            </button>
          </div>
        </div>

        {/* Kategori Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`h-8 px-3 rounded-full shrink-0 font-medium transition ${
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

      {/* Tabel & Tumpukan Kartu Produk */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center mx-auto mb-3">
            <IconAlertCircle size={24} />
          </div>
          <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Data Stok Tidak Ditemukan</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
            Tidak ada produk yang memenuhi kriteria pencarian dan filter status stok saat ini.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (≥1024px) */}
          <div className="hidden lg:block border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden shadow-sm bg-[hsl(var(--card))]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[hsl(var(--muted))] text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))] h-11">
                  <th className="px-4">Kode</th>
                  <th className="px-4">Nama Produk</th>
                  <th className="px-4">Kategori</th>
                  <th className="px-4 text-right">Harga Beli Modal</th>
                  <th className="px-4 text-center">Stok Fisik</th>
                  <th className="px-4 text-center">Stok Min</th>
                  <th className="px-4 text-right">Nilai Persediaan</th>
                  <th className="px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredProducts.map((p) => {
                  const isHabis = p.stok === 0;
                  const isMenipis = p.stok > 0 && p.stok <= p.stokMinimum;
                  const nilaiStok = p.stok * p.hargaBeli;

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
                      <td className="px-4 text-center tabular-nums font-semibold text-[hsl(var(--foreground))]">
                        {p.stok} unit
                      </td>
                      <td className="px-4 text-center tabular-nums text-xs text-[hsl(var(--muted-foreground))]">
                        {p.stokMinimum} unit
                      </td>
                      <td className="px-4 text-right tabular-nums font-semibold text-[hsl(var(--foreground))]">
                        {formatRupiah(nilaiStok)}
                      </td>
                      <td className="px-4 text-center">
                        {isHabis ? (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]">
                            Habis
                          </span>
                        ) : isMenipis ? (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]">
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]">
                            Stok Aman
                          </span>
                        )}
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
              const nilaiStok = p.stok * p.hargaBeli;

              return (
                <div
                  key={p.id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-2.5"
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
                      <span className="text-[hsl(var(--muted-foreground))]">Stok Fisik:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--foreground))] text-sm">
                        {p.stok} unit
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Stok Minimum:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--muted-foreground))] text-sm">
                        {p.stokMinimum} unit
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Harga Beli Modal:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--foreground))]">
                        {formatRupiah(p.hargaBeli)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Nilai Persediaan:</span>
                      <p className="font-semibold tabular-nums text-[hsl(var(--primary))]">
                        {formatRupiah(nilaiStok)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
