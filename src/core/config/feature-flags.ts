/**
 * Phase Zed.19 - Feature Flags
 * Simple feature toggle system backed by ConfigManager.
 */

import type { ConfigManager } from './config';

export class FeatureFlags {
  private readonly config: ConfigManager;

  constructor(config: ConfigManager) {
    this.config = config;
  }

  /** Check if a feature is enabled */
  isEnabled(feature: string): boolean {
    return this.config.get<boolean>(`features.${feature}`, false);
  }

  /** Enable a feature */
  enable(feature: string): void {
    this.config.set(`features.${feature}`, true);
  }

  /** Disable a feature */
  disable(feature: string): void {
    this.config.set(`features.${feature}`, false);
  }

  /** Toggle a feature, returns the new state */
  toggle(feature: string): boolean {
    const current = this.isEnabled(feature);
    if (current) {
      this.disable(feature);
    } else {
      this.enable(feature);
    }
    return !current;
  }

  /** Get all feature flags as a record */
  getAll(): Record<string, boolean> {
    const features = this.config.get<Record<string, boolean>>('features', {});
    return { ...features };
  }
}
