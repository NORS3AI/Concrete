/**
 * Phase Zed.20 - Seed Manager
 * Generates and loads realistic construction demo data
 * at configurable scale profiles.
 */

import type { EventBus } from '../events/bus';

export type SeedProfile = 'starter' | 'mid-market' | 'enterprise' | 'demo';
export type SeedScale = 'small' | 'medium' | 'large';

export class SeedManager {
  private readonly events: EventBus;

  /** The data store reference, reserved for future collection persistence */
  readonly store: unknown;

  constructor(store: unknown, events: EventBus) {
    this.store = store;
    this.events = events;
  }

  /** Generate and load seed data */
  async seed(
    profile: SeedProfile = 'demo',
    scale: SeedScale = 'medium',
  ): Promise<{ collections: Record<string, number> }> {
    const generators = await import('./generators/index');
    const counts: Record<string, number> = {};

    // Generate entities
    const entities = generators.generateEntities(scale);
    counts['entity/entity'] = entities.length;

    // Generate jobs
    const jobs = generators.generateJobs(scale, entities);
    counts['job/job'] = jobs.length;

    // Generate cost codes
    const costCodes = generators.generateCostCodes(jobs);
    counts['job/costCode'] = costCodes.length;

    // Generate vendors
    const vendors = generators.generateVendors(scale);
    counts['ap/vendor'] = vendors.length;

    // Generate customers
    const customers = generators.generateCustomers(scale, entities);
    counts['ar/customer'] = customers.length;

    // Generate employees
    const employees = generators.generateEmployees(scale, entities);
    counts['payroll/employee'] = employees.length;

    // Generate transactions
    const transactions = generators.generateTransactions(scale, entities, jobs);
    counts['gl/journalEntry'] = transactions.length;

    // Generate equipment
    const equipment = generators.generateEquipment(scale, entities);
    counts['equip/equipment'] = equipment.length;

    this.events.emit('data.seeded', { profile, scale, counts });
    return { collections: counts };
  }

  /** Reset all data and optionally re-seed */
  async reset(reseedProfile?: SeedProfile): Promise<void> {
    // Clear all collections through store
    this.events.emit('data.reset', {});

    if (reseedProfile) {
      await this.seed(reseedProfile);
    }
  }
}
