/**
 * Phase Zed.19 - Configuration Manager
 * Manages application configuration with localStorage persistence,
 * dot-notation access, and event notifications on change.
 */

import type { EventBus } from '../events/bus';

export class ConfigManager {
  private config: Record<string, unknown> = {};
  private readonly storageKey = 'concrete_config';
  private readonly events: EventBus;

  constructor(events: EventBus) {
    this.events = events;
  }

  /** Load config from localStorage */
  async load(): Promise<void> {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.config = JSON.parse(stored) as Record<string, unknown>;
    } else {
      this.config = this.getDefaults();
    }
  }

  /** Get a config value by dot-notation key */
  get<T>(key: string, defaultValue?: T): T {
    const parts = key.split('.');
    let current: unknown = this.config;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue as T;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return (current ?? defaultValue) as T;
  }

  /** Set a config value by dot-notation key */
  set(key: string, value: unknown): void {
    const parts = key.split('.');
    let current = this.config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
    this.persist();
    this.events.emit('config.changed', { key, value });
  }

  /** Get all config as a shallow clone */
  getAll(): Record<string, unknown> {
    return { ...this.config };
  }

  /** Reset to defaults */
  reset(): void {
    this.config = this.getDefaults();
    this.persist();
  }

  /** Export config as JSON string */
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /** Import config from JSON string */
  import(json: string): void {
    this.config = JSON.parse(json) as Record<string, unknown>;
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.config));
  }

  private getDefaults(): Record<string, unknown> {
    return {
      org: {
        name: 'My Company',
        currency: 'USD',
        fiscalYearStart: 1,
        dateFormat: 'MM/DD/YYYY',
        mode: 'full',
      },
      locale: 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      theme: 'dark',
      features: {
        intercompanyElimination: true,
        budgetTracking: true,
        alertsEnabled: true,
        fuzzyMatching: true,
        anomalyDetection: false,
      },
      ui: {
        sidebarCollapsed: false,
        defaultPeriod: 'ytd',
        defaultEntity: '__all__',
      },
    };
  }
}
