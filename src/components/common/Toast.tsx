import React, { useEffect } from 'react';
import { ToastMessage } from '../../types';

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const bgColor = toast.type === 'success' 
    ? 'bg-[hsl(var(--success))]' 
    : 'bg-[hsl(var(--destructive))]';

  return (
    <div
      id="app-toast-notification"
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-[var(--radius)] text-sm text-white shadow-lg transition-all flex items-center gap-2.5 max-w-sm ${bgColor}`}
    >
      <span className="leading-snug">{toast.text}</span>
    </div>
  );
};
