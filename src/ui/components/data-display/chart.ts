/**
 * Phase Zed.7 - ConcreteChart
 * Chart.js wrapper with Concrete dark theming.
 * Chart.js is imported dynamically to avoid hard dependency.
 */

import { COLORS, FONT } from '../../theme/tokens';

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  type?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'doughnut' | 'horizontalBar' | 'combo';
  labels: string[];
  datasets: ChartDataset[];
  options?: Record<string, unknown>;
}

export class ConcreteChart {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chart: any = null;
  private canvas: HTMLCanvasElement;

  constructor(container: HTMLElement, config: ChartConfig) {
    this.canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(this.canvas);

    void this.init(config);
  }

  private async init(config: ChartConfig): Promise<void> {
    // Dynamic import of Chart.js
    const chartModule = await import('chart.js');
    const { Chart, registerables } = chartModule;
    Chart.register(...registerables);

    // Resolve the actual Chart.js type
    const resolvedType = this.resolveType(config.type);

    // Apply theme defaults
    const themeDefaults = ConcreteChart.getThemeDefaults();

    // Merge user options with theme defaults
    const mergedOptions = this.deepMerge(themeDefaults, config.options ?? {});

    // Build datasets with default colors if not set
    const datasets = config.datasets.map((ds, idx) => {
      const color = COLORS.chart[idx % COLORS.chart.length];
      return {
        ...ds,
        backgroundColor: ds.backgroundColor ?? (config.type === 'line' ? `${color}33` : color),
        borderColor: ds.borderColor ?? color,
        borderWidth: ds.type === 'line' || config.type === 'line' ? 2 : 0,
      };
    });

    this.chart = new Chart(this.canvas, {
      type: resolvedType as 'line' | 'bar' | 'doughnut',
      data: {
        labels: config.labels,
        datasets: datasets as any[], // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      options: mergedOptions as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });
  }

  private resolveType(type: ChartConfig['type']): string {
    if (type === 'horizontalBar') return 'bar';
    if (type === 'combo') return 'bar';
    return type;
  }

  async update(config: Partial<ChartConfig>): Promise<void> {
    if (!this.chart) return;

    if (config.labels) {
      this.chart.data.labels = config.labels;
    }
    if (config.datasets) {
      this.chart.data.datasets = config.datasets.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ds: ChartDataset, idx: number) => {
          const color = COLORS.chart[idx % COLORS.chart.length];
          return {
            ...ds,
            backgroundColor: ds.backgroundColor ?? color,
            borderColor: ds.borderColor ?? color,
          };
        }
      );
    }
    if (config.options) {
      this.chart.options = this.deepMerge(this.chart.options, config.options);
    }
    this.chart.update();
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  /** Get Concrete-themed color palette */
  static getColors(count: number): string[] {
    const palette: string[] = [];
    for (let i = 0; i < count; i++) {
      palette.push(COLORS.chart[i % COLORS.chart.length]);
    }
    return palette;
  }

  /** Apply Concrete dark theme defaults to Chart.js */
  static getThemeDefaults(): Record<string, unknown> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: COLORS.textMuted,
            font: { family: FONT.sans, size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: COLORS.surfaceRaised,
          titleColor: COLORS.text,
          bodyColor: COLORS.textMuted,
          borderColor: COLORS.border,
          borderWidth: 1,
          cornerRadius: 6,
          padding: 10,
          titleFont: { family: FONT.sans, weight: '600' },
          bodyFont: { family: FONT.sans },
        },
      },
      scales: {
        x: {
          grid: { color: `${COLORS.border}44`, drawBorder: false },
          ticks: {
            color: COLORS.textMuted,
            font: { family: FONT.sans, size: 11 },
          },
        },
        y: {
          grid: { color: `${COLORS.border}44`, drawBorder: false },
          ticks: {
            color: COLORS.textMuted,
            font: { family: FONT.sans, size: 11 },
          },
        },
      },
      elements: {
        point: { radius: 3, hoverRadius: 5 },
        line: { tension: 0.3 },
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }
}
