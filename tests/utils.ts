/**
 * Phase Zed.17 - Test Utilities
 * Shared helpers for all Concrete test suites.
 */

import { EventBus } from '../src/core/events/bus';
import { SchemaRegistry } from '../src/core/schema/registry';

/** Create a fresh EventBus for testing */
export function createTestEventBus(): EventBus {
  return new EventBus();
}

/** Create a test logger (silent) - minimal logger for test isolation */
export function createTestLogger(): { log: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void } {
  return {
    log: (): void => {},
    warn: (): void => {},
    error: (): void => {},
  };
}

/** Create a test schema registry with core schemas registered */
export function createTestSchemaRegistry(): SchemaRegistry {
  const registry = new SchemaRegistry();
  registry.registerCoreSchemas();
  return registry;
}

/** Generate a random ID for test data */
export function testId(): string {
  return `test-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create test entity data */
export function createTestEntity(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: testId(),
    name: `Test Entity ${Math.floor(Math.random() * 1000)}`,
    type: 'subsidiary',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

/** Create test transaction data */
export function createTestTransaction(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: testId(),
    entityId: 'entity-1',
    date: new Date().toISOString(),
    type: 'revenue',
    category: 'Contract Revenue',
    amount: Math.round(Math.random() * 100000),
    description: 'Test transaction',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

/** Wait for async events to process */
export function flushEvents(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
