
export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
};

export const themes: Record<ThemeMode, AppTheme> = {
  dark: {
    mode: 'dark',
    background: '#10101C',
    surface: '#1C1B2B',
    surfaceAlt: '#26243A',
    text: '#F7F4FF',
    muted: '#A6A1BE',
    border: '#302D45',
    accent: '#8B68F5',
    accentSoft: '#332852',
    success: '#48C9A0',
    warning: '#F1B85B',
    danger: '#F078A0',
  },

  light: {
    mode: 'light',
    background: '#F5F2FF',
    surface: '#FFFFFF',
    surfaceAlt: '#EEE9FC',
    text: '#211B38',
    muted: '#77718E',
    border: '#E5DDF8',
    accent: '#7654E8',
    accentSoft: '#EAE3FF',
    success: '#168D6C',
    warning: '#B87516',
    danger: '#D74778',
  },
};
