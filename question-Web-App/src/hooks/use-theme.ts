/**
 * Thin wrapper that resolves the current theme from the colour scheme.
 * Prefer useAppTheme() from ThemeProvider for full theme context.
 *
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { themes } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const mode = scheme === 'light' ? 'light' : 'dark';

  return themes[mode];
}
