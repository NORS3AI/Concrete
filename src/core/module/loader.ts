/**
 * Phase Zed.4 - Module Lazy Loader
 * Registry of lazy module factories that can be populated by each phase's
 * entry file, allowing on-demand loading of module manifests.
 */

import type { ModuleManifest } from '../types/module';

/** Registry of lazy module factories (populated by each phase's entry file) */
const moduleFactories = new Map<string, () => Promise<ModuleManifest>>();

/**
 * Register a factory function that will produce a module manifest on demand.
 *
 * @param id - Unique module identifier (e.g. 'concrete.payroll')
 * @param factory - Async factory that returns the manifest. Typically wraps
 *                  a dynamic `import()` call so the module code is lazy-loaded.
 *
 * @throws If a factory is already registered under the same `id`.
 */
export function registerModuleFactory(
  id: string,
  factory: () => Promise<ModuleManifest>
): void {
  if (moduleFactories.has(id)) {
    throw new Error(
      `Module factory already registered for: ${id}. ` +
      `Call unregisterModuleFactory('${id}') first if you need to replace it.`
    );
  }
  moduleFactories.set(id, factory);
}

/**
 * Lazily load a module manifest by invoking its registered factory.
 *
 * @param id - The module identifier to load.
 * @returns The resolved ModuleManifest.
 * @throws If no factory is registered for the given id.
 */
export async function loadModule(id: string): Promise<ModuleManifest> {
  const factory = moduleFactories.get(id);
  if (!factory) {
    throw new Error(`No module factory registered for: ${id}`);
  }
  return factory();
}

/**
 * Get the list of all module IDs that have registered factories.
 */
export function getRegisteredFactories(): string[] {
  return Array.from(moduleFactories.keys());
}

/**
 * Remove a previously registered factory (useful for testing or hot-reload).
 *
 * @param id - The module identifier to unregister.
 * @returns `true` if the factory existed and was removed; `false` otherwise.
 */
export function unregisterModuleFactory(id: string): boolean {
  return moduleFactories.delete(id);
}

/**
 * Clear all registered factories (primarily for test teardown).
 */
export function clearModuleFactories(): void {
  moduleFactories.clear();
}
