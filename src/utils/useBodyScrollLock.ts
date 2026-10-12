import { useEffect } from 'react';

let activeLocks = 0;
let previousBodyOverflow: string | null = null;
let previousBodyPaddingRight: string | null = null;

export const calculateScrollbarWidth = (windowInnerWidth: number, docClientWidth: number): number =>
  Math.max(0, windowInnerWidth - docClientWidth);

export const getActiveLockCount = (): number => activeLocks;

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
      // Calculate scrollbar width before locking overflow to prevent background layout shift
      const scrollbarWidth = calculateScrollbarWidth(window.innerWidth, document.documentElement.clientWidth);

      // Older builds could leave this exact stale value behind after a
      // nested dialog closed. It is not a valid baseline for the page.
      previousBodyOverflow = document.body.style.overflow === 'hidden'
        ? ''
        : document.body.style.overflow;
      previousBodyPaddingRight = document.body.style.paddingRight;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    activeLocks += 1;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks === 0) {
        document.body.style.overflow = previousBodyOverflow || '';
        document.body.style.paddingRight = previousBodyPaddingRight || '';
        previousBodyOverflow = null;
        previousBodyPaddingRight = null;
      }
    };
  }, [enabled]);
};
