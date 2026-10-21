let confettiPromise: Promise<any> | null = null;
function getConfetti(): Promise<any> {
  if (!confettiPromise) {
    confettiPromise = import('canvas-confetti').then(m => m.default || m);
  }
  return confettiPromise;
}
import { getPrefersReducedMotion } from '../hooks/useReducedMotion';

const GOLD_PALETTE = ['#F5B742', '#F59E0B', '#FBBF24', '#D97706', '#FEF3C7', '#FFFFFF'];
const WEALTH_PALETTE = ['#10B981', '#059669', '#F5B742', '#3B82F6', '#8B5CF6'];

// Global cooldown timers to prevent overlapping particle storms
let lastMajorConfettiTime = 0;
let lastSparkleTime = 0;
const MAJOR_CONFETTI_COOLDOWN_MS = 2500;
const SPARKLE_COOLDOWN_MS = 1000;

function canTriggerMajorConfetti(): boolean {
  const now = Date.now();
  if (now - lastMajorConfettiTime < MAJOR_CONFETTI_COOLDOWN_MS) {
    return false;
  }
  lastMajorConfettiTime = now;
  return true;
}

function canTriggerSparkle(): boolean {
  const now = Date.now();
  if (now - lastSparkleTime < SPARKLE_COOLDOWN_MS) {
    return false;
  }
  lastSparkleTime = now;
  return true;
}

export function isCalmMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('dhanveda_calm_mode') === 'true';
  } catch {
    return false;
  }
}


/**
 * Elegant non-intrusive alternative visual feedback for users with prefers-reduced-motion
 */
export function triggerGoldHairlineFlash() {
  if (typeof document === 'undefined') return;
  const bar = document.createElement('div');
  bar.className =
    'fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F5B742] to-transparent z-[99999] pointer-events-none animate-fade-in transition-opacity duration-500';
  document.body.appendChild(bar);
  setTimeout(() => {
    bar.style.opacity = '0';
    setTimeout(() => {
      bar.remove();
    }, 500);
  }, 800);
}


/**
 * Standard celebratory burst (e.g. for dream goal achievements)
 * Fast, elegant burst lasting ~1.5s. Accepts optional trigger element to position origin.
 */
export function burstConfetti(targetEl?: HTMLElement | null) {
  if (isCalmMode()) return;
  if (!canTriggerMajorConfetti()) return;

  if (getPrefersReducedMotion()) {
    triggerGoldHairlineFlash();
    return;
  }

  let origin = { y: 0.65 };
  if (targetEl && typeof window !== 'undefined') {
    const rect = targetEl.getBoundingClientRect();
    origin = {
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  try {
    getConfetti().then(confetti => { confetti({
      particleCount: 45,
      spread: 60,
      origin,
      colors: WEALTH_PALETTE,
      ticks: 90,
      gravity: 0.95,
      scalar: 1.0,
      disableForReducedMotion: true,
    }); }).catch(() => {});
  } catch {
    // Graceful fallback
  }
}

/**
 * Suvarna gold shower for financial milestones (emergency fund hit, badge earned)
 * Crisp, smooth, and lightweight — terminates cleanly within ~1.6s
 */
export function goldShower() {
  if (isCalmMode()) return;
  if (!canTriggerMajorConfetti()) return;

  if (getPrefersReducedMotion()) {
    triggerGoldHairlineFlash();
    return;
  }

  try {
    getConfetti().then(confetti => { confetti({
      particleCount: 50,
      spread: 65,
      origin: { y: 0.6 },
      colors: GOLD_PALETTE,
      ticks: 100,
      gravity: 0.95,
      scalar: 1.0,
      disableForReducedMotion: true,
    }); }).catch(() => {});
  } catch {
    // Ignore
  }
}


/**
 * Dual side cannons fired simultaneously for major milestone celebrations
 */
export function dualSideCannons() {
  if (isCalmMode()) return;
  if (!canTriggerMajorConfetti()) return;

  if (getPrefersReducedMotion()) {
    triggerGoldHairlineFlash();
    return;
  }

  try {
    getConfetti().then(confetti => { confetti({
      particleCount: 30,
      angle: 60,
      spread: 50,
      origin: { x: 0.05, y: 0.85 },
      colors: GOLD_PALETTE,
      ticks: 85,
      gravity: 0.9,
      disableForReducedMotion: true,
    }); }).catch(() => {});
    getConfetti().then(confetti => { confetti({
      particleCount: 30,
      angle: 120,
      spread: 50,
      origin: { x: 0.95, y: 0.85 },
      colors: GOLD_PALETTE,
      ticks: 85,
      gravity: 0.9,
      disableForReducedMotion: true,
    }); }).catch(() => {});
  } catch {
    // Ignore
  }
}

/**
 * Subtle sparkle for minor wins (streak continued, settlement recorded)
 */
export function subtleSparkle(originOrEl?: { x: number; y: number } | HTMLElement | null) {
  if (isCalmMode()) return;
  if (!canTriggerSparkle()) return;

  if (getPrefersReducedMotion()) {
    triggerGoldHairlineFlash();
    return;
  }

  let origin = { x: 0.5, y: 0.7 };
  if (originOrEl) {
    if ('nodeType' in originOrEl && typeof window !== 'undefined') {
      const rect = originOrEl.getBoundingClientRect();
      origin = {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      };
    } else if ('x' in originOrEl && 'y' in originOrEl) {
      origin = originOrEl;
    }
  }

  try {
    getConfetti().then(confetti => { confetti({
      particleCount: 16,
      spread: 35,
      startVelocity: 14,
      ticks: 60,
      gravity: 0.8,
      scalar: 0.75,
      origin,
      colors: ['#F5B742', '#10B981', '#FEF3C7'],
      disableForReducedMotion: true,
    }); }).catch(() => {});
  } catch {
    // Ignore
  }
}
