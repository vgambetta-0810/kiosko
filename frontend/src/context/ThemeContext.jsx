import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'kiosko-theme';
const THEME_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext(null);

const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(THEME_QUERY).matches ? 'dark' : 'light';
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return getSystemTheme();
};

const hasSavedTheme = () => {
  if (typeof window === 'undefined') return false;
  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  return savedTheme === 'light' || savedTheme === 'dark';
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [hasUserPreference, setHasUserPreference] = useState(hasSavedTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(THEME_QUERY);
    if (!mediaQuery || hasUserPreference) return undefined;

    const handleSystemThemeChange = (event) => {
      setTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [hasUserPreference]);

  const value = useMemo(() => {
    const persistTheme = (nextTheme) => {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      setHasUserPreference(true);
      setTheme(nextTheme);
    };

    const setLightTheme = () => persistTheme('light');
    const setDarkTheme = () => persistTheme('dark');
    const toggleTheme = () => persistTheme(theme === 'dark' ? 'light' : 'dark');

    return {
      theme,
      isDark: theme === 'dark',
      setLightTheme,
      setDarkTheme,
      toggleTheme
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
