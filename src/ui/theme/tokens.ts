/**
 * Phase Zed.7 - Design Token Constants
 * Used for Chart.js theming and programmatic color access.
 */

export const COLORS = {
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  neutral: '#6b7280',
  surface: '#1e1e2e',
  surfaceRaised: '#2a2a3e',
  border: '#3f3f5f',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  /** Chart palette — 10 visually distinct brand-consistent colors */
  chart: [
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#22c55e',
    '#06b6d4',
    '#f97316',
    '#14b8a6',
    '#a855f7',
    '#ef4444',
  ],
} as const;

export const FONT = {
  sans: 'Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, monospace',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const RADII = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;
