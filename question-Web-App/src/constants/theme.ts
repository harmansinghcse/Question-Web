export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  card: string;
  // Text
  text: string;
  textSecondary: string;
  muted: string;
  // Borders
  border: string;
  borderStrong: string;
  // Brand / accent
  accent: string;
  accentDeep: string;
  accentSoft: string;
  accentMuted: string;
  primaryLight: string;
  secondaryAccent: string;
  // Sidebar
  sidebarBg: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarActiveBg: string;
  sidebarBorder: string;
  // Status
  success: string;
  warning: string;
  danger: string;
  // Gradients
  gradients: {
    primary: [string, string];
    purpleBlue: [string, string];
    blue: [string, string];
    warm: [string, string];
  };
  // Typography scale (font-size numbers)
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
  };
  // Spacing
  space: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  // Radius
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
};

const SHARED_SCALE = {
  fontSize: {
    xs: 10,
    sm: 11,
    base: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    '2xl': 40,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    full: 999,
  },
};

export const themes: Record<ThemeMode, AppTheme> = {
  dark: {
    mode: 'dark',
    background: '#0B1220',
    surface: '#111827',
    surfaceAlt: '#1E293B',
    surfaceElevated: '#243248',
    card: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    muted: '#94A3B8',
    border: '#334155',
    borderStrong: '#475569',
    accent: '#8B5CF6',
    accentDeep: '#7C3AED',
    accentSoft: '#2D2354',
    accentMuted: '#3B2D6E',
    primaryLight: '#A78BFA',
    secondaryAccent: '#60A5FA',
    sidebarBg: '#0B1220',
    sidebarText: '#F8FAFC',
    sidebarMuted: '#94A3B8',
    sidebarActiveBg: '#8B5CF6',
    sidebarBorder: '#1E293B',
    success: '#22C55E',
    warning: '#FBBF24',
    danger: '#FB7185',
    gradients: {
      primary: ['#7C3AED', '#A78BFA'],
      purpleBlue: ['#6366F1', '#8B5CF6'],
      blue: ['#3B82F6', '#60A5FA'],
      warm: ['#F59E0B', '#F97316'],
    },
    ...SHARED_SCALE,
  },

  light: {
    mode: 'light',
    background: '#FAFAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F6FB',
    surfaceElevated: '#FFFFFF',
    card: '#F4F6FB',
    text: '#0F172A',
    textSecondary: '#64748B',
    muted: '#64748B',
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
    accent: '#6D5EF6',
    accentDeep: '#5B4DE0',
    accentSoft: '#EDE9FF',
    accentMuted: '#DDD6FE',
    primaryLight: '#EDE9FF',
    secondaryAccent: '#3B82F6',
    sidebarBg: '#0B1220',
    sidebarText: '#F8FAFC',
    sidebarMuted: '#94A3B8',
    sidebarActiveBg: '#6D5EF6',
    sidebarBorder: '#1E293B',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#F43F5E',
    gradients: {
      primary: ['#7C3AED', '#A78BFA'],
      purpleBlue: ['#6366F1', '#8B5CF6'],
      blue: ['#3B82F6', '#60A5FA'],
      warm: ['#F59E0B', '#F97316'],
    },
    ...SHARED_SCALE,
  },
};
