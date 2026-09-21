import React, { useEffect, useState } from 'react';
import { IconSmartphone, IconX } from '../common/Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isAppleDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General prompt if browser didn't fire event yet
      alert('Untuk memasang aplikasi pada layar utama:\nBuka menu browser (titik tiga atau tombol bagikan), lalu pilih "Tambahkan ke Layar Utama" / "Instal Aplikasi".');
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        id="btn-pwa-install"
        type="button"
        onClick={handleInstallClick}
        className="h-10 px-3 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--secondary))] transition flex items-center gap-2"
        title="Pasang aplikasi ke Layar Utama HP / Komputer"
      >
        <IconSmartphone size={16} className="text-[hsl(var(--primary))]" />
        <span className="hidden sm:inline">Pasang PWA</span>
        <span className="sm:hidden">Pasang</span>
      </button>

      {showIOSModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] rounded-[var(--radius)] p-6 w-full max-w-md shadow-lg relative">
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <IconX size={20} />
            </button>
            <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--foreground))]">
              Pasang di iPhone / iPad
            </h3>
            <div className="text-sm text-[hsl(var(--muted-foreground))] space-y-2 mt-3">
              <p>1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah Safari.</p>
              <p>2. Gulir ke bawah lalu ketuk <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
              <p>3. Ketuk <strong>Tambah</strong> di pojok kanan atas.</p>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="h-10 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:brightness-[0.92] transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
