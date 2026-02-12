/**
 * Concrete — Error Handling Module Exports
 * Phase Zed.16: Error Handling, Logging & Diagnostics
 */

export { ErrorBoundary } from './boundary';

export { Logger } from './logger';
export type { LogLevel, LogEntry } from './logger';

export { Diagnostics } from './diagnostics';
export type { StorageUsage, IntegrityIssue, ModuleHealthEntry } from './diagnostics';
