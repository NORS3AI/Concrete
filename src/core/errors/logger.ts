/**
 * Concrete — Logger
 * Phase Zed.16: Error Handling, Logging & Diagnostics
 *
 * Structured logging with severity levels, module tagging,
 * ring-buffer storage, filtering, and export. Outputs to
 * console and stores entries in memory for diagnostic display.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  timestamp: number;
  stack?: string;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

export class Logger {
  private entries: LogEntry[] = [];
  private maxEntries: number;
  private minLevel: LogLevel;

  static readonly LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor(minLevel: LogLevel = 'info', maxEntries = 500) {
    this.minLevel = minLevel;
    this.maxEntries = maxEntries;
  }

  debug(module: string, message: string, data?: unknown): void {
    this.log('debug', module, message, data);
  }

  info(module: string, message: string, data?: unknown): void {
    this.log('info', module, message, data);
  }

  warn(module: string, message: string, data?: unknown): void {
    this.log('warn', module, message, data);
  }

  error(module: string, message: string, data?: unknown): void {
    this.log('error', module, message, data);
  }

  fatal(module: string, message: string, data?: unknown): void {
    this.log('fatal', module, message, data);
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    data?: unknown,
  ): void {
    // Check minimum level
    if (Logger.LEVELS[level] < Logger.LEVELS[this.minLevel]) {
      return;
    }

    // Extract stack trace for errors
    let stack: string | undefined;
    if (data instanceof Error) {
      stack = data.stack;
    }

    const entry: LogEntry = {
      level,
      module,
      message,
      data: data instanceof Error ? { name: data.name, message: data.message } : data,
      timestamp: Date.now(),
      stack,
    };

    // Push to ring buffer
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }

    // Console output
    const prefix = `[${level.toUpperCase()}][${module}]`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ?? '');
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
      case 'fatal':
        console.error(`${prefix} FATAL:`, message, data ?? '');
        break;
    }
  }

  /** Get recent log entries with optional filtering. */
  getEntries(filter?: {
    level?: LogLevel;
    module?: string;
    limit?: number;
  }): LogEntry[] {
    let results = [...this.entries];

    if (filter?.level) {
      const minLevelNum = Logger.LEVELS[filter.level];
      results = results.filter(
        (entry) => Logger.LEVELS[entry.level] >= minLevelNum,
      );
    }

    if (filter?.module) {
      const mod = filter.module;
      results = results.filter((entry) => entry.module === mod);
    }

    if (filter?.limit && filter.limit > 0) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  /** Clear all entries. */
  clear(): void {
    this.entries = [];
  }

  /** Export entries as JSON array. */
  export(): LogEntry[] {
    return [...this.entries];
  }

  /** Set minimum log level. */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /** Get current minimum log level. */
  getLevel(): LogLevel {
    return this.minLevel;
  }

  /** Get entry count. */
  count(): number {
    return this.entries.length;
  }
}
