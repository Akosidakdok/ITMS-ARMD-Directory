import { useEffect } from 'react';

let activeLocks = 0;
let previousBodyOverflow: string | null = null;

/**
 * Keeps the page scroll locked while one or more modal surfaces are open.
 *
 * A reference count is required because pages can open a confirmation dialog
 * on top of a details dialog. Each modal must release only its own lock.
 */
export const useBodyScrollLock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;

    if (activeLocks === 0) {
      // Older builds could leave this exact stale value behind after a
      // nested dialog closed. It is not a valid baseline for the page.
      previousBodyOverflow = document.body.style.overflow === 'hidden'
        ? ''
        : document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeLocks += 1;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks === 0) {
        document.body.style.overflow = previousBodyOverflow || '';
        previousBodyOverflow = null;
      }
    };
  }, [enabled]);
};
