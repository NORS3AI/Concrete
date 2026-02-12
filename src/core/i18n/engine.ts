/**
 * Concrete — Internationalization Engine
 * Phase Zed.15: Internationalization & Localization
 *
 * Manages locale loading, translation key lookup with
 * parameter interpolation, namespace-scoped translations,
 * and fallback to en-US.
 */

// ---------------------------------------------------------------------------
// I18n Engine
// ---------------------------------------------------------------------------

export class I18n {
  private translations: Record<string, string> = {};
  private fallback: Record<string, string> = {};
  private locale: string = 'en-US';
  private storageKey = 'concrete_locale';

  constructor() {
    this.restoreLocale();
  }

  /** Load a locale file. */
  async load(locale: string): Promise<void> {
    // Load the fallback (en-US) if not already loaded
    if (Object.keys(this.fallback).length === 0) {
      try {
        const fallbackModule = await import('../../locales/en-US.json');
        this.fallback = this.flattenTranslations(
          fallbackModule.default ?? fallbackModule,
        );
      } catch {
        // en-US not found — fallback remains empty
      }
    }

    // Load the requested locale
    if (locale === 'en-US') {
      this.translations = { ...this.fallback };
    } else {
      try {
        const localeModule = await import(`../../locales/${locale}.json`);
        this.translations = this.flattenTranslations(
          localeModule.default ?? localeModule,
        );
      } catch {
        // Locale not found — fall back to en-US
        this.translations = { ...this.fallback };
      }
    }

    this.locale = locale;
    this.persistLocale();
  }

  /** Translate a key, with optional parameter interpolation. */
  t(key: string, params?: Record<string, string | number>): string {
    // Look up in current translations, then fallback, then return key itself
    let value = this.translations[key] ?? this.fallback[key] ?? key;

    // Replace {{param}} placeholders
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value.replace(
          new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'),
          String(paramValue),
        );
      }
    }

    return value;
  }

  /** Get current locale. */
  getLocale(): string {
    return this.locale;
  }

  /** Set locale and reload translations. */
  async setLocale(locale: string): Promise<void> {
    await this.load(locale);
  }

  /** Register module-specific translations. Prefix all keys with namespace. */
  registerTranslations(
    namespace: string,
    translations: Record<string, string>,
  ): void {
    for (const [key, value] of Object.entries(translations)) {
      const namespacedKey = `${namespace}.${key}`;
      this.translations[namespacedKey] = value;

      // Also register in fallback if locale is en-US
      if (this.locale === 'en-US') {
        this.fallback[namespacedKey] = value;
      }
    }
  }

  /** Check if a translation key exists. */
  has(key: string): boolean {
    return key in this.translations || key in this.fallback;
  }

  /** Get all translation keys. */
  getKeys(): string[] {
    const keys = new Set([
      ...Object.keys(this.translations),
      ...Object.keys(this.fallback),
    ]);
    return [...keys].sort();
  }

  /** Get all available translations as a flat object. */
  getTranslations(): Record<string, string> {
    return { ...this.fallback, ...this.translations };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Flatten a possibly nested translation object into dot-notation keys. */
  private flattenTranslations(
    obj: Record<string, unknown>,
    prefix = '',
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        result[fullKey] = value;
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(
          result,
          this.flattenTranslations(value as Record<string, unknown>, fullKey),
        );
      }
    }

    return result;
  }

  /** Persist the current locale preference. */
  private persistLocale(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, this.locale);
    } catch {
      // Ignore storage errors
    }
  }

  /** Restore the locale preference from storage. */
  private restoreLocale(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.locale = stored;
      }
    } catch {
      // Ignore storage errors
    }
  }
}
