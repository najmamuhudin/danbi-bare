import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_KEY = 'crimewatch_theme';

const getSystemTheme = () => (
  window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
);

const getStoredTheme = () => {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : getSystemTheme();
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(THEME_KEY, theme);
};

const ThemeToggle = () => {
  const [theme, setTheme] = useState(getStoredTheme);
  const isLight = theme === 'light';
  const Icon = isLight ? Moon : Sun;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-textMuted transition-colors hover:bg-white/5 hover:text-white"
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <Icon className="w-4 h-4" />
      <span className="sr-only">{isLight ? 'Dark mode' : 'Light mode'}</span>
    </button>
  );
};

export default ThemeToggle;
