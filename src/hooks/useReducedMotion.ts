import { useState, useEffect } from 'react';

/**
 * Returns true if the user prefers reduced motion, either via OS setting
 * (`prefers-reduced-motion: reduce`) or via the app's `data-motion="off"` override.
 * SSR-safe, synchronous fallback.
 */
export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check DOM attribute override on <html> or <body>
  const motionAttr = document.documentElement.dataset.motion || document.body?.dataset.motion;
  if (motionAttr === 'off' || motionAttr === 'reduced') return true;
  if (motionAttr === 'on' || motionAttr === 'standard') return false;

  // 2. Check local storage override if present
  try {
    const stored = localStorage.getItem('dhanveda_motion');
    if (stored === 'off') return true;
    if (stored === 'on') return false;
  } catch {
    // Ignore localStorage access failures in restricted iframes
  }

  // 3. Fall back to system media query
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/**
 * React hook that dynamically tracks whether reduced motion is preferred.
 * Updates immediately when system preferences or the DOM data-motion attribute changes.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(getPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      setReducedMotion(getPrefersReducedMotion());
    };

    // Listen to media query changes
    mediaQuery.addEventListener?.('change', update);

    // Observe documentElement for data-motion changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-motion') {
          update();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    // Custom event listener for manual dispatch if needed
    window.addEventListener('dhanveda-motion-change', update);

    return () => {
      mediaQuery.removeEventListener?.('change', update);
      observer.disconnect();
      window.removeEventListener('dhanveda-motion-change', update);
    };
  }, []);

  return reducedMotion;
}
