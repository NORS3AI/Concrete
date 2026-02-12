/**
 * Phase Zed.2 - Schema Module Index
 * Re-exports SchemaRegistry, validation, migration, and all collections.
 */

export { SchemaRegistry } from './registry';
export { validateField, validateRecord } from './validation';
export { MigrationEngine } from './migration';
export { allCollectionSchemas } from './collections/index';
