import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
  returnFocus?: boolean;
}

/**
 * Traps keyboard focus within the referenced element when active,
 * cycles Tab and Shift+Tab, handles Escape key dismissal, and returns focus
 * to the trigger element upon deactivation.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>({
  isActive,
  onEscape,
  returnFocus = true,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || typeof document === 'undefined') return;

    // Capture currently focused element to return focus upon modal close
    triggerElementRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // Focus explicit autofocus element, or first interactive element, or fallback to container
    const autoFocusEl = container.querySelector<HTMLElement>('[data-autofocus], [autofocus]');
    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const initialTimer = requestAnimationFrame(() => {
      if (autoFocusEl) {
        autoFocusEl.focus();
      } else if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        if (!container.hasAttribute('tabindex')) {
          container.setAttribute('tabindex', '-1');
        }
        container.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      // If focus is inside a different container (e.g. a stacked child modal), do not intercept
      if (container && document.activeElement && !container.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }

      if (e.key === 'Escape') {
        if (onEscape) {
          e.stopPropagation();
          onEscape();
        }
        return;
      }

      if (e.key === 'Tab') {
        const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (elements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: if on first element or container, wrap to last
          if (document.activeElement === firstElement || document.activeElement === container) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cancelAnimationFrame(initialTimer);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (returnFocus && triggerElementRef.current && document.contains(triggerElementRef.current)) {
        triggerElementRef.current.focus();
      }
    };
  }, [isActive, onEscape, returnFocus]);

  return containerRef;
}
