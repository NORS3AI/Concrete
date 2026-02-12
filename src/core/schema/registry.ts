/**
 * Phase Zed.2 - Schema Registry
 * Central registry for all collection schemas.
 * Supports registration, validation, relations, migrations, and extension.
 */

import type { SchemaDef, FieldDef, RelationDef } from '../types/schema';
import { validateRecord } from './validation';
import { MigrationEngine } from './migration';
import { allCollectionSchemas } from './collections/index';

/**
 * SchemaRegistry maintains the master list of all collection schemas
 * and provides query, validation, and extension capabilities.
 */
export class SchemaRegistry {
  private schemas: Map<string, SchemaDef> = new Map();
  private migrationEngine: MigrationEngine;

  constructor() {
    this.migrationEngine = new MigrationEngine(this.schemas);
  }

  /**
   * Register a schema. Throws if the collection name is already taken.
   */
  register(schema: SchemaDef): void {
    if (this.schemas.has(schema.collection)) {
      throw new Error(
        `Schema collision: collection "${schema.collection}" is already registered`
      );
    }
    this.schemas.set(schema.collection, schema);
  }

  /**
   * Get a schema by collection name.
   */
  get(collection: string): SchemaDef | undefined {
    return this.schemas.get(collection);
  }

  /**
   * Get all registered schemas.
   */
  getAll(): SchemaDef[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get all schemas belonging to a specific module.
   */
  getByModule(module: string): SchemaDef[] {
    return this.getAll().filter((s) => s.module === module);
  }

  /**
   * Check if a collection is registered.
   */
  has(collection: string): boolean {
    return this.schemas.has(collection);
  }

  /**
   * Validate a record against its collection schema.
   * Returns an array of error messages (empty if valid).
   */
  validate(collection: string, record: Record<string, unknown>): string[] {
    const schema = this.schemas.get(collection);
    if (!schema) {
      return [`Unknown collection: ${collection}`];
    }
    return validateRecord(record, schema);
  }

  /**
   * Get all relations defined for a collection.
   */
  getRelationsFor(collection: string): RelationDef[] {
    const schema = this.schemas.get(collection);
    if (!schema) {
      return [];
    }
    return schema.relations;
  }

  /**
   * Register all core collection schemas from the collections directory.
   */
  registerCoreSchemas(): void {
    for (const schema of allCollectionSchemas) {
      if (!this.schemas.has(schema.collection)) {
        this.schemas.set(schema.collection, schema);
      }
    }
  }

  /**
   * Run migrations on a set of records for a collection.
   */
  migrate(collection: string, records: unknown[]): unknown[] {
    const schema = this.schemas.get(collection);
    if (!schema) {
      throw new Error(`Schema not found for collection: ${collection}`);
    }
    // Migrate from version 0 (unversioned) to current
    return this.migrationEngine.run(collection, records, 0, schema.version);
  }

  /**
   * Extension: add a field to an existing collection schema.
   */
  addField(collection: string, field: FieldDef): void {
    const schema = this.schemas.get(collection);
    if (!schema) {
      throw new Error(`Cannot add field: collection "${collection}" not found`);
    }
    const exists = schema.fields.some((f) => f.name === field.name);
    if (exists) {
      throw new Error(
        `Field "${field.name}" already exists in collection "${collection}"`
      );
    }
    schema.fields.push(field);
  }

  /**
   * Extension: add a new collection schema (alias for register with
   * a friendlier name for plugin authors).
   */
  addCollection(schema: SchemaDef): void {
    this.register(schema);
  }
}
