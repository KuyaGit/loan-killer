/**
 * Design tokens for Loan Logs — palette, typography, spacing, radius, elevation.
 *
 * Brand primary: emerald (#059669 light / #10b981 dark) — money/growth, Mint/YNAB aesthetic.
 * Architecture: extend Colors with new semantic keys; `tint`/`tabIconSelected` repoint to
 * primary so all existing consumers update for free.
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

export const Colors = {
  light: {
    // Text
    text: '#0f1722',
    muted: '#5b6b7b',
    // Surfaces
    background: '#f4f7f9',
    card: '#ffffff',
    cardElevated: '#ffffff',
    border: '#e3e9ee',
    track: '#e9eef3',        // progress-bar track (distinct from border)
    pendingBg: '#eef2f6',
    shadow: '#0f1722',
    // Brand / interactive
    primary: '#059669',
    primaryMuted: '#d1fae5',
    onPrimary: '#ffffff',
    tint: '#059669',
    // Tab bar
    icon: '#8a98a6',
    tabIconDefault: '#8a98a6',
    tabIconSelected: '#059669',
    // Semantic
    success: '#16a34a',
    pending: '#94a3b8',
    danger: '#dc2626',
  },
  dark: {
    // Text
    text: '#e8edf2',
    muted: '#94a3b8',
    // Surfaces
    background: '#0e1417',
    card: '#19222a',
    cardElevated: '#202b34',
    border: '#283541',
    track: '#243039',
    pendingBg: '#1a232b',
    shadow: '#000000',
    // Brand / interactive
    primary: '#10b981',
    primaryMuted: '#10b9811f',
    onPrimary: '#06241b',
    tint: '#10b981',
    // Tab bar
    icon: '#7c8b99',
    tabIconDefault: '#7c8b99',
    tabIconSelected: '#10b981',
    // Semantic
    success: '#22c55e',
    pending: '#64748b',
    danger: '#ef4444',
  },
};

// ---------------------------------------------------------------------------
// Typography scale
// ---------------------------------------------------------------------------

const roundedFamily = Platform.select({
  ios: 'ui-rounded',
  default: 'normal',
  web: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', sans-serif",
});

export const Type = {
  screenTitle: { fontSize: 30, fontWeight: '800' as const, lineHeight: 36, fontFamily: roundedFamily },
  heroNumber: { fontSize: 34, fontWeight: '800' as const, lineHeight: 40, fontFamily: roundedFamily },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  cardTitle: { fontSize: 17, fontWeight: '700' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '700' as const, lineHeight: 20 },
};

// ---------------------------------------------------------------------------
// Spacing scale (4pt rhythm)
// ---------------------------------------------------------------------------

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ---------------------------------------------------------------------------
// Radius scale
// ---------------------------------------------------------------------------

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

// ---------------------------------------------------------------------------
// Elevation / shadow helper
// Light mode: iOS shadow + Android elevation.
// Dark mode: suppress shadow; card lightness vs bg already conveys lift.
// ---------------------------------------------------------------------------

export function cardShadow(
  scheme: 'light' | 'dark' | null | undefined,
  opts: { strong?: boolean } = {}
) {
  if (scheme === 'dark') {
    return {};
  }
  const opacity = opts.strong ? 0.10 : 0.06;
  const radius = opts.strong ? 16 : 12;
  return Platform.select({
    ios: {
      shadowColor: Colors.light.shadow,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: 4 },
    },
    default: {
      elevation: opts.strong ? 4 : 2,
    },
  }) ?? {};
}

// ---------------------------------------------------------------------------
// Fonts (keep for backward compat)
// ---------------------------------------------------------------------------

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

