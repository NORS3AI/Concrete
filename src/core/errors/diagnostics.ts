/**
 * Concrete — Diagnostics
 * Phase Zed.16: Error Handling, Logging & Diagnostics
 *
 * System information gathering, storage usage analysis,
 * data integrity checks, and module health monitoring.
 */

import type { DataAdapter } from '../store/adapter';
import type { SchemaRegistry } from '../schema/registry';
import type { ModuleManager } from '../module/manager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StorageUsage {
  used: number;
  quota: number;
  collections: Record<string, number>;
}

export interface IntegrityIssue {
  collection: string;
  issue: string;
  count: number;
}

export interface ModuleHealthEntry {
  id: string;
  status: string;
  healthy: boolean;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export class Diagnostics {
  /** Get system information. */
  static getSystemInfo(): Record<string, string> {
    const info: Record<string, string> = {};

    // Browser info
    if (typeof navigator !== 'undefined') {
      info['userAgent'] = navigator.userAgent;
      info['platform'] = navigator.platform;
      info['language'] = navigator.language;
      info['cookiesEnabled'] = String(navigator.cookieEnabled);
      info['onLine'] = String(navigator.onLine);
      info['hardwareConcurrency'] = String(
        navigator.hardwareConcurrency ?? 'unknown',
      );
    }

    // Memory info (Chrome-specific)
    if (typeof performance !== 'undefined') {
      const perfMemory = (performance as unknown as Record<string, unknown>)['memory'] as
        | {
            jsHeapSizeLimit?: number;
            totalJSHeapSize?: number;
            usedJSHeapSize?: number;
          }
        | undefined;

      if (perfMemory) {
        if (perfMemory.jsHeapSizeLimit) {
          info['jsHeapLimit'] = Diagnostics.formatBytes(
            perfMemory.jsHeapSizeLimit,
          );
        }
        if (perfMemory.totalJSHeapSize) {
          info['jsHeapTotal'] = Diagnostics.formatBytes(
            perfMemory.totalJSHeapSize,
          );
        }
        if (perfMemory.usedJSHeapSize) {
          info['jsHeapUsed'] = Diagnostics.formatBytes(
            perfMemory.usedJSHeapSize,
          );
        }
      }
    }

    // Screen info
    if (typeof screen !== 'undefined') {
      info['screenResolution'] = `${screen.width}x${screen.height}`;
      info['colorDepth'] = `${screen.colorDepth}-bit`;
    }

    // Viewport info
    if (typeof window !== 'undefined') {
      info['viewportSize'] = `${window.innerWidth}x${window.innerHeight}`;
      info['devicePixelRatio'] = String(window.devicePixelRatio ?? 1);
    }

    // Date/time
    info['timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    info['timestamp'] = new Date().toISOString();

    return info;
  }

  /** Get storage usage. */
  static async getStorageUsage(): Promise<StorageUsage> {
    const collections: Record<string, number> = {};
    let used = 0;
    let quota = 0;

    // Check navigator.storage API for quota
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.estimate === 'function'
    ) {
      try {
        const estimate = await navigator.storage.estimate();
        used = estimate.usage ?? 0;
        quota = estimate.quota ?? 0;
      } catch {
        // Estimate not available
      }
    }

    // Calculate localStorage usage per key prefix
    if (typeof localStorage !== 'undefined') {
      let localStorageTotal = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const value = localStorage.getItem(key);
        const size = key.length + (value?.length ?? 0);
        localStorageTotal += size * 2; // UTF-16 = 2 bytes per char

        // Group by collection prefix (e.g., "concrete_jobs" -> "jobs")
        if (key.startsWith('concrete_')) {
          const collectionName = key.replace('concrete_', '');
          collections[collectionName] =
            (collections[collectionName] ?? 0) + size * 2;
        }
      }

      // If the storage API didn't give us usage, use localStorage calculation
      if (used === 0) {
        used = localStorageTotal;
      }

      // Typical localStorage quota is ~5MB
      if (quota === 0) {
        quota = 5 * 1024 * 1024;
      }
    }

    return { used, quota, collections };
  }

  /** Run data integrity checks. */
  static async checkDataIntegrity(
    store: DataAdapter,
    schemas: SchemaRegistry,
  ): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];
    const allSchemas = schemas.getAll();

    for (const schema of allSchemas) {
      const collection = schema.collection;
      let records: Record<string, unknown>[];

      try {
        records = await store.getAll(collection);
      } catch {
        issues.push({
          collection,
          issue: 'Failed to load collection data',
          count: 1,
        });
        continue;
      }

      // Check for records missing required fields
      let missingRequired = 0;
      for (const record of records) {
        for (const field of schema.fields) {
          if (
            field.required &&
            (record[field.name] === undefined || record[field.name] === null)
          ) {
            missingRequired++;
          }
        }
      }
      if (missingRequired > 0) {
        issues.push({
          collection,
          issue: 'Records with missing required fields',
          count: missingRequired,
        });
      }

      // Check for orphaned references
      for (const relation of schema.relations) {
        if (relation.type !== 'belongsTo') continue;

        let orphaned = 0;
        const foreignKey = relation.foreignKey;
        const refCollection = relation.collection;

        for (const record of records) {
          const refId = record[foreignKey] as string | undefined;
          if (!refId) continue;

          // Skip soft-deleted records
          if (record['deletedAt'] != null) continue;

          try {
            const referenced = await store.get(refCollection, refId);
            if (!referenced) {
              orphaned++;
            }
          } catch {
            orphaned++;
          }
        }

        if (orphaned > 0) {
          issues.push({
            collection,
            issue: `Orphaned references in ${foreignKey} -> ${refCollection}`,
            count: orphaned,
          });
        }
      }

      // Check for records without IDs
      const noId = records.filter(
        (r) => !r['id'] || typeof r['id'] !== 'string',
      ).length;
      if (noId > 0) {
        issues.push({
          collection,
          issue: 'Records without valid ID',
          count: noId,
        });
      }

      // Check for duplicate IDs
      const ids = records.map((r) => r['id'] as string).filter(Boolean);
      const uniqueIds = new Set(ids);
      if (uniqueIds.size < ids.length) {
        issues.push({
          collection,
          issue: 'Duplicate record IDs',
          count: ids.length - uniqueIds.size,
        });
      }

      // Check for records without timestamps
      const noTimestamp = records.filter(
        (r) => !r['createdAt'] || !r['updatedAt'],
      ).length;
      if (noTimestamp > 0) {
        issues.push({
          collection,
          issue: 'Records missing timestamp fields',
          count: noTimestamp,
        });
      }
    }

    return issues;
  }

  /** Get module health status. */
  static getModuleHealth(modules: ModuleManager): ModuleHealthEntry[] {
    const result: ModuleHealthEntry[] = [];
    const allModules = modules.getAll();

    for (const mod of allModules) {
      const id = mod.manifest.id;
      const status = mod.status ?? 'unknown';
      const healthy = status === 'active';

      result.push({ id, status, healthy });
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Format bytes into human-readable string. */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
}
