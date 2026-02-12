/**
 * Phase Zed.2 - Schema Migration Engine
 * Applies version-based migrations to collection records.
 */

import type { SchemaDef, SchemaMigration } from '../types/schema';

/**
 * Migration engine for applying schema migrations to stored records.
 * Migrations run sequentially from the source version to the target version.
 */
export class MigrationEngine {
  private schemas: Map<string, SchemaDef>;

  constructor(schemas: Map<string, SchemaDef>) {
    this.schemas = schemas;
  }

  /**
   * Get the current schema version for a collection.
   */
  getCurrentVersion(collection: string): number {
    const schema = this.schemas.get(collection);
    if (!schema) {
      throw new Error(`Schema not found for collection: ${collection}`);
    }
    return schema.version;
  }

  /**
   * Get sorted migrations for a collection between two versions.
   */
  private getMigrations(
    collection: string,
    fromVersion: number,
    toVersion: number
  ): SchemaMigration[] {
    const schema = this.schemas.get(collection);
    if (!schema) {
      throw new Error(`Schema not found for collection: ${collection}`);
    }

    const migrations = schema.migrations ?? [];
    return migrations
      .filter((m) => m.version > fromVersion && m.version <= toVersion)
      .sort((a, b) => a.version - b.version);
  }

  /**
   * Run migrations on a set of records from one version to another.
   * Returns the migrated records.
   */
  run(
    collection: string,
    records: unknown[],
    fromVersion: number,
    toVersion: number
  ): unknown[] {
    const migrations = this.getMigrations(collection, fromVersion, toVersion);

    if (migrations.length === 0) {
      return records;
    }

    let migrated = [...records];
    for (const migration of migrations) {
      migrated = migration.up(migrated);
    }

    return migrated;
  }
}
