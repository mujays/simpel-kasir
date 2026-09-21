import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div 
        id="confirm-modal-dialog"
        role="dialog"
        aria-modal="true"
        className="bg-[hsl(var(--card))] rounded-[var(--radius)] p-6 w-full max-w-md shadow-lg"
      >
        <h3 className="text-lg font-semibold mb-1 text-[hsl(var(--card-foreground))]">
          {title}
        </h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--secondary))] transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 px-4 rounded-[var(--radius)] text-sm font-medium transition ${
              isDestructive
                ? 'bg-[hsl(var(--destructive))] text-white hover:brightness-[0.92]'
                : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-[0.92]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
