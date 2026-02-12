/**
 * Phase Zed.7 - KPICard
 * KPI card component with label, value, trend indicator, and conditional coloring.
 */

export interface KPICardConfig {
  label: string;
  value: string;
  trend?: { direction: 'up' | 'down' | 'flat'; value?: string };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

const COLOR_MAP: Record<string, { border: string; text: string; bg: string }> = {
  default: {
    border: 'border-[var(--border)]',
    text: 'text-[var(--text)]',
    bg: 'bg-[var(--surface-raised)]',
  },
  success: {
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
  },
  warning: {
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500/5',
  },
  danger: {
    border: 'border-red-500/30',
    text: 'text-red-400',
    bg: 'bg-red-500/5',
  },
  info: {
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/5',
  },
};

const TREND_ICONS: Record<string, string> = {
  up: '\u2191',
  down: '\u2193',
  flat: '\u2192',
};

const TREND_COLORS: Record<string, string> = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  flat: 'text-[var(--text-muted)]',
};

export class KPICard {
  static render(config: KPICardConfig): HTMLElement {
    const colorScheme = COLOR_MAP[config.color ?? 'default'];

    const card = document.createElement('div');
    card.className = `rounded-lg border p-4 ${colorScheme.border} ${colorScheme.bg} transition-colors`;

    if (config.onClick) {
      card.className += ' cursor-pointer hover:brightness-110';
      card.addEventListener('click', config.onClick);
    }

    // Label
    const label = document.createElement('div');
    label.className = 'text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1';
    label.textContent = config.label;
    card.appendChild(label);

    // Value row
    const valueRow = document.createElement('div');
    valueRow.className = 'flex items-end gap-2';

    const value = document.createElement('div');
    value.className = `text-2xl font-semibold ${colorScheme.text} leading-tight`;
    value.textContent = config.value;
    valueRow.appendChild(value);

    // Trend
    if (config.trend) {
      const trendEl = document.createElement('div');
      const trendColor = TREND_COLORS[config.trend.direction];
      trendEl.className = `flex items-center gap-0.5 text-xs font-medium ${trendColor} mb-0.5`;

      const arrow = document.createElement('span');
      arrow.textContent = TREND_ICONS[config.trend.direction];
      trendEl.appendChild(arrow);

      if (config.trend.value) {
        const trendValue = document.createElement('span');
        trendValue.textContent = config.trend.value;
        trendEl.appendChild(trendValue);
      }

      valueRow.appendChild(trendEl);
    }

    card.appendChild(valueRow);

    return card;
  }
}
