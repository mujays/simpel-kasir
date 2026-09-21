import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppData, ActivePage, ToastMessage } from './types';
import { loadAppData, saveAppData } from './utils/storage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { Toast } from './components/common/Toast';

import { DashboardPage } from './components/pages/DashboardPage';
import { KasirPage } from './components/pages/KasirPage';
import { ProdukPage } from './components/pages/ProdukPage';
import { StokPage } from './components/pages/StokPage';
import { CekStokPage } from './components/pages/CekStokPage';
import { LaporanPage } from './components/pages/LaporanPage';
import { DataPage } from './components/pages/DataPage';

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Synchronize state with localStorage
  const handleUpdateData = useCallback((newData: AppData) => {
    setData(newData);
    saveAppData(newData);
  }, []);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ id: String(Date.now()), text, type });
  }, []);

  const handleDismissToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex">
      {/* Desktop Sidebar (lg+) */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header activePage={activePage} />

        {/* Dynamic Page Content with Entrance Transition */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activePage === 'dashboard' && (
                <DashboardPage data={data} onNavigate={setActivePage} />
              )}
              {activePage === 'kasir' && (
                <KasirPage
                  data={data}
                  onUpdateData={handleUpdateData}
                  showToast={showToast}
                />
              )}
              {activePage === 'produk' && (
                <ProdukPage
                  data={data}
                  onUpdateData={handleUpdateData}
                  showToast={showToast}
                />
              )}
              {activePage === 'stok' && (
                <StokPage
                  data={data}
                  onUpdateData={handleUpdateData}
                  showToast={showToast}
                />
              )}
              {activePage === 'cekStok' && (
                <CekStokPage data={data} onNavigate={setActivePage} />
              )}
              {activePage === 'laporan' && <LaporanPage data={data} />}
              {activePage === 'data' && (
                <DataPage
                  data={data}
                  onUpdateData={handleUpdateData}
                  showToast={showToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (<lg) */}
      <BottomNav activePage={activePage} onNavigate={setActivePage} />

      {/* Global Toast Notification */}
      <Toast toast={toast} onDismiss={handleDismissToast} />
    </div>
  );
}
