/**
 * Phase Zed.4 - ModuleManager
 * Manages the lifecycle of pluggable modules: registration, dependency
 * resolution, activation, deactivation, and health checking.
 */

import type { ModuleManifest, ModuleStatus } from '../types/module';
import type { EventBus } from '../events/bus';

/** IDs of core modules that cannot be disabled */
const CORE_MODULE_IDS: ReadonlySet<string> = new Set([
  'concrete.core',
  'concrete.ui',
  'concrete.store',
  'concrete.router',
]);

/** Internal record for a registered module */
interface ModuleRecord {
  manifest: ModuleManifest;
  status: ModuleStatus;
}

/**
 * Manages all registered modules, their dependency graph, and lifecycle
 * transitions (registered -> loading -> active, or -> disabled / error).
 */
export class ModuleManager {
  private modules: Map<string, ModuleRecord>;
  private events: EventBus;
  private store: unknown;
  private schemas: unknown;
  private logger: { info: (ctx: string, msg: string) => void; warn: (ctx: string, msg: string, err?: unknown) => void; error: (ctx: string, msg: string, err?: unknown) => void };

  constructor(
    events: EventBus,
    store: unknown,
    schemas: unknown,
    logger: { info: (ctx: string, msg: string) => void; warn: (ctx: string, msg: string, err?: unknown) => void; error: (ctx: string, msg: string, err?: unknown) => void }
  ) {
    this.modules = new Map();
    this.events = events;
    this.store = store;
    this.schemas = schemas;
    this.logger = logger;
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a module manifest.
   *
   * @throws If the manifest is invalid or a module with the same id already exists.
   */
  register(manifest: ModuleManifest): void {
    // Validate required fields
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw new Error('Module manifest must have a non-empty string "id".');
    }
    if (!manifest.name || typeof manifest.name !== 'string') {
      throw new Error(`Module "${manifest.id}": manifest must have a non-empty "name".`);
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      throw new Error(`Module "${manifest.id}": manifest must have a "version" string.`);
    }

    // Check for namespace collisions
    if (this.modules.has(manifest.id)) {
      throw new Error(
        `Module "${manifest.id}" is already registered. ` +
        `Disable and unregister it first if you need to replace it.`
      );
    }

    // Store with initial status
    this.modules.set(manifest.id, {
      manifest,
      status: 'registered',
    });

    this.logger.info('modules', `Registered module: ${manifest.id}@${manifest.version}`);
    this.events.emit('module.registered', { moduleId: manifest.id, version: manifest.version });
  }

  // ---------------------------------------------------------------------------
  // Enable / Disable
  // ---------------------------------------------------------------------------

  /**
   * Enable a module: validate dependencies, register schemas, call activate(),
   * and transition to 'active'.
   */
  async enable(id: string): Promise<void> {
    const record = this.modules.get(id);
    if (!record) {
      throw new Error(`Cannot enable unknown module: ${id}`);
    }

    if (record.status === 'active') {
      this.logger.warn('modules', `Module "${id}" is already active.`);
      return;
    }

    // Check dependencies
    this.assertDependenciesMet(record.manifest);

    // Transition to loading
    record.status = 'loading';

    try {
      // Register module schemas (if the schema registry supports it)
      const schemasRegistry = this.schemas as {
        register?: (collection: string, module: string) => void;
      } | null;
      if (schemasRegistry && typeof schemasRegistry.register === 'function') {
        for (const collection of record.manifest.collections) {
          schemasRegistry.register(collection, record.manifest.id);
        }
      }

      // Register hooks from the manifest
      for (const hook of record.manifest.hooks) {
        this.events.on(hook.event, hook.handler as (payload: unknown) => void, hook.priority ?? 0);
      }

      // Call the module's activate callback
      if (typeof record.manifest.activate === 'function') {
        await record.manifest.activate();
      }

      // Transition to active
      record.status = 'active';
      this.logger.info('modules', `Activated module: ${id}`);
      this.events.emit('module.activated', { moduleId: id, version: record.manifest.version });
    } catch (err) {
      record.status = 'error';
      this.logger.error('modules', `Failed to activate module: ${id}`, err);
      this.events.emit('module.error', {
        moduleId: id,
        version: record.manifest.version,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      throw err;
    }
  }

  /**
   * Disable a module: check dependants, call deactivate(), transition to 'disabled'.
   *
   * @throws If the module is a core module or if other active modules depend on it.
   */
  async disable(id: string): Promise<void> {
    const record = this.modules.get(id);
    if (!record) {
      throw new Error(`Cannot disable unknown module: ${id}`);
    }

    if (record.status === 'disabled') {
      this.logger.warn('modules', `Module "${id}" is already disabled.`);
      return;
    }

    // Core modules cannot be disabled
    if (this.isCoreModule(id)) {
      throw new Error(`Cannot disable core module: ${id}`);
    }

    // Ensure no other active module depends on this one
    const dependants = this.getActiveDependants(id);
    if (dependants.length > 0) {
      throw new Error(
        `Cannot disable module "${id}" because the following active modules depend on it: ` +
        dependants.join(', ')
      );
    }

    try {
      // Call the module's deactivate callback
      if (typeof record.manifest.deactivate === 'function') {
        await record.manifest.deactivate();
      }

      record.status = 'disabled';
      this.logger.info('modules', `Deactivated module: ${id}`);
      this.events.emit('module.deactivated', { moduleId: id });
    } catch (err) {
      record.status = 'error';
      this.logger.error('modules', `Failed to deactivate module: ${id}`, err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** Check if a module is currently active */
  isEnabled(id: string): boolean {
    const record = this.modules.get(id);
    return record?.status === 'active';
  }

  /** Get the current status of a module */
  getStatus(id: string): ModuleStatus | undefined {
    return this.modules.get(id)?.status;
  }

  /** Get all registered modules with their status */
  getAll(): Array<{ manifest: ModuleManifest; status: ModuleStatus }> {
    return Array.from(this.modules.values()).map((r) => ({
      manifest: r.manifest,
      status: r.status,
    }));
  }

  /** Get manifests of all currently active modules */
  getActive(): ModuleManifest[] {
    const active: ModuleManifest[] = [];
    for (const record of this.modules.values()) {
      if (record.status === 'active') {
        active.push(record.manifest);
      }
    }
    return active;
  }

  /** Get a module manifest by ID, or undefined if not registered */
  get(id: string): ModuleManifest | undefined {
    return this.modules.get(id)?.manifest;
  }

  /** Get the data store reference (for use by modules during activation) */
  getStore(): unknown {
    return this.store;
  }

  // ---------------------------------------------------------------------------
  // Dependency resolution
  // ---------------------------------------------------------------------------

  /**
   * Topological sort of the given module IDs based on their declared
   * dependencies. Uses Kahn's algorithm.
   *
   * @throws On cyclic dependencies.
   */
  resolveDependencyOrder(moduleIds: string[]): string[] {
    // Build adjacency list and in-degree map restricted to the provided set
    const idSet = new Set(moduleIds);
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const id of moduleIds) {
      if (!inDegree.has(id)) inDegree.set(id, 0);
      if (!adjacency.has(id)) adjacency.set(id, []);

      const record = this.modules.get(id);
      if (!record) continue;

      for (const dep of record.manifest.dependencies) {
        if (!idSet.has(dep)) continue; // dependency outside the set is ignored
        if (!adjacency.has(dep)) adjacency.set(dep, []);
        adjacency.get(dep)!.push(id);
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      for (const neighbour of adjacency.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbour) ?? 1) - 1;
        inDegree.set(neighbour, newDeg);
        if (newDeg === 0) {
          queue.push(neighbour);
        }
      }
    }

    if (sorted.length !== moduleIds.length) {
      const remaining = moduleIds.filter((id) => !sorted.includes(id));
      throw new Error(
        `Cyclic dependency detected among modules: ${remaining.join(', ')}`
      );
    }

    return sorted;
  }

  // ---------------------------------------------------------------------------
  // Health checking
  // ---------------------------------------------------------------------------

  /**
   * Run a basic health check on every active module.
   * Returns a map of module id -> health result.
   */
  async healthCheck(): Promise<Map<string, { healthy: boolean; message?: string }>> {
    const results = new Map<string, { healthy: boolean; message?: string }>();

    for (const [id, record] of this.modules) {
      if (record.status !== 'active') continue;

      try {
        // Verify all dependencies are still active
        for (const dep of record.manifest.dependencies) {
          if (!this.isEnabled(dep)) {
            results.set(id, {
              healthy: false,
              message: `Dependency "${dep}" is not active.`,
            });
            continue;
          }
        }

        if (!results.has(id)) {
          results.set(id, { healthy: true });
        }
      } catch (err) {
        results.set(id, {
          healthy: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Check if a module ID belongs to the core set that cannot be disabled */
  private isCoreModule(id: string): boolean {
    return CORE_MODULE_IDS.has(id);
  }

  /**
   * Assert that all dependencies of a manifest are registered and active.
   *
   * @throws If any dependency is missing or not active.
   */
  private assertDependenciesMet(manifest: ModuleManifest): void {
    for (const dep of manifest.dependencies) {
      const depRecord = this.modules.get(dep);
      if (!depRecord) {
        throw new Error(
          `Module "${manifest.id}" depends on "${dep}", which is not registered.`
        );
      }
      if (depRecord.status !== 'active') {
        throw new Error(
          `Module "${manifest.id}" depends on "${dep}", which is not active (status: ${depRecord.status}).`
        );
      }
    }
  }

  /**
   * Find all active modules that list the given module ID in their dependencies.
   */
  private getActiveDependants(id: string): string[] {
    const dependants: string[] = [];
    for (const [moduleId, record] of this.modules) {
      if (moduleId === id) continue;
      if (record.status !== 'active') continue;
      if (record.manifest.dependencies.includes(id)) {
        dependants.push(moduleId);
      }
    }
    return dependants;
  }
}
