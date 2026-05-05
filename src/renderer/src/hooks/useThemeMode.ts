import { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

export const THEME_KEY = 'king:themeMode';
const CHANGE_EVENT = 'king:themeMode:change';

function readTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function writeTheme(next: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore */
  }
}

function applyTheme(next: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', next);
}

interface ChangeDetail {
  theme: ThemeMode;
}

export function useThemeMode(): [ThemeMode, (next: ThemeMode) => void] {
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<ChangeDetail>).detail;
      setTheme(detail?.theme === 'dark' ? 'dark' : 'light');
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        setTheme(e.newValue === 'dark' ? 'dark' : 'light');
      }
    };

    window.addEventListener(CHANGE_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CHANGE_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setThemeMode = useCallback((next: ThemeMode) => {
    writeTheme(next);
    applyTheme(next);
    window.dispatchEvent(new CustomEvent<ChangeDetail>(CHANGE_EVENT, { detail: { theme: next } }));
  }, []);

  return [theme, setThemeMode];
}
