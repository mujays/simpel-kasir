import React from 'react';
import { ActivePage } from '../../types';
import {
  IconDashboard,
  IconKasir,
  IconBox,
  IconArrowIn,
  IconCheck,
  IconChart,
  IconDatabase,
} from '../common/Icons';
import { PWAInstallPrompt } from '../pwa/PWAInstallPrompt';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
}

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { id: 'kasir', label: 'Kasir', icon: IconKasir },
  { id: 'produk', label: 'Produk', icon: IconBox },
  { id: 'stok', label: 'Kelola Stok', icon: IconArrowIn },
  { id: 'cekStok', label: 'Cek Stok', icon: IconCheck },
  { id: 'laporan', label: 'Laporan', icon: IconChart },
  { id: 'data', label: 'Cadangan Data', icon: IconDatabase },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] min-h-screen shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-[hsl(var(--border))] flex items-center gap-3">
        <div className="w-8 h-8 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center font-bold text-sm shadow-sm">
          KG
        </div>
        <div>
          <h1 className="text-sm font-bold text-[hsl(var(--foreground))] leading-none">
            Kasir Gudang
          </h1>
          <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            Simple POS & Stock
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full h-11 px-3.5 rounded-[var(--radius)] text-sm font-medium transition flex items-center gap-3 ${
                isActive
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-[hsl(var(--border))] space-y-3">
        <div className="flex justify-center">
          <PWAInstallPrompt />
        </div>
        <div className="text-center text-[11px] text-[hsl(var(--muted-foreground))]">
          PWA Offline Ready v1.0
        </div>
      </div>
    </aside>
  );
};
