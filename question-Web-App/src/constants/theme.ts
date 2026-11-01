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
  onAccent: string;
  // Selectable / interactive control tokens
  controlBg: string;
  controlBorder: string;
  controlText: string;
  controlActiveBg: string;
  controlActiveBorder: string;
  controlActiveText: string;
  controlSoftActiveBg: string;
  controlSoftActiveBorder: string;
  controlSoftActiveText: string;
  disabledBg: string;
  disabledText: string;
  disabledBorder: string;
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
    onAccent: '#FFFFFF',
    controlBg: '#191F35',
    controlBorder: '#303951',
    controlText: '#E2E8F0',
    controlActiveBg: '#7457D9',
    controlActiveBorder: '#9275F5',
    controlActiveText: '#FFFFFF',
    controlSoftActiveBg: 'rgba(146, 117, 245, 0.22)',
    controlSoftActiveBorder: '#9275F5',
    controlSoftActiveText: '#EDE9FE',
    disabledBg: '#212946',
    disabledText: '#76809E',
    disabledBorder: '#303951',
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
    onAccent: '#FFFFFF',
    controlBg: '#FFFFFF',
    controlBorder: '#CBD5E1',
    controlText: '#334155',
    controlActiveBg: '#6D4CD4',
    controlActiveBorder: '#5F44C2',
    controlActiveText: '#FFFFFF',
    controlSoftActiveBg: 'rgba(116, 87, 217, 0.14)',
    controlSoftActiveBorder: '#7457D9',
    controlSoftActiveText: '#4C2FA6',
    disabledBg: '#E2E8F0',
    disabledText: '#64748B',
    disabledBorder: '#CBD5E1',
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

/**
 * Calculates WCAG relative luminance for a given hex or rgb color string.
 * Returns a value in [0, 1] where 0 is pitch black and 1 is pure white.
 */
export function getLuminance(colorStr: string): number {
  if (!colorStr) return 0.5;
  const str = colorStr.trim();
  if (str.startsWith('rgb')) {
    const nums = str.match(/\d+(\.\d+)?/g);
    if (nums && nums.length >= 3) {
      const [r, g, b] = nums.map((v) => Number(v) / 255);
      const toLinear = (c: number) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }
  }

  let hex = str.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((ch) => ch + ch).join('');
  }
  if (hex.length >= 6) {
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }
  return 0.5;
}

/**
 * Returns a high-contrast text color ('#FFFFFF' or '#0F172A') for any background color.
 */
export function getContrastText(
  bg: string,
  lightColor = '#FFFFFF',
  darkColor = '#0F172A',
): string {
  const lum = getLuminance(bg);
  return lum > 0.38 ? darkColor : lightColor;
}

/**
 * Ensures a vibrant color remains clearly readable as text against light or dark surfaces.
 */
export function getReadableTintColor(color: string, mode: ThemeMode): string {
  if (!color) return mode === 'dark' ? '#F5F5FA' : '#101426';
  const lum = getLuminance(color);
  if (mode === 'light' && lum > 0.4) {
    // For pastel or light colors on light theme, map to deeper readable tones
    const map: Record<string, string> = {
      '#34D399': '#059669', // emerald
      '#38BDF8': '#0284C7', // sky
      '#A78BFA': '#6D28D9', // purple
      '#F59E0B': '#B45309', // amber
      '#818CF8': '#4338CA', // indigo
      '#60A5FA': '#1D4ED8', // blue
    };
    return map[color.toUpperCase()] || map[color] || '#4C1D95';
  }
  if (mode === 'dark' && lum < 0.2) {
    return '#E0E7FF';
  }
  return color;
}
