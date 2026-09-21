import React from 'react';
import { ActivePage } from '../../types';
import { PWAInstallPrompt } from '../pwa/PWAInstallPrompt';

interface HeaderProps {
  activePage: ActivePage;
}

const pageTitles: Record<ActivePage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Ringkasan penjualan dan stok' },
  kasir: { title: 'Kasir Penjualan', subtitle: 'Point of Sale' },
  produk: { title: 'Master Produk', subtitle: 'Katalog & harga barang' },
  stok: { title: 'Kelola Stok', subtitle: 'Mutasi masuk & keluar' },
  cekStok: { title: 'Cek Stok & Valuasi', subtitle: 'Status persediaan' },
  laporan: { title: 'Laporan Penjualan', subtitle: 'Analisis laba kotor' },
  data: { title: 'Manajemen Data', subtitle: 'Ekspor & pemulihan cadangan' },
};

export const Header: React.FC<HeaderProps> = ({ activePage }) => {
  const current = pageTitles[activePage] || { title: 'Kasir Gudang Simple', subtitle: '' };

  return (
    <header className="h-16 px-4 lg:px-8 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="lg:hidden w-7 h-7 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center font-bold text-xs">
          KG
        </div>
        <div>
          <h1 className="text-base lg:text-lg font-bold text-[hsl(var(--foreground))] leading-tight">
            {current.title}
          </h1>
          <p className="hidden sm:block text-xs text-[hsl(var(--muted-foreground))]">
            {current.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PWAInstallPrompt />
      </div>
    </header>
  );
};
