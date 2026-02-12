/**
 * Phase Zed.19 - Environment Detection
 * Detects build mode and target for conditional behavior.
 */

export class Environment {
  readonly mode: 'development' | 'production' | 'staging';
  readonly buildTarget: 'static' | 'cloudflare' | 'php';
  readonly isDev: boolean;
  readonly isProd: boolean;
  readonly isStaging: boolean;
  readonly isStatic: boolean;
  readonly hasBackend: boolean;

  constructor() {
    this.mode =
      (import.meta.env?.MODE as 'development' | 'production' | 'staging') ||
      'development';
    this.buildTarget =
      (import.meta.env?.VITE_BUILD_TARGET as 'static' | 'cloudflare' | 'php') ||
      'static';
    this.isDev = this.mode === 'development';
    this.isProd = this.mode === 'production';
    this.isStaging = this.mode === 'staging';
    this.isStatic = this.buildTarget === 'static';
    this.hasBackend =
      this.buildTarget === 'cloudflare' || this.buildTarget === 'php';
  }
}
