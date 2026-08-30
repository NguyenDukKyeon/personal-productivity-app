'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
});

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'theme',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  const applyTheme = useCallback(
    (newTheme: Theme) => {
      if (typeof window === 'undefined') return;

      const root = document.documentElement;
      let effective: 'light' | 'dark' = 'dark';

      if (newTheme === 'system') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effective = isSystemDark ? 'dark' : 'light';
      } else {
        effective = newTheme;
      }

      setResolvedTheme(effective);

      if (effective === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }

      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem(storageKey) as Theme | null) || defaultTheme;
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } catch {
      applyTheme(defaultTheme);
    }
  }, [defaultTheme, storageKey, applyTheme]);

  // Listen to system changes when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      applyTheme('system');
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
