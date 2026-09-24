/**
 * Theme - dark (the default laboratory) or light.
 *
 * The choice is stamped on <html> as data-theme, which the stylesheet reads
 * to swap the token palette; it is remembered in localStorage. Visualisation
 * frames and the code editor stay dark in both themes on purpose: a graph and
 * a program read best as lit instruments, whatever the room around them.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'mathxplore.theme';

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage unavailable - fall through */
  }
  return 'dark';
}

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Read after mount so server rendering and the first client paint agree.
  useEffect(() => {
    const stored = readStored();
    setTheme(stored);
    apply(stored);
  }, []);

  const set = useCallback((t: Theme) => {
    setTheme(t);
    apply(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* fine */
    }
  }, []);

  const toggle = useCallback(() => set(theme === 'dark' ? 'light' : 'dark'), [theme, set]);

  return <ThemeContext.Provider value={{ theme, toggle, set }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
