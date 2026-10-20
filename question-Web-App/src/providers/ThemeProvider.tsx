
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  themes,
  type AppTheme,
  type ThemeMode,
} from '../constants/theme';

const THEME_STORAGE_KEY = '@question-web/theme-mode';

type ThemeContextValue = {
  mode: ThemeMode;
  theme: AppTheme;
  ready: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPreference() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (active && (saved === 'light' || saved === 'dark')) {
          setModeState(saved);
        }
      } catch {
        // TODO(FRONTEND): Add optional preference-storage error reporting.
      } finally {
        if (active) setReady(true);
      }
    }

    loadPreference();

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);

    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => {
      // The selected theme still works for this session.
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      theme: themes[mode],
      ready,
      setMode,
      toggleTheme,
    }),
    [mode, ready, setMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useAppTheme must be used inside ThemeProvider.',
    );
  }

  return context;
}
