import { generateId } from '../../utils/id';
import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ToastCard, ToastItem, ToastVariant } from './Toast';
import { useFinance } from '../../context/FinanceContext';
import { mapFinanceEventToFeedback } from '../../constants/feedbackManifest';
import { ToastContext } from '../../context/ToastContext';

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { subscribeFinanceEvent } = useFinance();

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    variant: ToastVariant,
    title: string,
    message?: string,
    duration = 3500,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = generateId('toast');
    const newToast: ToastItem = { id, variant, title, message, duration, action };

    setToasts(prev => {
      // Keep up to 3 visible toasts max
      const updated = [...prev, newToast];
      if (updated.length > 3) {
        return updated.slice(updated.length - 3);
      }
      return updated;
    });
  }, []);

  // Subscribe to all finance domain events automatically
  useEffect(() => {
    if (!subscribeFinanceEvent) return;

    const unsubscribe = subscribeFinanceEvent((event) => {
      const feedback = mapFinanceEventToFeedback(event);
      if (feedback) {
        const isCalmMode = typeof window !== 'undefined' && localStorage.getItem('dhanveda_calm_mode') === 'true';
        if (feedback.triggerConfetti && !isCalmMode) {
          feedback.triggerConfetti();
        }
        showToast(feedback.variant, feedback.title, feedback.message);
      }
    });

    return unsubscribe;
  }, [subscribeFinanceEvent, showToast]);

  const portalContent = typeof document !== 'undefined' ? (
    <div
      className="fixed top-5 right-4 sm:right-6 z-[99999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  ) : null;

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {portalContent && createPortal(portalContent, document.body)}
    </ToastContext.Provider>
  );
};
