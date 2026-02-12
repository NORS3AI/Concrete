/**
 * Concrete — Locale-Aware Formatter
 * Phase Zed.15: Internationalization & Localization
 *
 * Provides locale-aware formatting for currency, numbers,
 * percentages, dates, relative dates, and day counts using
 * the native Intl APIs.
 */

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

export class Formatter {
  private locale: string;
  private currencyCode: string;

  /** Cached Intl formatters (recreated on locale change) */
  private currencyFmt: Intl.NumberFormat;
  private numberFmt: Intl.NumberFormat;
  private percentFmt: Intl.NumberFormat;
  private dateFmtShort: Intl.DateTimeFormat;
  private dateFmtMedium: Intl.DateTimeFormat;
  private dateFmtLong: Intl.DateTimeFormat;
  private relativeFmt: Intl.RelativeTimeFormat;

  constructor(locale: string = 'en-US', currency: string = 'USD') {
    this.locale = locale;
    this.currencyCode = currency;
    this.currencyFmt = this.createCurrencyFormatter();
    this.numberFmt = this.createNumberFormatter(2);
    this.percentFmt = this.createPercentFormatter(1);
    this.dateFmtShort = this.createDateFormatter('short');
    this.dateFmtMedium = this.createDateFormatter('medium');
    this.dateFmtLong = this.createDateFormatter('long');
    this.relativeFmt = this.createRelativeFormatter();
  }

  /** Format currency amount with abbreviation for large values. */
  currency(value: number): string {
    const abs = Math.abs(value);

    if (abs >= 1_000_000_000) {
      return this.formatAbbreviated(value, 1_000_000_000, 'B');
    }
    if (abs >= 1_000_000) {
      return this.formatAbbreviated(value, 1_000_000, 'M');
    }
    if (abs >= 10_000) {
      return this.formatAbbreviated(value, 1_000, 'K');
    }

    return this.currencyFmt.format(value);
  }

  /** Format a number with specified decimal places. */
  number(value: number, decimals?: number): string {
    if (decimals !== undefined) {
      const fmt = this.createNumberFormatter(decimals);
      return fmt.format(value);
    }
    return this.numberFmt.format(value);
  }

  /** Format a percentage value. */
  percentage(value: number, decimals?: number): string {
    if (decimals !== undefined) {
      const fmt = this.createPercentFormatter(decimals);
      return fmt.format(value / 100);
    }
    return this.percentFmt.format(value / 100);
  }

  /** Format a date. */
  date(
    value: string | Date,
    format: 'short' | 'medium' | 'long' | 'iso' = 'medium',
  ): string {
    if (format === 'iso') {
      const d = value instanceof Date ? value : new Date(value);
      return d.toISOString().split('T')[0];
    }

    const dateObj = value instanceof Date ? value : new Date(value);

    // Guard against invalid dates
    if (isNaN(dateObj.getTime())) {
      return String(value);
    }

    switch (format) {
      case 'short':
        return this.dateFmtShort.format(dateObj);
      case 'long':
        return this.dateFmtLong.format(dateObj);
      case 'medium':
      default:
        return this.dateFmtMedium.format(dateObj);
    }
  }

  /** Format a relative date (e.g., "3 days ago"). */
  relativeDate(value: string | Date): string {
    const dateObj = value instanceof Date ? value : new Date(value);

    if (isNaN(dateObj.getTime())) {
      return String(value);
    }

    const now = Date.now();
    const diffMs = dateObj.getTime() - now;
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
    const diffMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
    const diffYears = Math.round(diffMs / (1000 * 60 * 60 * 24 * 365));

    const absDays = Math.abs(diffDays);

    if (absDays === 0) {
      const absHours = Math.abs(diffHours);
      if (absHours === 0) {
        const absMinutes = Math.abs(diffMinutes);
        if (absMinutes === 0) {
          return this.relativeFmt.format(diffSeconds, 'second');
        }
        return this.relativeFmt.format(diffMinutes, 'minute');
      }
      return this.relativeFmt.format(diffHours, 'hour');
    }

    if (absDays < 7) {
      return this.relativeFmt.format(diffDays, 'day');
    }

    if (absDays < 30) {
      return this.relativeFmt.format(diffWeeks, 'week');
    }

    if (absDays < 365) {
      return this.relativeFmt.format(diffMonths, 'month');
    }

    return this.relativeFmt.format(diffYears, 'year');
  }

  /** Format days (e.g., "45 days"). */
  days(value: number): string {
    const rounded = Math.round(value);
    if (rounded === 1) return '1 day';
    return `${this.numberFmt.format(rounded).replace(/\..*$/, '')} days`;
  }

  /** Update locale and/or currency, recreating all formatters. */
  setLocale(locale: string, currency?: string): void {
    this.locale = locale;
    if (currency) {
      this.currencyCode = currency;
    }

    // Recreate all formatters
    this.currencyFmt = this.createCurrencyFormatter();
    this.numberFmt = this.createNumberFormatter(2);
    this.percentFmt = this.createPercentFormatter(1);
    this.dateFmtShort = this.createDateFormatter('short');
    this.dateFmtMedium = this.createDateFormatter('medium');
    this.dateFmtLong = this.createDateFormatter('long');
    this.relativeFmt = this.createRelativeFormatter();
  }

  /** Get current locale. */
  getLocale(): string {
    return this.locale;
  }

  /** Get current currency code. */
  getCurrency(): string {
    return this.currencyCode;
  }

  // ---------------------------------------------------------------------------
  // Private formatter factories
  // ---------------------------------------------------------------------------

  private createCurrencyFormatter(): Intl.NumberFormat {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private createNumberFormatter(decimals: number): Intl.NumberFormat {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }

  private createPercentFormatter(decimals: number): Intl.NumberFormat {
    return new Intl.NumberFormat(this.locale, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }

  private createDateFormatter(
    style: 'short' | 'medium' | 'long',
  ): Intl.DateTimeFormat {
    const options: Intl.DateTimeFormatOptions =
      style === 'short'
        ? { month: 'numeric', day: 'numeric', year: '2-digit' }
        : style === 'long'
          ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
          : { month: 'short', day: 'numeric', year: 'numeric' };

    return new Intl.DateTimeFormat(this.locale, options);
  }

  private createRelativeFormatter(): Intl.RelativeTimeFormat {
    return new Intl.RelativeTimeFormat(this.locale, {
      numeric: 'auto',
    });
  }

  /** Format an abbreviated currency value (e.g., "$1.5M"). */
  private formatAbbreviated(
    value: number,
    divisor: number,
    suffix: string,
  ): string {
    const divided = value / divisor;
    // Get currency symbol from a small format
    const parts = this.currencyFmt.formatToParts(0);
    const symbolPart = parts.find((p) => p.type === 'currency');
    const symbol = symbolPart?.value ?? '$';

    const isNegative = divided < 0;
    const abs = Math.abs(divided);

    // Format with 1 decimal if not a whole number
    const numStr =
      abs % 1 === 0
        ? abs.toFixed(0)
        : abs.toFixed(1);

    return `${isNegative ? '-' : ''}${symbol}${numStr}${suffix}`;
  }
}
