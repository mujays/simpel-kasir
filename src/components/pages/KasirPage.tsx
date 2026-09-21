import React, { useState, useMemo } from 'react';
import { AppData, CartItem, MetodePembayaran, Produk, Transaksi, TransaksiItem, PergerakanStok } from '../../types';
import { formatRupiah, generateNomorTransaksi, formatTanggalWaktu } from '../../utils/formatters';
import { IconSearch, IconPlus, IconMinus, IconTrash, IconCheck, IconKasir, IconAlertCircle } from '../common/Icons';

interface KasirPageProps {
  data: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export const KasirPage: React.FC<KasirPageProps> = ({ data, onUpdateData, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodePembayaran, setMetodePembayaran] = useState<MetodePembayaran>('Cash');
  const [uangDiterima, setUangDiterima] = useState<string>('');
  const [lastSuccessTransaction, setLastSuccessTransaction] = useState<{
    transaksi: Transaksi;
    items: TransaksiItem[];
  } | null>(null);

  // Available active products with stock > 0
  const availableProducts = useMemo(() => {
    return data.produk.filter((p) => p.aktif && p.stok > 0);
  }, [data.produk]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableProducts.forEach((p) => {
      if (p.kategori) set.add(p.kategori);
    });
    return ['Semua', ...Array.from(set)];
  }, [availableProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return availableProducts.filter((p) => {
      const matchSearch =
        p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q);
      const matchCategory =
        selectedCategory === 'Semua' || p.kategori === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [availableProducts, searchTerm, selectedCategory]);

  // Cart calculations
  const totalTransaksi = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.produk.hargaJual * item.qty, 0);
  }, [cart]);

  const totalModalTransaksi = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.produk.hargaBeli * item.qty, 0);
  }, [cart]);

  const labaKotorTransaksi = totalTransaksi - totalModalTransaksi;

  // Numerical value of uang diterima
  const numericBayar = useMemo(() => {
    if (metodePembayaran === 'QRIS') {
      return totalTransaksi;
    }
    const parsed = parseInt(uangDiterima.replace(/\D/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [metodePembayaran, uangDiterima, totalTransaksi]);

  const kembalian = useMemo(() => {
    if (metodePembayaran === 'QRIS') return 0;
    return numericBayar >= totalTransaksi ? numericBayar - totalTransaksi : 0;
  }, [metodePembayaran, numericBayar, totalTransaksi]);

  const isCashInsufficient = metodePembayaran === 'Cash' && numericBayar < totalTransaksi;
  const canCheckout = cart.length > 0 && !isCashInsufficient;

  // Add product to cart
  const handleAddToCart = (produk: Produk) => {
    const existing = cart.find((item) => item.produk.id === produk.id);
    if (existing) {
      if (existing.qty + 1 > produk.stok) {
        showToast(`Stok ${produk.nama} tersisa ${produk.stok} unit`, 'error');
        return;
      }
      setCart(
        cart.map((item) =>
          item.produk.id === produk.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCart([...cart, { produk, qty: 1 }]);
    }
  };

  // Change quantity
  const handleUpdateQty = (produkId: string, newQty: number) => {
    const item = cart.find((c) => c.produk.id === produkId);
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveItem(produkId);
      return;
    }

    if (newQty > item.produk.stok) {
      showToast(`Maksimum stok ${item.produk.nama} adalah ${item.produk.stok}`, 'error');
      return;
    }

    setCart(
      cart.map((c) => (c.produk.id === produkId ? { ...c, qty: newQty } : c))
    );
  };

  // Remove from cart
  const handleRemoveItem = (produkId: string) => {
    setCart(cart.filter((c) => c.produk.id !== produkId));
  };

  // Process checkout
  const handleCheckout = () => {
    if (!canCheckout) return;

    const now = new Date();
    const timestampStr = now.toISOString();
    const trxNomor = generateNomorTransaksi(data.transaksi);
    const trxId = `trx-${Date.now()}`;

    // 1. Create Transaksi
    const newTransaksi: Transaksi = {
      id: trxId,
      nomor: trxNomor,
      tanggal: timestampStr,
      metodePembayaran,
      total: totalTransaksi,
      totalModal: totalModalTransaksi,
      labaKotor: labaKotorTransaksi,
      bayar: numericBayar,
      kembalian,
    };

    // 2. Create TransaksiItems (snapshotting hargaBeli & hargaJual)
    const newItems: TransaksiItem[] = cart.map((item, index) => {
      const subtotal = item.produk.hargaJual * item.qty;
      const subtotalModal = item.produk.hargaBeli * item.qty;
      return {
        id: `tri-${Date.now()}-${index}`,
        transaksiId: trxId,
        produkId: item.produk.id,
        namaProduk: item.produk.nama,
        qty: item.qty,
        hargaJual: item.produk.hargaJual,
        hargaBeli: item.produk.hargaBeli,
        subtotal,
        subtotalModal,
      };
    });

    // 3. Deduct stock & Create PergerakanStok entries
    const updatedProduk = [...data.produk];
    const newPergerakan: PergerakanStok[] = [];

    cart.forEach((item, index) => {
      const prodIndex = updatedProduk.findIndex((p) => p.id === item.produk.id);
      if (prodIndex !== -1) {
        const currentProd = updatedProduk[prodIndex];
        const stokSebelum = currentProd.stok;
        const stokSesudah = Math.max(0, stokSebelum - item.qty);

        // Update product stock
        updatedProduk[prodIndex] = {
          ...currentProd,
          stok: stokSesudah,
          diubahPada: timestampStr,
        };

        // Create stock movement (keluar)
        newPergerakan.push({
          id: `stk-${Date.now()}-${index}`,
          tanggal: timestampStr,
          produkId: item.produk.id,
          jenis: 'keluar',
          qty: item.qty,
          stokSebelum,
          stokSesudah,
          referensi: `Penjualan ${trxNomor}`,
          catatan: 'Penjualan kasir',
        });
      }
    });

    // 4. Update state & storage
    const updatedData: AppData = {
      ...data,
      produk: updatedProduk,
      transaksi: [newTransaksi, ...data.transaksi],
      transaksiItem: [...newItems, ...data.transaksiItem],
      pergerakanStok: [...newPergerakan, ...data.pergerakanStok],
    };

    onUpdateData(updatedData);
    showToast(`Transaksi ${trxNomor} berhasil disimpan`, 'success');

    // Show receipt summary dialog
    setLastSuccessTransaction({
      transaksi: newTransaksi,
      items: newItems,
    });

    // Reset cart and fields
    setCart([]);
    setUangDiterima('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Kasir Penjualan</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Pilih barang, masukkan jumlah, dan selesaikan transaksi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Katalog & Pencarian Barang (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Baris Pencarian & Kategori */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[hsl(var(--muted-foreground))]">
                <IconSearch size={16} />
              </span>
              <input
                id="input-cari-produk-kasir"
                type="text"
                placeholder="Cari nama atau kode produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full pl-9 pr-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  Batal
                </button>
              )}
            </div>

            {/* Kategori Tabs */}
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

          {/* Grid Produk */}
          {filteredProducts.length === 0 ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-12 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center mx-auto mb-3">
                <IconKasir size={24} />
              </div>
              <p className="text-base font-semibold text-[hsl(var(--foreground))]">Tidak Ada Produk Siap Jual</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? 'Tidak ditemukan produk yang cocok dengan kata kunci pencarian.'
                  : 'Semua produk saat ini sedang habis atau tidak aktif. Periksa menu Stok atau Produk.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const itemInCart = cart.find((c) => c.produk.id === p.id);
                const currentCartQty = itemInCart ? itemInCart.qty : 0;
                const isMaxInCart = currentCartQty >= p.stok;

                return (
                  <div
                    key={p.id}
                    className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm hover:border-[hsl(var(--primary))] transition flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase">
                          {p.kode}
                        </span>
                        <span className="inline-flex items-center h-5 px-2 rounded-full text-xs font-medium bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                          Stok: {p.stok}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mt-1 line-clamp-2">
                        {p.nama}
                      </h4>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{p.kategori}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]">
                      <span className="text-sm font-semibold text-[hsl(var(--primary))] tabular-nums">
                        {formatRupiah(p.hargaJual)}
                      </span>
                      <button
                        type="button"
                        disabled={isMaxInCart}
                        onClick={() => handleAddToCart(p)}
                        className="h-8 px-3 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-medium hover:brightness-[0.92] active:brightness-[0.88] transition disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1"
                      >
                        <IconPlus size={14} />
                        {itemInCart ? `+ (${itemInCart.qty})` : 'Tambah'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Keranjang & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                <IconKasir size={18} className="text-[hsl(var(--primary))]" />
                Keranjang Belanja
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-[hsl(var(--destructive))] hover:underline font-medium"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* List Item Keranjang */}
            {cart.length === 0 ? (
              <div className="py-16 text-center text-[hsl(var(--muted-foreground))]">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-2 text-[hsl(var(--muted-foreground))]">
                  <IconKasir size={20} />
                </div>
                <p className="text-sm font-medium">Keranjang Masih Kosong</p>
                <p className="text-xs mt-1">Pilih barang dari katalog di sebelah kiri untuk memulai.</p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))] max-h-72 overflow-y-auto my-2 pr-1">
                {cart.map((item) => {
                  const itemSubtotal = item.produk.hargaJual * item.qty;
                  return (
                    <div key={item.produk.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                          {item.produk.nama}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
                          {formatRupiah(item.produk.hargaJual)} × {item.qty} ={' '}
                          <strong className="text-[hsl(var(--foreground))] font-semibold">
                            {formatRupiah(itemSubtotal)}
                          </strong>
                        </p>
                      </div>

                      {/* Kontrol Qty */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.produk.id, item.qty - 1)}
                          className="w-7 h-7 rounded-[calc(var(--radius)-2px)] border border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                        >
                          <IconMinus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          disabled={item.qty >= item.produk.stok}
                          onClick={() => handleUpdateQty(item.produk.id, item.qty + 1)}
                          className="w-7 h-7 rounded-[calc(var(--radius)-2px)] border border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <IconPlus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.produk.id)}
                          className="w-7 h-7 rounded-[calc(var(--radius)-2px)] text-[hsl(var(--destructive))] flex items-center justify-center hover:bg-[hsl(var(--destructive)/0.1)] ml-1"
                          title="Hapus"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Ringkasan & Pembayaran */}
            <div className="pt-3 border-t border-[hsl(var(--border))] space-y-3 mt-auto">
              <div className="flex items-center justify-between text-base">
                <span className="font-medium text-[hsl(var(--muted-foreground))]">Total Belanja</span>
                <span className="text-xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
                  {formatRupiah(totalTransaksi)}
                </span>
              </div>

              {/* Metode Pembayaran: Cash / QRIS */}
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[hsl(var(--foreground))]">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-metode-cash"
                    type="button"
                    onClick={() => setMetodePembayaran('Cash')}
                    className={`h-9 px-3 rounded-[var(--radius)] text-xs font-medium transition border ${
                      metodePembayaran === 'Cash'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                        : 'border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
                    }`}
                  >
                    Cash (Tunai)
                  </button>
                  <button
                    id="btn-metode-qris"
                    type="button"
                    onClick={() => setMetodePembayaran('QRIS')}
                    className={`h-9 px-3 rounded-[var(--radius)] text-xs font-medium transition border ${
                      metodePembayaran === 'QRIS'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                        : 'border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
                    }`}
                  >
                    QRIS
                  </button>
                </div>
              </div>

              {/* Input Uang Diterima & Kembalian jika Cash */}
              {metodePembayaran === 'Cash' && (
                <div className="space-y-2 bg-[hsl(var(--secondary))] p-3 rounded-[var(--radius)] border border-[hsl(var(--border))]">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-[hsl(var(--foreground))]">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      id="input-uang-diterima"
                      type="number"
                      min={0}
                      placeholder="Contoh: 50000"
                      value={uangDiterima}
                      onChange={(e) => setUangDiterima(e.target.value)}
                      className="h-10 w-full px-3 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] tabular-nums"
                    />
                  </div>

                  {/* Nominal Cepat */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[totalTransaksi, 10000, 20000, 50000, 100000].map((nominal, idx) => {
                      if (nominal < totalTransaksi && idx !== 0) return null;
                      return (
                        <button
                          key={nominal + '-' + idx}
                          type="button"
                          onClick={() => setUangDiterima(String(nominal))}
                          className="px-2 py-1 rounded text-xs bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] text-[hsl(var(--foreground))]"
                        >
                          {formatRupiah(nominal)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[hsl(var(--border))]">
                    <span className="text-[hsl(var(--muted-foreground))]">Kembalian:</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        isCashInsufficient ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'
                      }`}
                    >
                      {isCashInsufficient ? 'Uang kurang' : formatRupiah(kembalian)}
                    </span>
                  </div>
                </div>
              )}

              {metodePembayaran === 'QRIS' && (
                <div className="p-3 bg-[hsl(var(--secondary))] rounded-[var(--radius)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                  Pembayaran QRIS lunas otomatis. Nilai bayar disesuaikan tepat dengan total tagihan.
                </div>
              )}

              {/* Tombol Simpan Transaksi */}
              <button
                id="btn-simpan-transaksi"
                type="button"
                disabled={!canCheckout}
                onClick={handleCheckout}
                className="h-11 w-full rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:brightness-[0.92] active:brightness-[0.88] transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm"
              >
                <IconCheck size={18} />
                Simpan & Selesaikan Transaksi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Ringkasan Transaksi Setelah Sukses */}
      {lastSuccessTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] rounded-[var(--radius)] p-6 w-full max-w-md shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] flex items-center justify-center shrink-0">
                <IconCheck size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[hsl(var(--card-foreground))]">
                  Transaksi Berhasil
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Nomor: <strong className="font-mono">{lastSuccessTransaction.transaksi.nomor}</strong>
                </p>
              </div>
            </div>

            <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-1">
              <p>Tanggal: {formatTanggalWaktu(lastSuccessTransaction.transaksi.tanggal)}</p>
              <p>Metode: {lastSuccessTransaction.transaksi.metodePembayaran}</p>
            </div>

            {/* Item List */}
            <div className="border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 max-h-48 overflow-y-auto space-y-2 bg-[hsl(var(--secondary))]">
              {lastSuccessTransaction.items.map((it) => (
                <div key={it.id} className="flex justify-between text-xs">
                  <span className="text-[hsl(var(--foreground))]">
                    {it.namaProduk} <span className="text-[hsl(var(--muted-foreground))]">x{it.qty}</span>
                  </span>
                  <span className="font-medium tabular-nums text-[hsl(var(--foreground))]">
                    {formatRupiah(it.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total, Bayar, Kembalian */}
            <div className="space-y-1.5 pt-2 border-t border-[hsl(var(--border))] text-sm">
              <div className="flex justify-between font-semibold text-[hsl(var(--foreground))]">
                <span>Total Belanja:</span>
                <span className="tabular-nums">{formatRupiah(lastSuccessTransaction.transaksi.total)}</span>
              </div>
              {lastSuccessTransaction.transaksi.metodePembayaran === 'Cash' && (
                <>
                  <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                    <span>Uang Diterima:</span>
                    <span className="tabular-nums">{formatRupiah(lastSuccessTransaction.transaksi.bayar)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-[hsl(var(--success))]">
                    <span>Kembalian:</span>
                    <span className="tabular-nums">{formatRupiah(lastSuccessTransaction.transaksi.kembalian)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setLastSuccessTransaction(null)}
                className="h-10 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:brightness-[0.92] transition w-full"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
