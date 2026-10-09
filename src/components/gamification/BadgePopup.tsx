import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Star, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Badge, BadgeTier } from '../../types/finance';
import { IconRenderer } from '../common/IconRenderer';
import { dualSideCannons } from '../../utils/confetti';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const TIER_CONFIG: Record<BadgeTier, { label: string; border: string; bg: string; text: string; glow: string }> = {
 bronze: {
 label: 'Bronze Achievement',
 border: 'border-amber-700/40',
 bg: 'bg-amber-900/10 text-amber-700 dark:text-amber-400',
 text: 'text-amber-700 dark:text-amber-400',
 glow: 'rgba(180, 83, 9, 0.25)',
 },
 silver: {
 label: 'Silver Achievement',
 border: 'border-slate-300 dark:border-slate-600',
 bg: 'bg-slate-100 dark:bg-slate-800 text-ink-2',
 text: 'text-ink-2',
 glow: 'rgba(148, 163, 184, 0.25)',
 },
 gold: {
 label: 'Gold Achievement',
 border: 'border-amber-400 dark:border-reward',
 bg: 'bg-amber-500/15 text-amber-700 dark:text-reward',
 text: 'text-amber-700 dark:text-reward',
 glow: 'rgba(245, 183, 66, 0.35)',
 },
 diamond: {
 label: 'Diamond Achievement',
 border: 'border-cyan-400 dark:border-cyan-300',
 bg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
 text: 'text-cyan-600 dark:text-cyan-300',
 glow: 'rgba(56, 189, 248, 0.35)',
 },
};

export const BadgePopup: React.FC = () => {
  const { subscribeFinanceEvent, setCurrentView } = useFinance();
  const badgeQueueRef = useRef<Badge[]>([]);
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleDismissRef = useRef<() => void>(() => {});

  useScrollLock(Boolean(currentBadge));

  const handleDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    setIsExiting(true);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = setTimeout(() => {
      setIsExiting(false);
      const nextBadge = badgeQueueRef.current.shift();
      if (nextBadge) {
        setCurrentBadge(nextBadge);
        dualSideCannons();
        autoDismissTimerRef.current = setTimeout(() => {
          handleDismissRef.current();
        }, 5000);
      } else {
        setCurrentBadge(null);
      }
    }, 180);
  }, []);

  useEffect(() => {
    handleDismissRef.current = handleDismiss;
  }, [handleDismiss]);

  // Subscribe to badge_earned finance event
  useEffect(() => {
    if (!subscribeFinanceEvent) return;

    const unsubscribe = subscribeFinanceEvent((event) => {
      if (event.type === 'badge_earned' && event.badge) {
        const newBadge = event.badge as Badge;
        setCurrentBadge(current => {
          if (!current) {
            dualSideCannons();
            if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
            autoDismissTimerRef.current = setTimeout(() => {
              handleDismissRef.current();
            }, 5000);
            return newBadge;
          } else {
            badgeQueueRef.current.push(newBadge);
            return current;
          }
        });
      }
    });

    return unsubscribe;
  }, [subscribeFinanceEvent]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

 const handleViewVault = useCallback(() => {
 handleDismiss();
 setCurrentView('badges');
 }, [handleDismiss, setCurrentView]);

 const focusTrapRef = useFocusTrap<HTMLDivElement>({
 isActive: Boolean(currentBadge && !isExiting),
 onEscape: handleDismiss,
 });

 if (!currentBadge || typeof document === 'undefined') {
 return null;
 }

 const tier = currentBadge.tier || 'bronze';
 const config = TIER_CONFIG[tier];

 return createPortal(
 <div
 ref={focusTrapRef}
 role="dialog"
 aria-modal="true"
 aria-labelledby="badge-title"
 aria-describedby="badge-desc"
 className="fixed inset-0 z-50 flex items-center justify-center p-4"
 >
 {/* Backdrop */}
 <div
 className={`fixed inset-0 bg-black/60 transition-opacity duration-200 ${
 isExiting ? 'opacity-0' : 'animate-fade-in opacity-100'
 }`}
 onClick={handleDismiss}
 />

 {/* Celebratory Modal Card */}
 <div
 className={`relative z-10 max-w-md w-full rounded-2xl bg-surface border-2 ${config.border} p-7 text-center shadow-2xl overflow-hidden transition-[transform,opacity] duration-200 transform will-change-transform-opacity ${
 isExiting
 ? 'opacity-0 scale-95 translate-y-2'
 : 'animate-badge-unlock'
 }`}
 style={{
 boxShadow: `0 20px 50px -10px ${config.glow}`,
 }}
 >
 {/* Background decorative radiant glow */}
 <div
 className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-60"
 style={{ backgroundColor: config.glow }}
 />

 {/* Close Button */}
 <button
 onClick={handleDismiss}
 aria-label="Close notification"
 className="absolute top-4 right-4 p-2 rounded-xl text-ink-3 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-sunken transition-colors press"
 >
 <X className="w-5 h-5" />
 </button>

 {/* Header Tier Pill */}
 <div
 className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-5 border border-current shadow-xs"
 style={{ backgroundColor: `${config.glow}`, color: 'inherit' }}
 >
 <Sparkles className="w-3.5 h-3.5 text-amber-500" />
 <span className={config.text}>{config.label}</span>
 </div>

 {/* Center Badge Icon Container */}
 <div className="relative mx-auto w-24 h-24 mb-5 flex items-center justify-center">
 {/* Animated concentric rings */}
 <div className="absolute inset-0 rounded-2xl border border-dashed border-amber-400/40 animate-spin-slow pointer-events-none" />
 <div
 className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${config.bg} border ${config.border} animate-badge-icon-pop`}
 >
 <IconRenderer
 name={currentBadge.icon || 'Award'}
 className={`w-10 h-10 ${config.text}`}
 />
 </div>
 <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-scale-in">
 <CheckCircle2 className="w-4 h-4" />
 </div>
 </div>

 {/* Badge Title & XP */}
 <h3 id="badge-title" className="text-2xl font-black text-ink-1 tracking-tight mb-2">
 {currentBadge.name}
 </h3>
 <p id="badge-desc" className="text-sm text-ink-2 leading-relaxed max-w-xs mx-auto mb-5">
 {currentBadge.description}
 </p>

 {/* XP Award Pill */}
 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-reward border border-amber-500/25 mb-6">
 <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
 <span className="font-numeric font-extrabold text-base">+{currentBadge.xp} XP</span>
 <span className="text-xs font-semibold text-ink-3">added to your score</span>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-3">
 <button
 onClick={handleViewVault}
 className="flex-1 py-3 px-4 rounded-xl bg-sunken hover:bg-line text-ink-1 text-xs sm:text-sm font-bold transition-colors press"
 >
 View Trophy Vault
 </button>
 <button
 onClick={handleDismiss}
 className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs sm:text-sm font-bold shadow-sm transition-colors press"
 >
 Collect &amp; Continue
 </button>
 </div>
 </div>
 </div>,
 document.body
 );
};
