
export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
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
  // Sidebar (always dark)
  sidebarBg: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarActiveBg: string;
  sidebarBorder: string;
  // Status
  success: string;
  warning: string;
  danger: string;
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
    background: '#11121F',
    surface: '#1C1D2D',
    surfaceAlt: '#242537',
    surfaceElevated: '#2C2D42',
    text: '#F0EEFF',
    textSecondary: '#C4BFDD',
    muted: '#8880A8',
    border: '#2E2D44',
    borderStrong: '#403E58',
    accent: '#7654E8',
    accentDeep: '#4930B9',
    accentSoft: '#2D2158',
    accentMuted: '#3D2D70',
    sidebarBg: '#0D0E1A',
    sidebarText: '#E8E4FF',
    sidebarMuted: '#6E6888',
    sidebarActiveBg: '#7654E8',
    sidebarBorder: '#1C1B2E',
    success: '#3AC9A0',
    warning: '#F0B45A',
    danger: '#EF6090',
    ...SHARED_SCALE,
  },

  light: {
    mode: 'light',
    background: '#F6F3FF',
    surface: '#FFFFFF',
    surfaceAlt: '#EEE8FF',
    surfaceElevated: '#F9F7FF',
    text: '#17172A',
    textSecondary: '#3D3860',
    muted: '#77758F',
    border: '#E6E1F0',
    borderStrong: '#CEC7E8',
    accent: '#6845E8',
    accentDeep: '#4930B9',
    accentSoft: '#EEE8FF',
    accentMuted: '#DDD5FF',
    sidebarBg: '#17172A',
    sidebarText: '#EEE8FF',
    sidebarMuted: '#7B7895',
    sidebarActiveBg: '#6845E8',
    sidebarBorder: '#252438',
    success: '#168D6C',
    warning: '#B87516',
    danger: '#D74778',
    ...SHARED_SCALE,
  },
};
