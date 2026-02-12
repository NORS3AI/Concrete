/**
 * Concrete — Audit Log
 * Phase Zed.12: History & Undo/Redo
 *
 * Records all data mutations for compliance, debugging, and
 * version history. Persists to localStorage and supports
 * querying, diffing, and export.
 */

import { generateId, now } from '../types/base';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId?: string;
  collection: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete' | 'restore';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  source: 'manual' | 'import' | 'api' | 'system' | 'undo' | 'seed';
  batchId?: string;
}

export interface AuditDiffEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// ---------------------------------------------------------------------------
// AuditLog
// ---------------------------------------------------------------------------

export class AuditLog {
  private entries: AuditEntry[] = [];
  private maxEntries: number;
  private storageKey: string;

  constructor(maxEntries = 10000, storageKey = 'concrete_audit') {
    this.maxEntries = maxEntries;
    this.storageKey = storageKey;
    this.load();
  }

  /** Record an audit entry. */
  record(
    entry: Omit<AuditEntry, 'id' | 'timestamp'>,
  ): AuditEntry {
    const full: AuditEntry = {
      ...entry,
      id: generateId(),
      timestamp: now(),
    };

    this.entries.push(full);

    // Prune if over max
    if (this.entries.length > this.maxEntries) {
      this.prune();
    }

    this.persist();
    return full;
  }

  /** Query audit log with optional filters. */
  query(filters: {
    collection?: string;
    recordId?: string;
    operation?: string;
    userId?: string;
    since?: string;
    batchId?: string;
  }): AuditEntry[] {
    return this.entries.filter((entry) => {
      if (filters.collection && entry.collection !== filters.collection) {
        return false;
      }
      if (filters.recordId && entry.recordId !== filters.recordId) {
        return false;
      }
      if (filters.operation && entry.operation !== filters.operation) {
        return false;
      }
      if (filters.userId && entry.userId !== filters.userId) {
        return false;
      }
      if (filters.since && entry.timestamp < filters.since) {
        return false;
      }
      if (filters.batchId && entry.batchId !== filters.batchId) {
        return false;
      }
      return true;
    });
  }

  /** Get version history for a specific record. */
  getRecordHistory(collection: string, recordId: string): AuditEntry[] {
    return this.entries
      .filter(
        (entry) =>
          entry.collection === collection && entry.recordId === recordId,
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /** Get diff between two versions. */
  diff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): AuditDiffEntry[] {
    const diffs: AuditDiffEntry[] = [];
    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);

    for (const field of allKeys) {
      const oldValue = before[field];
      const newValue = after[field];

      // Deep comparison using JSON serialization for objects/arrays
      const oldStr = JSON.stringify(oldValue);
      const newStr = JSON.stringify(newValue);

      if (oldStr !== newStr) {
        diffs.push({ field, oldValue, newValue });
      }
    }

    return diffs;
  }

  /** Clear old entries beyond max. */
  prune(): void {
    if (this.entries.length > this.maxEntries) {
      // Keep only the most recent entries
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
      this.persist();
    }
  }

  /** Export audit log as an array of entries. */
  export(): AuditEntry[] {
    return [...this.entries];
  }

  /** Clear all entries. */
  clear(): void {
    this.entries = [];
    this.persist();
  }

  /** Get total entry count. */
  count(): number {
    return this.entries.length;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private load(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AuditEntry[];
        if (Array.isArray(parsed)) {
          this.entries = parsed;
        }
      }
    } catch {
      // Corrupted storage — start fresh
      this.entries = [];
    }
  }

  private persist(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch {
      // Storage full — prune aggressively and retry
      this.entries = this.entries.slice(
        Math.floor(this.entries.length / 2),
      );
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
      } catch {
        // Give up on persistence — data remains in memory
      }
    }
  }
}
