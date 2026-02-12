/**
 * Concrete -- Equipment Service
 *
 * Core service layer for the Equipment Management module (Phase 8).
 * Provides equipment master CRUD, rate table management, usage logging
 * and job cost posting, fuel consumption tracking, maintenance scheduling,
 * work order management, depreciation calculation (straight-line, MACRS,
 * declining balance), and reporting (utilization, P&L, owning vs operating
 * costs, FHWA rate comparison).
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type EquipmentCategory = 'owned' | 'leased' | 'rented' | 'idle';
export type EquipmentStatus = 'active' | 'inactive' | 'disposed';
export type DepreciationMethod = 'straight_line' | 'macrs' | 'declining_balance';
export type MeterUnit = 'hours' | 'miles';
export type MaintenanceType = 'preventive' | 'repair' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Equipment {
  [key: string]: unknown;
  equipmentNumber: string;
  description: string;
  year?: number;
  make?: string;
  model?: string;
  serialNumber?: string;
  vin?: string;
  licensePlate?: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  entityId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  salvageValue?: number;
  usefulLifeMonths?: number;
  depreciationMethod?: DepreciationMethod;
  assignedJobId?: string;
  meterReading?: number;
  meterUnit?: MeterUnit;
  locationDescription?: string;
}

export interface RateTable {
  [key: string]: unknown;
  equipmentId: string;
  effectiveDate: string;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  operatorIncluded: boolean;
  fhwaRate?: number;
  notes?: string;
}

export interface EquipUsage {
  [key: string]: unknown;
  equipmentId: string;
  jobId?: string;
  costCodeId?: string;
  date: string;
  hours?: number;
  days?: number;
  rate?: number;
  amount: number;
  operatorId?: string;
  description?: string;
  posted: boolean;
}

export interface Maintenance {
  [key: string]: unknown;
  equipmentId: string;
  type: MaintenanceType;
  description?: string;
  scheduledDate?: string;
  completedDate?: string;
  cost?: number;
  vendorId?: string;
  meterAtService?: number;
  nextServiceMeter?: number;
  nextServiceDate?: string;
  status: MaintenanceStatus;
}

export interface WorkOrder {
  [key: string]: unknown;
  equipmentId: string;
  number: string;
  description: string;
  priority: WorkOrderPriority;
  assignedTo?: string;
  reportedDate?: string;
  completedDate?: string;
  laborHours?: number;
  partsCost?: number;
  totalCost?: number;
  status: WorkOrderStatus;
}

export interface FuelLog {
  [key: string]: unknown;
  equipmentId: string;
  date: string;
  gallons: number;
  costPerGallon?: number;
  totalCost: number;
  meterReading?: number;
  locationDescription?: string;
  vendorName?: string;
}

export interface DepreciationRecord {
  [key: string]: unknown;
  equipmentId: string;
  periodStart: string;
  periodEnd: string;
  method: DepreciationMethod;
  beginningValue: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  endingValue: number;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface UtilizationRow {
  equipmentId: string;
  equipmentNumber: string;
  description: string;
  totalHours: number;
  totalDays: number;
  totalAmount: number;
  availableHours: number;
  utilizationPct: number;
}

export interface UtilizationByJobRow {
  jobId: string;
  equipmentId: string;
  equipmentNumber: string;
  totalHours: number;
  totalDays: number;
  totalAmount: number;
}

export interface EquipmentPnlRow {
  equipmentId: string;
  equipmentNumber: string;
  description: string;
  revenue: number;
  fuelCost: number;
  maintenanceCost: number;
  depreciationCost: number;
  otherCosts: number;
  totalCosts: number;
  netIncome: number;
}

export interface OwningVsOperatingRow {
  equipmentId: string;
  equipmentNumber: string;
  description: string;
  owningCosts: number;
  operatingCosts: number;
  totalCosts: number;
  owningPct: number;
  operatingPct: number;
}

export interface FhwaComparisonRow {
  equipmentId: string;
  equipmentNumber: string;
  description: string;
  internalHourlyRate: number;
  fhwaRate: number;
  variance: number;
  variancePct: number;
}

// ---------------------------------------------------------------------------
// MACRS Recovery Period Tables (simplified 5-year and 7-year property)
// ---------------------------------------------------------------------------

/** MACRS 5-year property percentages by year (half-year convention). */
const MACRS_5_YEAR = [0.20, 0.32, 0.192, 0.1152, 0.1152, 0.0576];

/** MACRS 7-year property percentages by year (half-year convention). */
const MACRS_7_YEAR = [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Calculate months between two ISO date strings. */
function monthsBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

// ---------------------------------------------------------------------------
// EquipService
// ---------------------------------------------------------------------------

export class EquipService {
  constructor(
    private equipment: Collection<Equipment>,
    private rateTables: Collection<RateTable>,
    private usages: Collection<EquipUsage>,
    private maintenances: Collection<Maintenance>,
    private workOrders: Collection<WorkOrder>,
    private fuelLogs: Collection<FuelLog>,
    private depreciations: Collection<DepreciationRecord>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // EQUIPMENT CRUD
  // ========================================================================

  /**
   * Create a new equipment record.
   * Validates equipmentNumber uniqueness. Defaults: status='active',
   * currentValue=purchasePrice, meterReading=0.
   */
  async createEquipment(data: {
    equipmentNumber: string;
    description: string;
    year?: number;
    make?: string;
    model?: string;
    serialNumber?: string;
    vin?: string;
    licensePlate?: string;
    category: EquipmentCategory;
    status?: EquipmentStatus;
    entityId?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    currentValue?: number;
    salvageValue?: number;
    usefulLifeMonths?: number;
    depreciationMethod?: DepreciationMethod;
    assignedJobId?: string;
    meterReading?: number;
    meterUnit?: MeterUnit;
    locationDescription?: string;
  }): Promise<Equipment & CollectionMeta> {
    // Validate equipmentNumber uniqueness
    const existing = await this.getEquipmentByNumber(data.equipmentNumber);
    if (existing) {
      throw new Error(`Equipment number "${data.equipmentNumber}" already exists.`);
    }

    const purchasePrice = data.purchasePrice !== undefined ? round2(data.purchasePrice) : undefined;
    const currentValue = data.currentValue !== undefined
      ? round2(data.currentValue)
      : purchasePrice;
    const salvageValue = data.salvageValue !== undefined ? round2(data.salvageValue) : undefined;

    const record = await this.equipment.insert({
      equipmentNumber: data.equipmentNumber,
      description: data.description,
      year: data.year,
      make: data.make,
      model: data.model,
      serialNumber: data.serialNumber,
      vin: data.vin,
      licensePlate: data.licensePlate,
      category: data.category,
      status: data.status ?? 'active',
      entityId: data.entityId,
      purchaseDate: data.purchaseDate,
      purchasePrice: purchasePrice,
      currentValue: currentValue,
      salvageValue: salvageValue,
      usefulLifeMonths: data.usefulLifeMonths,
      depreciationMethod: data.depreciationMethod,
      assignedJobId: data.assignedJobId,
      meterReading: data.meterReading ?? 0,
      meterUnit: data.meterUnit,
      locationDescription: data.locationDescription,
    } as Equipment);

    this.events.emit('equip.created', { equipment: record });
    return record;
  }

  /**
   * Update an existing equipment record.
   * If equipmentNumber is changing, validates uniqueness.
   */
  async updateEquipment(
    id: string,
    changes: Partial<Equipment>,
  ): Promise<Equipment & CollectionMeta> {
    const existing = await this.equipment.get(id);
    if (!existing) {
      throw new Error(`Equipment not found: ${id}`);
    }

    // If equipmentNumber is changing, validate uniqueness
    if (changes.equipmentNumber && changes.equipmentNumber !== existing.equipmentNumber) {
      const duplicate = await this.getEquipmentByNumber(changes.equipmentNumber);
      if (duplicate) {
        throw new Error(`Equipment number "${changes.equipmentNumber}" already exists.`);
      }
    }

    // Round currency fields if present
    if (changes.purchasePrice !== undefined) {
      changes.purchasePrice = round2(changes.purchasePrice);
    }
    if (changes.currentValue !== undefined) {
      changes.currentValue = round2(changes.currentValue);
    }
    if (changes.salvageValue !== undefined) {
      changes.salvageValue = round2(changes.salvageValue);
    }

    const updated = await this.equipment.update(id, changes as Partial<Equipment>);
    this.events.emit('equip.updated', { equipment: updated });
    return updated;
  }

  /**
   * Soft-delete an equipment record.
   * Refuses deletion if equipment has unposted usage records.
   */
  async deleteEquipment(id: string): Promise<void> {
    const existing = await this.equipment.get(id);
    if (!existing) {
      throw new Error(`Equipment not found: ${id}`);
    }

    // Check for unposted usage records
    const unpostedCount = await this.usages
      .query()
      .where('equipmentId', '=', id)
      .where('posted', '=', false)
      .count();

    if (unpostedCount > 0) {
      throw new Error(
        `Cannot delete equipment: it has ${unpostedCount} unposted usage record(s). Post or remove them first.`,
      );
    }

    await this.equipment.remove(id);
    this.events.emit('equip.deleted', { equipmentId: id });
  }

  /**
   * Get a single equipment record by ID.
   */
  async getEquipment(id: string): Promise<(Equipment & CollectionMeta) | null> {
    return this.equipment.get(id);
  }

  /**
   * Lookup equipment by number.
   */
  async getEquipmentByNumber(equipmentNumber: string): Promise<(Equipment & CollectionMeta) | null> {
    const result = await this.equipment
      .query()
      .where('equipmentNumber', '=', equipmentNumber)
      .limit(1)
      .first();
    return result;
  }

  /**
   * Get equipment with optional filters, ordered by equipmentNumber ascending.
   */
  async getEquipmentList(filters?: {
    category?: EquipmentCategory;
    status?: EquipmentStatus;
    entityId?: string;
    assignedJobId?: string;
  }): Promise<(Equipment & CollectionMeta)[]> {
    const q = this.equipment.query();

    if (filters?.category) {
      q.where('category', '=', filters.category);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }
    if (filters?.assignedJobId) {
      q.where('assignedJobId', '=', filters.assignedJobId);
    }

    q.orderBy('equipmentNumber', 'asc');
    return q.execute();
  }

  // ========================================================================
  // RATE TABLE MANAGEMENT
  // ========================================================================

  /**
   * Create a rate table entry for an equipment item.
   * Validates equipment exists.
   */
  async createRateTable(data: {
    equipmentId: string;
    effectiveDate: string;
    hourlyRate?: number;
    dailyRate?: number;
    weeklyRate?: number;
    monthlyRate?: number;
    operatorIncluded?: boolean;
    fhwaRate?: number;
    notes?: string;
  }): Promise<RateTable & CollectionMeta> {
    // Validate equipment exists
    const equip = await this.equipment.get(data.equipmentId);
    if (!equip) {
      throw new Error(`Equipment not found: ${data.equipmentId}`);
    }

    const record = await this.rateTables.insert({
      equipmentId: data.equipmentId,
      effectiveDate: data.effectiveDate,
      hourlyRate: data.hourlyRate !== undefined ? round2(data.hourlyRate) : undefined,
      dailyRate: data.dailyRate !== undefined ? round2(data.dailyRate) : undefined,
      weeklyRate: data.weeklyRate !== undefined ? round2(data.weeklyRate) : undefined,
      monthlyRate: data.monthlyRate !== undefined ? round2(data.monthlyRate) : undefined,
      operatorIncluded: data.operatorIncluded ?? false,
      fhwaRate: data.fhwaRate !== undefined ? round2(data.fhwaRate) : undefined,
      notes: data.notes,
    } as RateTable);

    return record;
  }

  /**
   * Update an existing rate table entry.
   */
  async updateRateTable(
    id: string,
    changes: Partial<RateTable>,
  ): Promise<RateTable & CollectionMeta> {
    const existing = await this.rateTables.get(id);
    if (!existing) {
      throw new Error(`Rate table entry not found: ${id}`);
    }

    // Round currency fields if present
    if (changes.hourlyRate !== undefined) changes.hourlyRate = round2(changes.hourlyRate);
    if (changes.dailyRate !== undefined) changes.dailyRate = round2(changes.dailyRate);
    if (changes.weeklyRate !== undefined) changes.weeklyRate = round2(changes.weeklyRate);
    if (changes.monthlyRate !== undefined) changes.monthlyRate = round2(changes.monthlyRate);
    if (changes.fhwaRate !== undefined) changes.fhwaRate = round2(changes.fhwaRate);

    return this.rateTables.update(id, changes as Partial<RateTable>);
  }

  /**
   * Get the effective rate table for a piece of equipment as of a given date.
   * Returns the rate table with the latest effectiveDate <= asOfDate.
   */
  async getEffectiveRate(
    equipmentId: string,
    asOfDate: string,
  ): Promise<(RateTable & CollectionMeta) | null> {
    const rates = await this.rateTables
      .query()
      .where('equipmentId', '=', equipmentId)
      .where('effectiveDate', '<=', asOfDate)
      .orderBy('effectiveDate', 'desc')
      .limit(1)
      .first();
    return rates;
  }

  /**
   * Get all rate table entries for a piece of equipment, ordered by effectiveDate desc.
   */
  async getRateTables(equipmentId: string): Promise<(RateTable & CollectionMeta)[]> {
    return this.rateTables
      .query()
      .where('equipmentId', '=', equipmentId)
      .orderBy('effectiveDate', 'desc')
      .execute();
  }

  // ========================================================================
  // USAGE LOGGING & JOB COST POSTING
  // ========================================================================

  /**
   * Log equipment usage.
   * Validates equipment exists. Calculates amount from rate * hours/days if
   * not explicitly provided. Defaults: posted=false.
   */
  async logUsage(data: {
    equipmentId: string;
    jobId?: string;
    costCodeId?: string;
    date: string;
    hours?: number;
    days?: number;
    rate?: number;
    amount?: number;
    operatorId?: string;
    description?: string;
  }): Promise<EquipUsage & CollectionMeta> {
    // Validate equipment exists
    const equip = await this.equipment.get(data.equipmentId);
    if (!equip) {
      throw new Error(`Equipment not found: ${data.equipmentId}`);
    }

    // Calculate amount if not explicitly provided
    let amount = data.amount;
    let rate = data.rate;

    if (amount === undefined) {
      // Try to get effective rate
      if (rate === undefined) {
        const effectiveRate = await this.getEffectiveRate(data.equipmentId, data.date);
        if (effectiveRate) {
          if (data.hours && effectiveRate.hourlyRate) {
            rate = effectiveRate.hourlyRate;
          } else if (data.days && effectiveRate.dailyRate) {
            rate = effectiveRate.dailyRate;
          }
        }
      }

      if (rate !== undefined) {
        if (data.hours) {
          amount = round2(rate * data.hours);
        } else if (data.days) {
          amount = round2(rate * data.days);
        } else {
          amount = 0;
        }
      } else {
        amount = 0;
      }
    } else {
      amount = round2(amount);
    }

    const record = await this.usages.insert({
      equipmentId: data.equipmentId,
      jobId: data.jobId,
      costCodeId: data.costCodeId,
      date: data.date,
      hours: data.hours,
      days: data.days,
      rate: rate !== undefined ? round2(rate) : undefined,
      amount,
      operatorId: data.operatorId,
      description: data.description,
      posted: false,
    } as EquipUsage);

    return record;
  }

  /**
   * Post usage records to jobs (mark as posted).
   * Only posts records that are currently unposted.
   * Returns the list of posted records.
   */
  async postUsage(usageIds: string[]): Promise<(EquipUsage & CollectionMeta)[]> {
    const posted: (EquipUsage & CollectionMeta)[] = [];

    for (const id of usageIds) {
      const usage = await this.usages.get(id);
      if (!usage) {
        throw new Error(`Usage record not found: ${id}`);
      }
      if (usage.posted) {
        continue; // Already posted, skip
      }

      const updated = await this.usages.update(id, {
        posted: true,
      } as Partial<EquipUsage>);

      posted.push(updated);
    }

    if (posted.length > 0) {
      this.events.emit('equip.usage.posted', { records: posted, count: posted.length });
    }

    return posted;
  }

  /**
   * Get usage records with optional filters, ordered by date descending.
   */
  async getUsageRecords(filters?: {
    equipmentId?: string;
    jobId?: string;
    posted?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<(EquipUsage & CollectionMeta)[]> {
    const q = this.usages.query();

    if (filters?.equipmentId) {
      q.where('equipmentId', '=', filters.equipmentId);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.posted !== undefined) {
      q.where('posted', '=', filters.posted);
    }
    if (filters?.dateFrom) {
      q.where('date', '>=', filters.dateFrom);
    }
    if (filters?.dateTo) {
      q.where('date', '<=', filters.dateTo);
    }

    q.orderBy('date', 'desc');
    return q.execute();
  }

  // ========================================================================
  // FUEL LOG TRACKING
  // ========================================================================

  /**
   * Log a fuel entry.
   * Validates equipment exists. Calculates totalCost from gallons * costPerGallon
   * if not explicitly provided. Updates meter reading on equipment if provided.
   */
  async logFuel(data: {
    equipmentId: string;
    date: string;
    gallons: number;
    costPerGallon?: number;
    totalCost?: number;
    meterReading?: number;
    locationDescription?: string;
    vendorName?: string;
  }): Promise<FuelLog & CollectionMeta> {
    // Validate equipment exists
    const equip = await this.equipment.get(data.equipmentId);
    if (!equip) {
      throw new Error(`Equipment not found: ${data.equipmentId}`);
    }

    let totalCost = data.totalCost;
    if (totalCost === undefined && data.costPerGallon !== undefined) {
      totalCost = round2(data.gallons * data.costPerGallon);
    }
    totalCost = totalCost !== undefined ? round2(totalCost) : 0;

    const record = await this.fuelLogs.insert({
      equipmentId: data.equipmentId,
      date: data.date,
      gallons: data.gallons,
      costPerGallon: data.costPerGallon !== undefined ? round2(data.costPerGallon) : undefined,
      totalCost,
      meterReading: data.meterReading,
      locationDescription: data.locationDescription,
      vendorName: data.vendorName,
    } as FuelLog);

    // Update meter reading on equipment if provided
    if (data.meterReading !== undefined) {
      await this.equipment.update(equip.id, {
        meterReading: data.meterReading,
      } as Partial<Equipment>);
    }

    this.events.emit('equip.fuel.logged', { fuelLog: record });
    return record;
  }

  /**
   * Get fuel logs with optional filters, ordered by date descending.
   */
  async getFuelLogs(filters?: {
    equipmentId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<(FuelLog & CollectionMeta)[]> {
    const q = this.fuelLogs.query();

    if (filters?.equipmentId) {
      q.where('equipmentId', '=', filters.equipmentId);
    }
    if (filters?.dateFrom) {
      q.where('date', '>=', filters.dateFrom);
    }
    if (filters?.dateTo) {
      q.where('date', '<=', filters.dateTo);
    }

    q.orderBy('date', 'desc');
    return q.execute();
  }

  // ========================================================================
  // MAINTENANCE SCHEDULING
  // ========================================================================

  /**
   * Create a maintenance record.
   * Validates equipment exists. Defaults: status='scheduled'.
   */
  async createMaintenance(data: {
    equipmentId: string;
    type: MaintenanceType;
    description?: string;
    scheduledDate?: string;
    completedDate?: string;
    cost?: number;
    vendorId?: string;
    meterAtService?: number;
    nextServiceMeter?: number;
    nextServiceDate?: string;
    status?: MaintenanceStatus;
  }): Promise<Maintenance & CollectionMeta> {
    // Validate equipment exists
    const equip = await this.equipment.get(data.equipmentId);
    if (!equip) {
      throw new Error(`Equipment not found: ${data.equipmentId}`);
    }

    const record = await this.maintenances.insert({
      equipmentId: data.equipmentId,
      type: data.type,
      description: data.description,
      scheduledDate: data.scheduledDate,
      completedDate: data.completedDate,
      cost: data.cost !== undefined ? round2(data.cost) : undefined,
      vendorId: data.vendorId,
      meterAtService: data.meterAtService,
      nextServiceMeter: data.nextServiceMeter,
      nextServiceDate: data.nextServiceDate,
      status: data.status ?? 'scheduled',
    } as Maintenance);

    return record;
  }

  /**
   * Complete a maintenance record.
   * Sets status='completed', completedDate, and optionally updates
   * the equipment meter reading.
   */
  async completeMaintenance(
    id: string,
    completedDate: string,
    cost?: number,
    meterAtService?: number,
  ): Promise<Maintenance & CollectionMeta> {
    const existing = await this.maintenances.get(id);
    if (!existing) {
      throw new Error(`Maintenance record not found: ${id}`);
    }

    const changes: Partial<Maintenance> = {
      status: 'completed',
      completedDate,
    };

    if (cost !== undefined) {
      changes.cost = round2(cost);
    }
    if (meterAtService !== undefined) {
      changes.meterAtService = meterAtService;

      // Update equipment meter reading
      await this.equipment.update(existing.equipmentId, {
        meterReading: meterAtService,
      } as Partial<Equipment>);
    }

    const updated = await this.maintenances.update(id, changes as Partial<Maintenance>);
    this.events.emit('equip.maintenance.completed', { maintenance: updated });
    return updated;
  }

  /**
   * Update a maintenance record.
   */
  async updateMaintenance(
    id: string,
    changes: Partial<Maintenance>,
  ): Promise<Maintenance & CollectionMeta> {
    const existing = await this.maintenances.get(id);
    if (!existing) {
      throw new Error(`Maintenance record not found: ${id}`);
    }

    if (changes.cost !== undefined) {
      changes.cost = round2(changes.cost);
    }

    return this.maintenances.update(id, changes as Partial<Maintenance>);
  }

  /**
   * Get maintenance records with optional filters, ordered by scheduledDate descending.
   */
  async getMaintenanceRecords(filters?: {
    equipmentId?: string;
    status?: MaintenanceStatus;
    type?: MaintenanceType;
  }): Promise<(Maintenance & CollectionMeta)[]> {
    const q = this.maintenances.query();

    if (filters?.equipmentId) {
      q.where('equipmentId', '=', filters.equipmentId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.type) {
      q.where('type', '=', filters.type);
    }

    q.orderBy('scheduledDate', 'desc');
    return q.execute();
  }

  /**
   * Get overdue maintenance records (scheduled before today, not completed).
   */
  async getOverdueMaintenance(): Promise<(Maintenance & CollectionMeta)[]> {
    const todayStr = new Date().toISOString().split('T')[0];

    const records = await this.maintenances
      .query()
      .where('status', '=', 'scheduled')
      .execute();

    return records.filter((r) => {
      if (!r.scheduledDate) return false;
      return r.scheduledDate < todayStr;
    });
  }

  // ========================================================================
  // WORK ORDER MANAGEMENT
  // ========================================================================

  /**
   * Create a work order.
   * Validates equipment exists. Defaults: status='open', reportedDate=now.
   */
  async createWorkOrder(data: {
    equipmentId: string;
    number: string;
    description: string;
    priority: WorkOrderPriority;
    assignedTo?: string;
    reportedDate?: string;
    status?: WorkOrderStatus;
  }): Promise<WorkOrder & CollectionMeta> {
    // Validate equipment exists
    const equip = await this.equipment.get(data.equipmentId);
    if (!equip) {
      throw new Error(`Equipment not found: ${data.equipmentId}`);
    }

    // Validate work order number uniqueness
    const existingWO = await this.workOrders
      .query()
      .where('number', '=', data.number)
      .limit(1)
      .first();

    if (existingWO) {
      throw new Error(`Work order number "${data.number}" already exists.`);
    }

    const record = await this.workOrders.insert({
      equipmentId: data.equipmentId,
      number: data.number,
      description: data.description,
      priority: data.priority,
      assignedTo: data.assignedTo,
      reportedDate: data.reportedDate ?? now().split('T')[0],
      status: data.status ?? 'open',
    } as WorkOrder);

    return record;
  }

  /**
   * Complete a work order.
   * Sets status='completed', completedDate, laborHours, partsCost, totalCost.
   */
  async completeWorkOrder(
    id: string,
    completedDate: string,
    laborHours?: number,
    partsCost?: number,
    totalCost?: number,
  ): Promise<WorkOrder & CollectionMeta> {
    const existing = await this.workOrders.get(id);
    if (!existing) {
      throw new Error(`Work order not found: ${id}`);
    }

    const changes: Partial<WorkOrder> = {
      status: 'completed',
      completedDate,
    };

    if (laborHours !== undefined) {
      changes.laborHours = laborHours;
    }
    if (partsCost !== undefined) {
      changes.partsCost = round2(partsCost);
    }
    if (totalCost !== undefined) {
      changes.totalCost = round2(totalCost);
    }

    const updated = await this.workOrders.update(id, changes as Partial<WorkOrder>);
    return updated;
  }

  /**
   * Update a work order.
   */
  async updateWorkOrder(
    id: string,
    changes: Partial<WorkOrder>,
  ): Promise<WorkOrder & CollectionMeta> {
    const existing = await this.workOrders.get(id);
    if (!existing) {
      throw new Error(`Work order not found: ${id}`);
    }

    if (changes.partsCost !== undefined) changes.partsCost = round2(changes.partsCost);
    if (changes.totalCost !== undefined) changes.totalCost = round2(changes.totalCost);

    return this.workOrders.update(id, changes as Partial<WorkOrder>);
  }

  /**
   * Get work orders with optional filters, ordered by reportedDate descending.
   */
  async getWorkOrders(filters?: {
    equipmentId?: string;
    status?: WorkOrderStatus;
    priority?: WorkOrderPriority;
  }): Promise<(WorkOrder & CollectionMeta)[]> {
    const q = this.workOrders.query();

    if (filters?.equipmentId) {
      q.where('equipmentId', '=', filters.equipmentId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.priority) {
      q.where('priority', '=', filters.priority);
    }

    q.orderBy('reportedDate', 'desc');
    return q.execute();
  }

  // ========================================================================
  // DEPRECIATION CALCULATION
  // ========================================================================

  /**
   * Calculate and record depreciation for a given equipment item over a period.
   *
   * Supports three methods:
   *   - straight_line: (purchasePrice - salvageValue) / usefulLifeMonths per month
   *   - macrs: 5-year or 7-year MACRS schedule based on usefulLifeMonths
   *   - declining_balance: 2x declining balance (200% DB) with salvage floor
   *
   * periodStart/periodEnd define the period. For monthly depreciation, each
   * call should cover one month.
   */
  async calculateDepreciation(
    equipmentId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<DepreciationRecord & CollectionMeta> {
    const equip = await this.equipment.get(equipmentId);
    if (!equip) {
      throw new Error(`Equipment not found: ${equipmentId}`);
    }

    if (!equip.purchasePrice || equip.purchasePrice <= 0) {
      throw new Error(`Equipment "${equip.equipmentNumber}" has no purchase price set.`);
    }
    if (!equip.depreciationMethod) {
      throw new Error(`Equipment "${equip.equipmentNumber}" has no depreciation method set.`);
    }

    const purchasePrice = equip.purchasePrice;
    const salvageValue = equip.salvageValue ?? 0;
    const usefulLifeMonths = equip.usefulLifeMonths ?? 60;
    const method = equip.depreciationMethod;

    // Get accumulated depreciation from existing records
    const existingRecords = await this.depreciations
      .query()
      .where('equipmentId', '=', equipmentId)
      .orderBy('periodEnd', 'desc')
      .execute();

    let accumulatedDepreciation = 0;
    let beginningValue = purchasePrice;

    if (existingRecords.length > 0) {
      const lastRecord = existingRecords[0];
      accumulatedDepreciation = lastRecord.accumulatedDepreciation;
      beginningValue = lastRecord.endingValue;
    }

    // Don't depreciate below salvage value
    if (beginningValue <= salvageValue) {
      const record = await this.depreciations.insert({
        equipmentId,
        periodStart,
        periodEnd,
        method,
        beginningValue: round2(beginningValue),
        depreciationAmount: 0,
        accumulatedDepreciation: round2(accumulatedDepreciation),
        endingValue: round2(beginningValue),
      } as DepreciationRecord);
      return record;
    }

    let depreciationAmount = 0;

    switch (method) {
      case 'straight_line': {
        // Monthly straight-line = (cost - salvage) / usefulLifeMonths
        const monthlyDepr = round2((purchasePrice - salvageValue) / usefulLifeMonths);
        const periodMonths = Math.max(1, monthsBetween(periodStart, periodEnd));
        depreciationAmount = round2(monthlyDepr * periodMonths);
        break;
      }

      case 'macrs': {
        // Determine year index based on months since purchase
        const purchaseDate = equip.purchaseDate ?? periodStart;
        const totalMonthsElapsed = monthsBetween(purchaseDate, periodEnd);
        const yearIndex = Math.floor(totalMonthsElapsed / 12);
        const schedule = usefulLifeMonths <= 72 ? MACRS_5_YEAR : MACRS_7_YEAR;

        if (yearIndex < schedule.length) {
          const annualAmount = round2(purchasePrice * schedule[yearIndex]);
          const periodMonths = Math.max(1, monthsBetween(periodStart, periodEnd));
          depreciationAmount = round2((annualAmount / 12) * periodMonths);
        } else {
          depreciationAmount = 0;
        }
        break;
      }

      case 'declining_balance': {
        // Double declining balance (200% DB)
        const annualRate = 2 / (usefulLifeMonths / 12);
        const periodMonths = Math.max(1, monthsBetween(periodStart, periodEnd));
        const periodRate = annualRate * (periodMonths / 12);
        depreciationAmount = round2(beginningValue * periodRate);
        break;
      }

      default:
        throw new Error(`Unsupported depreciation method: ${method}`);
    }

    // Don't depreciate below salvage value
    const maxDepreciation = round2(beginningValue - salvageValue);
    if (depreciationAmount > maxDepreciation) {
      depreciationAmount = Math.max(0, maxDepreciation);
    }

    const newAccumulated = round2(accumulatedDepreciation + depreciationAmount);
    const endingValue = round2(beginningValue - depreciationAmount);

    const record = await this.depreciations.insert({
      equipmentId,
      periodStart,
      periodEnd,
      method,
      beginningValue: round2(beginningValue),
      depreciationAmount: round2(depreciationAmount),
      accumulatedDepreciation: newAccumulated,
      endingValue,
    } as DepreciationRecord);

    // Update equipment currentValue
    await this.equipment.update(equipmentId, {
      currentValue: endingValue,
    } as Partial<Equipment>);

    return record;
  }

  /**
   * Get depreciation records for a piece of equipment, ordered by periodStart ascending.
   */
  async getDepreciationRecords(
    equipmentId: string,
  ): Promise<(DepreciationRecord & CollectionMeta)[]> {
    return this.depreciations
      .query()
      .where('equipmentId', '=', equipmentId)
      .orderBy('periodStart', 'asc')
      .execute();
  }

  /**
   * Get all depreciation records across all equipment, optionally filtered by date range.
   */
  async getAllDepreciationRecords(filters?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<(DepreciationRecord & CollectionMeta)[]> {
    const q = this.depreciations.query();

    if (filters?.dateFrom) {
      q.where('periodStart', '>=', filters.dateFrom);
    }
    if (filters?.dateTo) {
      q.where('periodEnd', '<=', filters.dateTo);
    }

    q.orderBy('periodStart', 'asc');
    return q.execute();
  }

  // ========================================================================
  // REPORTS
  // ========================================================================

  /**
   * Equipment utilization analysis by equipment.
   *
   * For each piece of active equipment, computes total hours, total days,
   * total amount from usage records within the given date range. Calculates
   * utilization percentage based on available hours in the period (assuming
   * 8 working hours/day, 5 days/week).
   */
  async getUtilizationByEquipment(
    dateFrom: string,
    dateTo: string,
  ): Promise<UtilizationRow[]> {
    // Get all active equipment
    const allEquip = await this.equipment
      .query()
      .where('status', '=', 'active')
      .orderBy('equipmentNumber', 'asc')
      .execute();

    // Get all usage records in range
    const allUsage = await this.usages
      .query()
      .where('date', '>=', dateFrom)
      .where('date', '<=', dateTo)
      .execute();

    // Calculate available hours in period (working days * 8 hours)
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const totalDaysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    // Approximate working days (5/7)
    const workingDays = Math.round(totalDaysInPeriod * (5 / 7));
    const availableHours = workingDays * 8;

    // Build usage map by equipmentId
    const usageMap = new Map<string, { totalHours: number; totalDays: number; totalAmount: number }>();
    for (const usage of allUsage) {
      const existing = usageMap.get(usage.equipmentId) ?? { totalHours: 0, totalDays: 0, totalAmount: 0 };
      existing.totalHours += usage.hours ?? 0;
      existing.totalDays += usage.days ?? 0;
      existing.totalAmount += usage.amount ?? 0;
      usageMap.set(usage.equipmentId, existing);
    }

    const rows: UtilizationRow[] = [];
    for (const equip of allEquip) {
      const usage = usageMap.get(equip.id) ?? { totalHours: 0, totalDays: 0, totalAmount: 0 };
      const utilizationPct = availableHours > 0
        ? round2((usage.totalHours / availableHours) * 100)
        : 0;

      rows.push({
        equipmentId: equip.id,
        equipmentNumber: equip.equipmentNumber,
        description: equip.description,
        totalHours: round2(usage.totalHours),
        totalDays: round2(usage.totalDays),
        totalAmount: round2(usage.totalAmount),
        availableHours,
        utilizationPct,
      });
    }

    return rows;
  }

  /**
   * Equipment utilization grouped by job.
   * For each job with equipment usage in the date range, lists equipment usage.
   */
  async getUtilizationByJob(
    dateFrom: string,
    dateTo: string,
  ): Promise<UtilizationByJobRow[]> {
    const allUsage = await this.usages
      .query()
      .where('date', '>=', dateFrom)
      .where('date', '<=', dateTo)
      .execute();

    // Group by jobId + equipmentId
    const groupMap = new Map<string, UtilizationByJobRow>();

    for (const usage of allUsage) {
      if (!usage.jobId) continue;

      const key = `${usage.jobId}|${usage.equipmentId}`;
      const existing = groupMap.get(key);

      if (existing) {
        existing.totalHours += usage.hours ?? 0;
        existing.totalDays += usage.days ?? 0;
        existing.totalAmount += usage.amount ?? 0;
      } else {
        // Get equipment number
        const equip = await this.equipment.get(usage.equipmentId);
        groupMap.set(key, {
          jobId: usage.jobId,
          equipmentId: usage.equipmentId,
          equipmentNumber: equip?.equipmentNumber ?? usage.equipmentId,
          totalHours: usage.hours ?? 0,
          totalDays: usage.days ?? 0,
          totalAmount: usage.amount ?? 0,
        });
      }
    }

    const rows = Array.from(groupMap.values());
    // Round values
    for (const row of rows) {
      row.totalHours = round2(row.totalHours);
      row.totalDays = round2(row.totalDays);
      row.totalAmount = round2(row.totalAmount);
    }

    return rows;
  }

  /**
   * Equipment P&L by unit.
   *
   * For each piece of equipment:
   *   - Revenue = sum of usage amounts (posted)
   *   - Fuel cost = sum of fuel log totalCost
   *   - Maintenance cost = sum of completed maintenance costs
   *   - Depreciation cost = sum of depreciation amounts
   *   - Other costs = sum of completed work order totalCosts
   *   - Total costs = fuel + maintenance + depreciation + other
   *   - Net income = revenue - total costs
   */
  async getEquipmentPnl(
    dateFrom: string,
    dateTo: string,
  ): Promise<EquipmentPnlRow[]> {
    const allEquip = await this.equipment
      .query()
      .orderBy('equipmentNumber', 'asc')
      .execute();

    const allUsage = await this.usages
      .query()
      .where('date', '>=', dateFrom)
      .where('date', '<=', dateTo)
      .where('posted', '=', true)
      .execute();

    const allFuel = await this.fuelLogs
      .query()
      .where('date', '>=', dateFrom)
      .where('date', '<=', dateTo)
      .execute();

    const allMaint = await this.maintenances
      .query()
      .where('status', '=', 'completed')
      .execute();

    const allDepr = await this.depreciations
      .query()
      .where('periodStart', '>=', dateFrom)
      .where('periodEnd', '<=', dateTo)
      .execute();

    const allWorkOrders = await this.workOrders
      .query()
      .where('status', '=', 'completed')
      .execute();

    // Build lookup maps
    const revenueMap = new Map<string, number>();
    for (const u of allUsage) {
      revenueMap.set(u.equipmentId, (revenueMap.get(u.equipmentId) ?? 0) + (u.amount ?? 0));
    }

    const fuelMap = new Map<string, number>();
    for (const f of allFuel) {
      fuelMap.set(f.equipmentId, (fuelMap.get(f.equipmentId) ?? 0) + (f.totalCost ?? 0));
    }

    const maintMap = new Map<string, number>();
    for (const m of allMaint) {
      if (m.completedDate && m.completedDate >= dateFrom && m.completedDate <= dateTo) {
        maintMap.set(m.equipmentId, (maintMap.get(m.equipmentId) ?? 0) + (m.cost ?? 0));
      }
    }

    const deprMap = new Map<string, number>();
    for (const d of allDepr) {
      deprMap.set(d.equipmentId, (deprMap.get(d.equipmentId) ?? 0) + d.depreciationAmount);
    }

    const woMap = new Map<string, number>();
    for (const wo of allWorkOrders) {
      if (wo.completedDate && wo.completedDate >= dateFrom && wo.completedDate <= dateTo) {
        woMap.set(wo.equipmentId, (woMap.get(wo.equipmentId) ?? 0) + (wo.totalCost ?? 0));
      }
    }

    const rows: EquipmentPnlRow[] = [];
    for (const equip of allEquip) {
      const revenue = round2(revenueMap.get(equip.id) ?? 0);
      const fuelCost = round2(fuelMap.get(equip.id) ?? 0);
      const maintenanceCost = round2(maintMap.get(equip.id) ?? 0);
      const depreciationCost = round2(deprMap.get(equip.id) ?? 0);
      const otherCosts = round2(woMap.get(equip.id) ?? 0);
      const totalCosts = round2(fuelCost + maintenanceCost + depreciationCost + otherCosts);
      const netIncome = round2(revenue - totalCosts);

      rows.push({
        equipmentId: equip.id,
        equipmentNumber: equip.equipmentNumber,
        description: equip.description,
        revenue,
        fuelCost,
        maintenanceCost,
        depreciationCost,
        otherCosts,
        totalCosts,
        netIncome,
      });
    }

    return rows;
  }

  /**
   * Owning vs Operating cost breakdown.
   *
   * Owning costs = depreciation + purchase financing (simplified to depreciation)
   * Operating costs = fuel + maintenance + work order costs
   */
  async getOwningVsOperating(
    dateFrom: string,
    dateTo: string,
  ): Promise<OwningVsOperatingRow[]> {
    const allEquip = await this.equipment
      .query()
      .orderBy('equipmentNumber', 'asc')
      .execute();

    const allFuel = await this.fuelLogs
      .query()
      .where('date', '>=', dateFrom)
      .where('date', '<=', dateTo)
      .execute();

    const allMaint = await this.maintenances
      .query()
      .where('status', '=', 'completed')
      .execute();

    const allDepr = await this.depreciations
      .query()
      .where('periodStart', '>=', dateFrom)
      .where('periodEnd', '<=', dateTo)
      .execute();

    const allWorkOrders = await this.workOrders
      .query()
      .where('status', '=', 'completed')
      .execute();

    // Build maps
    const fuelMap = new Map<string, number>();
    for (const f of allFuel) {
      fuelMap.set(f.equipmentId, (fuelMap.get(f.equipmentId) ?? 0) + (f.totalCost ?? 0));
    }

    const maintMap = new Map<string, number>();
    for (const m of allMaint) {
      if (m.completedDate && m.completedDate >= dateFrom && m.completedDate <= dateTo) {
        maintMap.set(m.equipmentId, (maintMap.get(m.equipmentId) ?? 0) + (m.cost ?? 0));
      }
    }

    const deprMap = new Map<string, number>();
    for (const d of allDepr) {
      deprMap.set(d.equipmentId, (deprMap.get(d.equipmentId) ?? 0) + d.depreciationAmount);
    }

    const woMap = new Map<string, number>();
    for (const wo of allWorkOrders) {
      if (wo.completedDate && wo.completedDate >= dateFrom && wo.completedDate <= dateTo) {
        woMap.set(wo.equipmentId, (woMap.get(wo.equipmentId) ?? 0) + (wo.totalCost ?? 0));
      }
    }

    const rows: OwningVsOperatingRow[] = [];
    for (const equip of allEquip) {
      const owningCosts = round2(deprMap.get(equip.id) ?? 0);
      const operatingCosts = round2(
        (fuelMap.get(equip.id) ?? 0) +
        (maintMap.get(equip.id) ?? 0) +
        (woMap.get(equip.id) ?? 0),
      );
      const totalCosts = round2(owningCosts + operatingCosts);
      const owningPct = totalCosts > 0 ? round2((owningCosts / totalCosts) * 100) : 0;
      const operatingPct = totalCosts > 0 ? round2((operatingCosts / totalCosts) * 100) : 0;

      rows.push({
        equipmentId: equip.id,
        equipmentNumber: equip.equipmentNumber,
        description: equip.description,
        owningCosts,
        operatingCosts,
        totalCosts,
        owningPct,
        operatingPct,
      });
    }

    return rows;
  }

  /**
   * FHWA rate comparison.
   * Compares internal hourly rates to FHWA published rates.
   */
  async getFhwaComparison(
    asOfDate: string,
  ): Promise<FhwaComparisonRow[]> {
    const allEquip = await this.equipment
      .query()
      .where('status', '=', 'active')
      .orderBy('equipmentNumber', 'asc')
      .execute();

    const rows: FhwaComparisonRow[] = [];

    for (const equip of allEquip) {
      const rate = await this.getEffectiveRate(equip.id, asOfDate);
      if (!rate) continue;

      const internalHourlyRate = rate.hourlyRate ?? 0;
      const fhwaRate = rate.fhwaRate ?? 0;

      if (internalHourlyRate === 0 && fhwaRate === 0) continue;

      const variance = round2(internalHourlyRate - fhwaRate);
      const variancePct = fhwaRate > 0
        ? round2(((internalHourlyRate - fhwaRate) / fhwaRate) * 100)
        : 0;

      rows.push({
        equipmentId: equip.id,
        equipmentNumber: equip.equipmentNumber,
        description: equip.description,
        internalHourlyRate: round2(internalHourlyRate),
        fhwaRate: round2(fhwaRate),
        variance,
        variancePct,
      });
    }

    return rows;
  }
}
