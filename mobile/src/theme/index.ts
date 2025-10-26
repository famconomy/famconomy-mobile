// Theme and color system for FamConomy Mobile App

export const colors = {
  // Updated to match web Tailwind palette (apps/web/tailwind.config.js)
  primary: {
    50: '#f5f7f9',
    100: '#e9eef2',
    200: '#d1dce3',
    300: '#adc0cc',
    400: '#839fb0',
    500: '#4f7288', // Brand primary
    600: '#456479',
    700: '#3a5364',
    800: '#334754',
    900: '#2d3d47',
    // 950 provided on web, unused here: '#1a242b'
  },
  secondary: {
    50: '#edfcfb',
    100: '#d5f6f4',
    200: '#aeecea',
    300: '#77dcd8',
    400: '#3cc7c2',
    500: '#23bdb5', // Brand secondary
    600: '#1a8f89',
    700: '#1a726e',
    800: '#1b5b58',
    900: '#1a4b49',
    // 950: '#0a2827'
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#145231',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  // Accent colors from web app
  accent: {
    400: '#f98d39', // Orange accent
    500: '#f67109',
    600: '#e65604',
  },
  highlight: {
    teal: '#14b8a6',
  },
};

export const lightTheme = {
  background: colors.neutral[0],
  surface: colors.neutral[50],
  surfaceVariant: colors.neutral[100],
  text: colors.neutral[900],
  textSecondary: colors.neutral[600],
  textTertiary: colors.neutral[500],
  border: colors.neutral[200],
  divider: colors.neutral[200],
  primary: colors.primary[600],
  primaryLight: colors.primary[100],
  primaryDark: colors.primary[700],
  secondary: colors.secondary[600],
  secondaryLight: colors.secondary[100],
  success: colors.success[600],
  successLight: colors.success[100],
  warning: colors.warning[600],
  warningLight: colors.warning[100],
  error: colors.error[600],
  errorLight: colors.error[100],
  accent: colors.accent[600],
  accentLight: colors.accent[500],
  highlight: colors.highlight.teal,
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
};

export const darkTheme = {
  background: colors.neutral[900],
  surface: colors.neutral[800],
  surfaceVariant: colors.neutral[700],
  text: colors.neutral[50],
  textSecondary: colors.neutral[400],
  textTertiary: colors.neutral[500],
  border: colors.neutral[700],
  divider: colors.neutral[700],
  primary: colors.primary[500],
  primaryLight: colors.primary[900],
  primaryDark: colors.primary[400],
  secondary: colors.secondary[500],
  secondaryLight: colors.secondary[900],
  success: colors.success[500],
  successLight: colors.success[900],
  warning: colors.warning[500],
  warningLight: colors.warning[900],
  error: colors.error[500],
  errorLight: colors.error[900],
  accent: colors.accent[500],
  accentLight: colors.accent[600],
  highlight: colors.highlight.teal,
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
};

export type Theme = typeof lightTheme;

// Spacing scale (4px base)
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
};

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

// Font weights
export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

// Line heights
export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
};

// Shadow definitions
export const shadows = {
  none: 'none',
  xs: {
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
  },
  base: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 5,
  },
  md: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 8,
  },
  lg: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 12,
  },
  xl: {
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 16,
  },
  card: {
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHover: {
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
};
