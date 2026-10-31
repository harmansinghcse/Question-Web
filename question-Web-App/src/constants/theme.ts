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
    xs: 11,
    sm: 12,
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
    full: 9999,
  },
};

export const themes: Record<ThemeMode, AppTheme> = {
  dark: {
    mode: 'dark',
    background: '#101426',
    surface: '#191F35',
    surfaceAlt: '#212946',
    surfaceElevated: '#252D46',
    card: '#191F35',
    text: '#F5F5FA',
    textSecondary: '#A3AAC0',
    muted: '#76809E',
    border: '#303951',
    borderStrong: '#424E6D',
    accent: '#9275F5',
    accentDeep: '#7457D9',
    accentSoft: 'rgba(146, 117, 245, 0.16)',
    accentMuted: 'rgba(146, 117, 245, 0.28)',
    primaryLight: '#C4B5FD',
    secondaryAccent: '#60A5FA',
    sidebarBg: '#13182E',
    sidebarText: '#F5F5FA',
    sidebarMuted: '#848EAA',
    sidebarActiveBg: '#7457D9',
    sidebarBorder: '#273047',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#F43F5E',
    gradients: {
      primary: ['#7457D9', '#9275F5'],
      purpleBlue: ['#6366F1', '#9275F5'],
      blue: ['#3B82F6', '#60A5FA'],
      warm: ['#F59E0B', '#F97316'],
    },
    ...SHARED_SCALE,
  },

  light: {
    mode: 'light',
    background: '#F8F9FD',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F2FA',
    surfaceElevated: '#FFFFFF',
    card: '#FFFFFF',
    text: '#101426',
    textSecondary: '#64748B',
    muted: '#8A97AB',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    accent: '#7457D9',
    accentDeep: '#5F44C2',
    accentSoft: 'rgba(116, 87, 217, 0.10)',
    accentMuted: 'rgba(116, 87, 217, 0.20)',
    primaryLight: '#EDE9FE',
    secondaryAccent: '#3B82F6',
    sidebarBg: '#FFFFFF',
    sidebarText: '#101426',
    sidebarMuted: '#64748B',
    sidebarActiveBg: '#7457D9',
    sidebarBorder: '#E2E8F0',
    success: '#10B981',
    warning: '#D97706',
    danger: '#E11D48',
    gradients: {
      primary: ['#7457D9', '#9275F5'],
      purpleBlue: ['#6366F1', '#8B5CF6'],
      blue: ['#3B82F6', '#60A5FA'],
      warm: ['#F59E0B', '#F97316'],
    },
    ...SHARED_SCALE,
  },
};
