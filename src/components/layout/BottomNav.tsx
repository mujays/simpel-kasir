import React, { useState } from 'react';
import { ActivePage } from '../../types';
import {
  IconDashboard,
  IconKasir,
  IconBox,
  IconArrowIn,
  IconCheck,
  IconChart,
  IconDatabase,
  IconX,
} from '../common/Icons';

interface BottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, onNavigate }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainItems: { id: ActivePage; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
    { id: 'kasir', label: 'Kasir', icon: IconKasir },
    { id: 'produk', label: 'Produk', icon: IconBox },
    { id: 'stok', label: 'Stok', icon: IconArrowIn },
    { id: 'laporan', label: 'Laporan', icon: IconChart },
  ];

  const handleSelect = (page: ActivePage) => {
    onNavigate(page);
    setShowMoreMenu(false);
  };

  const isMoreActive = activePage === 'cekStok' || activePage === 'data';

  return (
    <>
      {/* Drawer / Popup Menu untuk Halaman Tambahan */}
      {showMoreMenu && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 flex flex-col justify-end"
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="bg-[hsl(var(--card))] rounded-t-[var(--radius)] p-4 shadow-xl border-t border-[hsl(var(--border))] space-y-2 mb-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">Menu Lainnya</span>
              <button 
                type="button" 
                onClick={() => setShowMoreMenu(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSelect('cekStok')}
                className={`h-12 px-3 rounded-[var(--radius)] text-xs font-medium flex items-center gap-2.5 transition border ${
                  activePage === 'cekStok'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                }`}
              >
                <IconCheck size={18} />
                <span>Cek Stok & Valuasi</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelect('data')}
                className={`h-12 px-3 rounded-[var(--radius)] text-xs font-medium flex items-center gap-2.5 transition border ${
                  activePage === 'data'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                }`}
              >
                <IconDatabase size={18} />
                <span>Cadangan Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav 
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] px-2 flex items-center justify-around shadow-lg"
      >
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`flex flex-col items-center justify-center min-w-[52px] h-full px-1.5 transition ${
                isActive
                  ? 'text-[hsl(var(--primary))] font-semibold'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[56px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Tombol Menu Lainnya */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center justify-center min-w-[52px] h-full px-1.5 transition ${
            isMoreActive
              ? 'text-[hsl(var(--primary))] font-semibold'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <IconDatabase size={20} />
          <span className="text-[10px] mt-1 tracking-tight">Lainnya</span>
        </button>
      </nav>
    </>
  );
};
