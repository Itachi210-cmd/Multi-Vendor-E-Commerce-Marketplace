import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [hasManualChoice, setHasManualChoice] = useState(() => {
    try {
      return localStorage.getItem('theme') !== null;
    } catch {
      return false;
    }
  });

  const applyTheme = useCallback((newTheme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
      const meta = document.getElementById('meta-theme-color') || document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', newTheme === 'dark' ? '#0B1220' : '#F0F9FF');
      }
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for OS preference changes when user hasn't chosen manually
  useEffect(() => {
    if (hasManualChoice || typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const osTheme = e.matches ? 'dark' : 'light';
      setThemeState(osTheme);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [hasManualChoice]);

  const setTheme = useCallback((newTheme) => {
    const target = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(target);
    setHasManualChoice(true);
    try {
      localStorage.setItem('theme', target);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;

