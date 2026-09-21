import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'pnp_pais_theme';

const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Local storage may be blocked or restricted
  }
  return 'light';
};

/**
 * Temporarily disables all CSS transitions across the DOM during theme toggling.
 * This prevents the browser from interpolating colors on thousands of elements simultaneously,
 * eliminating all frame drops, jank, and lag during theme transitions.
 */
const disableTransitionsTemporarily = () => {
  if (typeof document === 'undefined') return null;
  const css = document.createElement('style');
  css.setAttribute('type', 'text/css');
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  return () => {
    // Force browser to synchronously commit computed styles with zero transition
    void window.getComputedStyle(document.documentElement).opacity;
    // Remove the override on the next frame so interaction transitions still work
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (css.parentNode) {
          css.parentNode.removeChild(css);
        }
      });
    });
  };
};

const applyThemeToDocument = (theme: Theme, suppressTransitions = true) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = theme === 'dark';

  const restoreTransitions = suppressTransitions ? disableTransitionsTemporarily() : null;

  if (isDark) {
    root.classList.remove('light');
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;

  if (restoreTransitions) {
    restoreTransitions();
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(prev => {
      if (prev === newTheme) return prev;
      applyThemeToDocument(newTheme, true);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {
        // Storage unavailable
      }
      return newTheme;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const nextTheme: Theme = prev === 'dark' ? 'light' : 'dark';
      applyThemeToDocument(nextTheme, true);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Storage unavailable
      }
      return nextTheme;
    });
  }, []);

  useEffect(() => {
    // Ensure initial theme is synced to document on mount without transition suppression
    applyThemeToDocument(theme, false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && (event.newValue === 'dark' || event.newValue === 'light')) {
        const next = event.newValue as Theme;
        setThemeState(next);
        applyThemeToDocument(next, true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); // Only bind once on mount

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
