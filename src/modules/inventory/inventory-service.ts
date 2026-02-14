/**
 * Concrete -- Inventory & Material Management Service
 *
 * Core service layer for the Inventory module (Phase 21). Provides
 * item master management, warehouse/location management, inventory
 * receipts and issues, transfers between locations, physical inventory
 * counts and adjustments, material requisition workflow, job-site
 * material tracking, inventory valuation (FIFO/LIFO/average cost),
 * low stock alerts, waste tracking, and material cost integration
 * with job cost.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type ItemCategory =
  | 'raw_material'
  | 'finished_good'
  | 'consumable'
  | 'safety'
  | 'tool'
  | 'equipment_part'
  | 'other';

export type ItemUnit =
  | 'each'
  | 'ft'
  | 'lf'
  | 'sf'
  | 'sy'
  | 'cy'
  | 'ton'
  | 'lb'
  | 'gal'
  | 'bag'
  | 'box'
  | 'roll'
  | 'sheet'
  | 'bundle'
  | 'pallet';

export type WarehouseType = 'warehouse' | 'yard' | 'job_site' | 'vehicle';

export type TransactionType = 'receipt' | 'issue' | 'transfer' | 'adjustment' | 'waste';

export type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_filled'
  | 'filled'
  | 'cancelled';

export type CountStatus = 'draft' | 'in_progress' | 'completed' | 'posted';

export type ValuationMethod = 'fifo' | 'lifo' | 'average';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface InventoryItem {
  [key: string]: unknown;
  number: string;
  description: string;
  unit: ItemUnit;
  category: ItemCategory;
  preferredVendorId?: string;
  preferredVendorName?: string;
  reorderPoint: number;
  reorderQuantity: number;
  unitCost: number;
  lastCost: number;
  avgCost: number;
  active: boolean;
}

export interface Warehouse {
  [key: string]: unknown;
  name: string;
  type: WarehouseType;
  address?: string;
  jobId?: string;
  contactName?: string;
  contactPhone?: string;
  active: boolean;
}

export interface InventoryTransaction {
  [key: string]: unknown;
  itemId: string;
  warehouseId: string;
  toWarehouseId?: string;
  type: TransactionType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  date: string;
  reference?: string;
  jobId?: string;
  costCode?: string;
  notes?: string;
  lotNumber?: string;
  poNumber?: string;
}

export interface MaterialRequisition {
  [key: string]: unknown;
  number: string;
  jobId: string;
  requestedBy: string;
  requestDate: string;
  neededDate: string;
  status: RequisitionStatus;
  itemId: string;
  itemDescription?: string;
  quantity: number;
  warehouseId?: string;
  approvedBy?: string;
  approvedDate?: string;
  filledQuantity: number;
  notes?: string;
}

export interface InventoryCount {
  [key: string]: unknown;
  warehouseId: string;
  countDate: string;
  status: CountStatus;
  countedBy: string;
  itemId: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  adjustmentPosted: boolean;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Report / Summary Types
// ---------------------------------------------------------------------------

export interface StockLevel {
  itemId: string;
  itemNumber: string;
  itemDescription: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
}

export interface ValuationRow {
  itemId: string;
  itemNumber: string;
  itemDescription: string;
  unit: string;
  totalQuantity: number;
  unitCost: number;
  totalValue: number;
  method: ValuationMethod;
}

export interface LowStockAlert {
  itemId: string;
  itemNumber: string;
  itemDescription: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  deficit: number;
}

export interface JobMaterialSummary {
  jobId: string;
  totalIssued: number;
  totalWaste: number;
  totalCost: number;
  wasteCost: number;
  items: {
    itemId: string;
    itemNumber: string;
    itemDescription: string;
    quantityIssued: number;
    quantityWasted: number;
    cost: number;
  }[];
}

export interface WasteEntry {
  transactionId: string;
  itemId: string;
  itemNumber: string;
  itemDescription: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  date: string;
  jobId?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n: number): number => Math.round(n * 100) / 100;

function currentDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class InventoryService {
  constructor(
    private items: Collection<InventoryItem>,
    private warehouses: Collection<Warehouse>,
    private transactions: Collection<InventoryTransaction>,
    private requisitions: Collection<MaterialRequisition>,
    private counts: Collection<InventoryCount>,
    private events: EventBus,
  ) {}

  // =========================================================================
  // Item Master
  // =========================================================================

  async createItem(data: {
    number: string;
    description: string;
    unit: ItemUnit;
    category: ItemCategory;
    preferredVendorId?: string;
    preferredVendorName?: string;
    reorderPoint?: number;
    reorderQuantity?: number;
    unitCost?: number;
  }): Promise<InventoryItem & CollectionMeta> {
    const item = await this.items.insert({
      number: data.number,
      description: data.description,
      unit: data.unit,
      category: data.category,
      preferredVendorId: data.preferredVendorId ?? '',
      preferredVendorName: data.preferredVendorName ?? '',
      reorderPoint: round2(data.reorderPoint ?? 0),
      reorderQuantity: round2(data.reorderQuantity ?? 0),
      unitCost: round2(data.unitCost ?? 0),
      lastCost: round2(data.unitCost ?? 0),
      avgCost: round2(data.unitCost ?? 0),
      active: true,
    });
    this.events.emit('inventory.item.created', { item });
    return item;
  }

  async updateItem(
    id: string,
    changes: Partial<InventoryItem>,
  ): Promise<InventoryItem & CollectionMeta> {
    const existing = await this.items.get(id);
    if (!existing) throw new Error(`Item ${id} not found`);
    const updated = await this.items.update(id, changes);
    this.events.emit('inventory.item.updated', { item: updated });
    return updated;
  }

  async getItem(id: string): Promise<(InventoryItem & CollectionMeta) | null> {
    return this.items.get(id);
  }

  async listItems(filters?: {
    category?: ItemCategory;
    active?: boolean;
    search?: string;
  }): Promise<(InventoryItem & CollectionMeta)[]> {
    const q = this.items.query();
    if (filters?.category) q.where('category', '=', filters.category);
    if (filters?.active !== undefined) q.where('active', '=', filters.active);
    q.orderBy('number', 'asc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (i) =>
          i.number.toLowerCase().includes(s) ||
          i.description.toLowerCase().includes(s) ||
          (i.preferredVendorName ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  async deactivateItem(id: string): Promise<InventoryItem & CollectionMeta> {
    const existing = await this.items.get(id);
    if (!existing) throw new Error(`Item ${id} not found`);
    const updated = await this.items.update(id, { active: false });
    this.events.emit('inventory.item.deactivated', { item: updated });
    return updated;
  }

  // =========================================================================
  // Warehouse / Location Management
  // =========================================================================

  async createWarehouse(data: {
    name: string;
    type: WarehouseType;
    address?: string;
    jobId?: string;
    contactName?: string;
    contactPhone?: string;
  }): Promise<Warehouse & CollectionMeta> {
    const wh = await this.warehouses.insert({
      name: data.name,
      type: data.type,
      address: data.address ?? '',
      jobId: data.jobId ?? '',
      contactName: data.contactName ?? '',
      contactPhone: data.contactPhone ?? '',
      active: true,
    });
    this.events.emit('inventory.warehouse.created', { warehouse: wh });
    return wh;
  }

  async updateWarehouse(
    id: string,
    changes: Partial<Warehouse>,
  ): Promise<Warehouse & CollectionMeta> {
    const existing = await this.warehouses.get(id);
    if (!existing) throw new Error(`Warehouse ${id} not found`);
    const updated = await this.warehouses.update(id, changes);
    this.events.emit('inventory.warehouse.updated', { warehouse: updated });
    return updated;
  }

  async getWarehouse(id: string): Promise<(Warehouse & CollectionMeta) | null> {
    return this.warehouses.get(id);
  }

  async listWarehouses(filters?: {
    type?: WarehouseType;
    active?: boolean;
    search?: string;
  }): Promise<(Warehouse & CollectionMeta)[]> {
    const q = this.warehouses.query();
    if (filters?.type) q.where('type', '=', filters.type);
    if (filters?.active !== undefined) q.where('active', '=', filters.active);
    q.orderBy('name', 'asc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (w) =>
          w.name.toLowerCase().includes(s) ||
          (w.address ?? '').toLowerCase().includes(s),
      );
    }
    return results;
  }

  async deactivateWarehouse(id: string): Promise<Warehouse & CollectionMeta> {
    const existing = await this.warehouses.get(id);
    if (!existing) throw new Error(`Warehouse ${id} not found`);
    const updated = await this.warehouses.update(id, { active: false });
    this.events.emit('inventory.warehouse.deactivated', { warehouse: updated });
    return updated;
  }

  // =========================================================================
  // Inventory Receipts
  // =========================================================================

  async receiveInventory(data: {
    itemId: string;
    warehouseId: string;
    quantity: number;
    unitCost: number;
    date?: string;
    reference?: string;
    poNumber?: string;
    lotNumber?: string;
    notes?: string;
  }): Promise<InventoryTransaction & CollectionMeta> {
    const qty = round2(data.quantity);
    const cost = round2(data.unitCost);
    const txn = await this.transactions.insert({
      itemId: data.itemId,
      warehouseId: data.warehouseId,
      type: 'receipt' as TransactionType,
      quantity: qty,
      unitCost: cost,
      totalCost: round2(qty * cost),
      date: data.date ?? currentDate(),
      reference: data.reference ?? '',
      poNumber: data.poNumber ?? '',
      lotNumber: data.lotNumber ?? '',
      notes: data.notes ?? '',
      jobId: '',
      costCode: '',
    });
    await this.updateItemCosts(data.itemId, cost);
    this.events.emit('inventory.received', { transaction: txn });
    return txn;
  }

  // =========================================================================
  // Inventory Issues
  // =========================================================================

  async issueInventory(data: {
    itemId: string;
    warehouseId: string;
    quantity: number;
    date?: string;
    jobId?: string;
    costCode?: string;
    reference?: string;
    notes?: string;
  }): Promise<InventoryTransaction & CollectionMeta> {
    const qty = round2(data.quantity);
    const item = await this.items.get(data.itemId);
    const cost = round2(item?.avgCost ?? item?.unitCost ?? 0);
    const txn = await this.transactions.insert({
      itemId: data.itemId,
      warehouseId: data.warehouseId,
      type: 'issue' as TransactionType,
      quantity: qty,
      unitCost: cost,
      totalCost: round2(qty * cost),
      date: data.date ?? currentDate(),
      reference: data.reference ?? '',
      jobId: data.jobId ?? '',
      costCode: data.costCode ?? '',
      notes: data.notes ?? '',
      lotNumber: '',
      poNumber: '',
    });
    this.events.emit('inventory.issued', { transaction: txn });
    return txn;
  }

  // =========================================================================
  // Transfer Between Locations
  // =========================================================================

  async transferInventory(data: {
    itemId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    date?: string;
    reference?: string;
    notes?: string;
  }): Promise<InventoryTransaction & CollectionMeta> {
    const qty = round2(data.quantity);
    const item = await this.items.get(data.itemId);
    const cost = round2(item?.avgCost ?? item?.unitCost ?? 0);
    const txn = await this.transactions.insert({
      itemId: data.itemId,
      warehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      type: 'transfer' as TransactionType,
      quantity: qty,
      unitCost: cost,
      totalCost: round2(qty * cost),
      date: data.date ?? currentDate(),
      reference: data.reference ?? '',
      notes: data.notes ?? '',
      jobId: '',
      costCode: '',
      lotNumber: '',
      poNumber: '',
    });
    this.events.emit('inventory.transferred', { transaction: txn });
    return txn;
  }

  // =========================================================================
  // Inventory Adjustments
  // =========================================================================

  async adjustInventory(data: {
    itemId: string;
    warehouseId: string;
    quantity: number;
    unitCost?: number;
    date?: string;
    reference?: string;
    notes?: string;
  }): Promise<InventoryTransaction & CollectionMeta> {
    const qty = round2(data.quantity);
    const item = await this.items.get(data.itemId);
    const cost = round2(data.unitCost ?? item?.avgCost ?? item?.unitCost ?? 0);
    const txn = await this.transactions.insert({
      itemId: data.itemId,
      warehouseId: data.warehouseId,
      type: 'adjustment' as TransactionType,
      quantity: qty,
      unitCost: cost,
      totalCost: round2(qty * cost),
      date: data.date ?? currentDate(),
      reference: data.reference ?? '',
      notes: data.notes ?? '',
      jobId: '',
      costCode: '',
      lotNumber: '',
      poNumber: '',
    });
    this.events.emit('inventory.adjusted', { transaction: txn });
    return txn;
  }

  // =========================================================================
  // Waste Tracking
  // =========================================================================

  async recordWaste(data: {
    itemId: string;
    warehouseId: string;
    quantity: number;
    date?: string;
    jobId?: string;
    costCode?: string;
    notes?: string;
  }): Promise<InventoryTransaction & CollectionMeta> {
    const qty = round2(data.quantity);
    const item = await this.items.get(data.itemId);
    const cost = round2(item?.avgCost ?? item?.unitCost ?? 0);
    const txn = await this.transactions.insert({
      itemId: data.itemId,
      warehouseId: data.warehouseId,
      type: 'waste' as TransactionType,
      quantity: qty,
      unitCost: cost,
      totalCost: round2(qty * cost),
      date: data.date ?? currentDate(),
      notes: data.notes ?? '',
      jobId: data.jobId ?? '',
      costCode: data.costCode ?? '',
      reference: '',
      lotNumber: '',
      poNumber: '',
    });
    this.events.emit('inventory.waste.recorded', { transaction: txn });
    return txn;
  }

  // =========================================================================
  // Transaction Queries
  // =========================================================================

  async getTransactionsByItem(
    itemId: string,
  ): Promise<(InventoryTransaction & CollectionMeta)[]> {
    const q = this.transactions.query();
    q.where('itemId', '=', itemId);
    q.orderBy('date', 'desc');
    return q.execute();
  }

  async getTransactionsByWarehouse(
    warehouseId: string,
  ): Promise<(InventoryTransaction & CollectionMeta)[]> {
    const q = this.transactions.query();
    q.where('warehouseId', '=', warehouseId);
    q.orderBy('date', 'desc');
    return q.execute();
  }

  async getTransactionsByJob(
    jobId: string,
  ): Promise<(InventoryTransaction & CollectionMeta)[]> {
    const q = this.transactions.query();
    q.where('jobId', '=', jobId);
    q.orderBy('date', 'desc');
    return q.execute();
  }

  async listTransactions(filters?: {
    type?: TransactionType;
    itemId?: string;
    warehouseId?: string;
    jobId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<(InventoryTransaction & CollectionMeta)[]> {
    const q = this.transactions.query();
    if (filters?.type) q.where('type', '=', filters.type);
    if (filters?.itemId) q.where('itemId', '=', filters.itemId);
    if (filters?.warehouseId) q.where('warehouseId', '=', filters.warehouseId);
    if (filters?.jobId) q.where('jobId', '=', filters.jobId);
    q.orderBy('date', 'desc');
    let results = await q.execute();
    if (filters?.dateFrom) {
      results = results.filter((t) => t.date >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      results = results.filter((t) => t.date <= filters.dateTo!);
    }
    return results;
  }

  // =========================================================================
  // Material Requisition Workflow
  // =========================================================================

  async createRequisition(data: {
    number: string;
    jobId: string;
    requestedBy: string;
    neededDate: string;
    itemId: string;
    itemDescription?: string;
    quantity: number;
    warehouseId?: string;
    notes?: string;
  }): Promise<MaterialRequisition & CollectionMeta> {
    const req = await this.requisitions.insert({
      number: data.number,
      jobId: data.jobId,
      requestedBy: data.requestedBy,
      requestDate: currentDate(),
      neededDate: data.neededDate,
      status: 'draft' as RequisitionStatus,
      itemId: data.itemId,
      itemDescription: data.itemDescription ?? '',
      quantity: round2(data.quantity),
      warehouseId: data.warehouseId ?? '',
      filledQuantity: 0,
      notes: data.notes ?? '',
    });
    this.events.emit('inventory.requisition.created', { requisition: req });
    return req;
  }

  async submitRequisition(id: string): Promise<MaterialRequisition & CollectionMeta> {
    const existing = await this.requisitions.get(id);
    if (!existing) throw new Error(`Requisition ${id} not found`);
    if (existing.status !== 'draft') throw new Error('Only draft requisitions can be submitted');
    const updated = await this.requisitions.update(id, { status: 'submitted' as RequisitionStatus });
    this.events.emit('inventory.requisition.submitted', { requisition: updated });
    return updated;
  }

  async approveRequisition(
    id: string,
    approvedBy: string,
  ): Promise<MaterialRequisition & CollectionMeta> {
    const existing = await this.requisitions.get(id);
    if (!existing) throw new Error(`Requisition ${id} not found`);
    if (existing.status !== 'submitted') throw new Error('Only submitted requisitions can be approved');
    const updated = await this.requisitions.update(id, {
      status: 'approved' as RequisitionStatus,
      approvedBy,
      approvedDate: currentDate(),
    });
    this.events.emit('inventory.requisition.approved', { requisition: updated });
    return updated;
  }

  async fillRequisition(
    id: string,
    filledQuantity: number,
  ): Promise<MaterialRequisition & CollectionMeta> {
    const existing = await this.requisitions.get(id);
    if (!existing) throw new Error(`Requisition ${id} not found`);
    if (existing.status !== 'approved' && existing.status !== 'partially_filled') {
      throw new Error('Only approved or partially filled requisitions can be filled');
    }
    const totalFilled = round2((existing.filledQuantity ?? 0) + filledQuantity);
    const newStatus: RequisitionStatus = totalFilled >= existing.quantity ? 'filled' : 'partially_filled';
    const updated = await this.requisitions.update(id, {
      filledQuantity: totalFilled,
      status: newStatus,
    });
    this.events.emit('inventory.requisition.filled', { requisition: updated });
    return updated;
  }

  async cancelRequisition(id: string): Promise<MaterialRequisition & CollectionMeta> {
    const existing = await this.requisitions.get(id);
    if (!existing) throw new Error(`Requisition ${id} not found`);
    if (existing.status === 'filled' || existing.status === 'cancelled') {
      throw new Error('Cannot cancel a filled or already cancelled requisition');
    }
    const updated = await this.requisitions.update(id, { status: 'cancelled' as RequisitionStatus });
    this.events.emit('inventory.requisition.cancelled', { requisition: updated });
    return updated;
  }

  async listRequisitions(filters?: {
    status?: RequisitionStatus;
    jobId?: string;
    search?: string;
  }): Promise<(MaterialRequisition & CollectionMeta)[]> {
    const q = this.requisitions.query();
    if (filters?.status) q.where('status', '=', filters.status);
    if (filters?.jobId) q.where('jobId', '=', filters.jobId);
    q.orderBy('requestDate', 'desc');
    let results = await q.execute();
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.number.toLowerCase().includes(s) ||
          (r.itemDescription ?? '').toLowerCase().includes(s) ||
          r.requestedBy.toLowerCase().includes(s),
      );
    }
    return results;
  }

  async getRequisition(id: string): Promise<(MaterialRequisition & CollectionMeta) | null> {
    return this.requisitions.get(id);
  }

  // =========================================================================
  // Physical Inventory Count
  // =========================================================================

  async createCount(data: {
    warehouseId: string;
    countDate?: string;
    countedBy: string;
    itemId: string;
    systemQuantity: number;
    countedQuantity: number;
    notes?: string;
  }): Promise<InventoryCount & CollectionMeta> {
    const sysQty = round2(data.systemQuantity);
    const countQty = round2(data.countedQuantity);
    const cnt = await this.counts.insert({
      warehouseId: data.warehouseId,
      countDate: data.countDate ?? currentDate(),
      status: 'draft' as CountStatus,
      countedBy: data.countedBy,
      itemId: data.itemId,
      systemQuantity: sysQty,
      countedQuantity: countQty,
      variance: round2(countQty - sysQty),
      adjustmentPosted: false,
      notes: data.notes ?? '',
    });
    this.events.emit('inventory.count.created', { count: cnt });
    return cnt;
  }

  async updateCountLine(
    id: string,
    countedQuantity: number,
    notes?: string,
  ): Promise<InventoryCount & CollectionMeta> {
    const existing = await this.counts.get(id);
    if (!existing) throw new Error(`Count ${id} not found`);
    if (existing.status === 'posted') throw new Error('Cannot update a posted count');
    const countQty = round2(countedQuantity);
    const updated = await this.counts.update(id, {
      countedQuantity: countQty,
      variance: round2(countQty - existing.systemQuantity),
      status: 'in_progress' as CountStatus,
      ...(notes !== undefined ? { notes } : {}),
    });
    this.events.emit('inventory.count.updated', { count: updated });
    return updated;
  }

  async completeCount(id: string): Promise<InventoryCount & CollectionMeta> {
    const existing = await this.counts.get(id);
    if (!existing) throw new Error(`Count ${id} not found`);
    if (existing.status === 'posted') throw new Error('Count already posted');
    const updated = await this.counts.update(id, { status: 'completed' as CountStatus });
    this.events.emit('inventory.count.completed', { count: updated });
    return updated;
  }

  async postCount(id: string): Promise<InventoryCount & CollectionMeta> {
    const existing = await this.counts.get(id);
    if (!existing) throw new Error(`Count ${id} not found`);
    if (existing.status !== 'completed') throw new Error('Only completed counts can be posted');

    // Create adjustment transaction for the variance
    if (existing.variance !== 0) {
      await this.adjustInventory({
        itemId: existing.itemId,
        warehouseId: existing.warehouseId,
        quantity: existing.variance,
        reference: `Physical count adjustment - Count ${id}`,
        notes: existing.notes ?? '',
      });
    }

    const updated = await this.counts.update(id, {
      status: 'posted' as CountStatus,
      adjustmentPosted: true,
    });
    this.events.emit('inventory.count.posted', { count: updated });
    return updated;
  }

  async listCounts(filters?: {
    warehouseId?: string;
    status?: CountStatus;
  }): Promise<(InventoryCount & CollectionMeta)[]> {
    const q = this.counts.query();
    if (filters?.warehouseId) q.where('warehouseId', '=', filters.warehouseId);
    if (filters?.status) q.where('status', '=', filters.status);
    q.orderBy('countDate', 'desc');
    return q.execute();
  }

  // =========================================================================
  // Stock Level Computation
  // =========================================================================

  async getStockLevel(
    itemId: string,
    warehouseId?: string,
  ): Promise<number> {
    const q = this.transactions.query();
    q.where('itemId', '=', itemId);
    if (warehouseId) q.where('warehouseId', '=', warehouseId);
    const txns = await q.execute();

    let qty = 0;
    for (const txn of txns) {
      switch (txn.type) {
        case 'receipt':
        case 'adjustment':
          qty += txn.quantity;
          break;
        case 'issue':
        case 'waste':
          qty -= txn.quantity;
          break;
        case 'transfer':
          if (warehouseId) {
            if (txn.warehouseId === warehouseId) qty -= txn.quantity;
            if (txn.toWarehouseId === warehouseId) qty += txn.quantity;
          }
          // If no warehouseId filter, transfers net to zero
          break;
      }
    }

    // Also account for transfers INTO this warehouse (toWarehouseId)
    if (warehouseId) {
      const inbound = this.transactions.query();
      inbound.where('itemId', '=', itemId);
      inbound.where('toWarehouseId', '=', warehouseId);
      inbound.where('type', '=', 'transfer');
      const inboundTxns = await inbound.execute();
      for (const txn of inboundTxns) {
        qty += txn.quantity;
      }
    }

    return round2(qty);
  }

  async getStockByWarehouse(
    warehouseId: string,
  ): Promise<StockLevel[]> {
    const allItems = await this.items.query().execute();
    const levels: StockLevel[] = [];

    const wh = await this.warehouses.get(warehouseId);
    const whName = wh?.name ?? warehouseId;

    for (const item of allItems) {
      if (!item.active) continue;
      const qty = await this.getStockLevel((item as any).id, warehouseId);
      if (qty !== 0) {
        levels.push({
          itemId: (item as any).id,
          itemNumber: item.number,
          itemDescription: item.description,
          unit: item.unit,
          warehouseId,
          warehouseName: whName,
          quantity: qty,
          unitCost: item.avgCost || item.unitCost,
          totalValue: round2(qty * (item.avgCost || item.unitCost)),
        });
      }
    }

    return levels;
  }

  // =========================================================================
  // Inventory Valuation (FIFO / LIFO / Average)
  // =========================================================================

  async getValuation(
    method: ValuationMethod = 'average',
  ): Promise<{ rows: ValuationRow[]; totalValue: number }> {
    const allItems = await this.items.query().execute();
    const rows: ValuationRow[] = [];
    let totalValue = 0;

    for (const item of allItems) {
      if (!item.active) continue;
      const itemId = (item as any).id as string;
      const txns = await this.getTransactionsByItem(itemId);
      const qty = await this.getStockLevel(itemId);

      if (qty <= 0) continue;

      let value: number;
      switch (method) {
        case 'fifo':
          value = this.calculateFIFO(txns, qty);
          break;
        case 'lifo':
          value = this.calculateLIFO(txns, qty);
          break;
        case 'average':
        default:
          value = round2(qty * (item.avgCost || item.unitCost));
          break;
      }

      const unitCost = qty > 0 ? round2(value / qty) : 0;
      rows.push({
        itemId,
        itemNumber: item.number,
        itemDescription: item.description,
        unit: item.unit,
        totalQuantity: qty,
        unitCost,
        totalValue: round2(value),
        method,
      });
      totalValue += value;
    }

    return { rows, totalValue: round2(totalValue) };
  }

  private calculateFIFO(
    txns: (InventoryTransaction & CollectionMeta)[],
    onHandQty: number,
  ): number {
    // Get receipt transactions sorted oldest-first
    const receipts = txns
      .filter((t) => t.type === 'receipt' || (t.type === 'adjustment' && t.quantity > 0))
      .sort((a, b) => a.date.localeCompare(b.date));

    // FIFO: use oldest costs first, so remaining inventory uses newest costs
    // Walk from newest to oldest to find the layers covering onHandQty
    let remaining = onHandQty;
    let value = 0;
    for (let i = receipts.length - 1; i >= 0 && remaining > 0; i--) {
      const r = receipts[i];
      const take = Math.min(remaining, r.quantity);
      value += round2(take * r.unitCost);
      remaining -= take;
    }
    return round2(value);
  }

  private calculateLIFO(
    txns: (InventoryTransaction & CollectionMeta)[],
    onHandQty: number,
  ): number {
    // Get receipt transactions sorted newest-first
    const receipts = txns
      .filter((t) => t.type === 'receipt' || (t.type === 'adjustment' && t.quantity > 0))
      .sort((a, b) => b.date.localeCompare(a.date));

    // LIFO: use newest costs first, so remaining inventory uses oldest costs
    // Walk from oldest to newest to find the layers covering onHandQty
    let remaining = onHandQty;
    let value = 0;
    for (let i = receipts.length - 1; i >= 0 && remaining > 0; i--) {
      const r = receipts[i];
      const take = Math.min(remaining, r.quantity);
      value += round2(take * r.unitCost);
      remaining -= take;
    }
    return round2(value);
  }

  // =========================================================================
  // Low Stock Alerts
  // =========================================================================

  async getLowStockItems(): Promise<LowStockAlert[]> {
    const allItems = await this.items.query().execute();
    const alerts: LowStockAlert[] = [];

    for (const item of allItems) {
      if (!item.active || item.reorderPoint <= 0) continue;
      const itemId = (item as any).id as string;
      const currentStock = await this.getStockLevel(itemId);
      if (currentStock <= item.reorderPoint) {
        alerts.push({
          itemId,
          itemNumber: item.number,
          itemDescription: item.description,
          currentStock,
          reorderPoint: item.reorderPoint,
          reorderQuantity: item.reorderQuantity,
          deficit: round2(item.reorderPoint - currentStock),
        });
      }
    }

    return alerts.sort((a, b) => b.deficit - a.deficit);
  }

  // =========================================================================
  // Job-Site Material Tracking
  // =========================================================================

  async getJobMaterialSummary(jobId: string): Promise<JobMaterialSummary> {
    const txns = await this.getTransactionsByJob(jobId);
    const itemMap = new Map<string, { issued: number; wasted: number; cost: number }>();

    for (const txn of txns) {
      if (txn.type !== 'issue' && txn.type !== 'waste') continue;
      const existing = itemMap.get(txn.itemId) ?? { issued: 0, wasted: 0, cost: 0 };
      if (txn.type === 'issue') {
        existing.issued += txn.quantity;
        existing.cost += txn.totalCost;
      } else {
        existing.wasted += txn.quantity;
        existing.cost += txn.totalCost;
      }
      itemMap.set(txn.itemId, existing);
    }

    let totalIssued = 0;
    let totalWaste = 0;
    let totalCost = 0;
    let wasteCost = 0;
    const items: JobMaterialSummary['items'] = [];

    for (const [itemId, data] of itemMap) {
      const item = await this.items.get(itemId);
      items.push({
        itemId,
        itemNumber: item?.number ?? itemId,
        itemDescription: item?.description ?? '',
        quantityIssued: data.issued,
        quantityWasted: data.wasted,
        cost: round2(data.cost),
      });
      totalIssued += data.issued;
      totalWaste += data.wasted;
      // Separate cost for issues vs waste
      const issueTxns = txns.filter((t) => t.itemId === itemId && t.type === 'issue');
      const wasteTxns = txns.filter((t) => t.itemId === itemId && t.type === 'waste');
      totalCost += issueTxns.reduce((s, t) => s + t.totalCost, 0);
      wasteCost += wasteTxns.reduce((s, t) => s + t.totalCost, 0);
    }

    return {
      jobId,
      totalIssued: round2(totalIssued),
      totalWaste: round2(totalWaste),
      totalCost: round2(totalCost),
      wasteCost: round2(wasteCost),
      items,
    };
  }

  // =========================================================================
  // Waste Report
  // =========================================================================

  async getWasteReport(filters?: {
    dateFrom?: string;
    dateTo?: string;
    jobId?: string;
  }): Promise<{ entries: WasteEntry[]; totalWasteCost: number }> {
    const q = this.transactions.query();
    q.where('type', '=', 'waste');
    if (filters?.jobId) q.where('jobId', '=', filters.jobId);
    q.orderBy('date', 'desc');
    let txns = await q.execute();

    if (filters?.dateFrom) txns = txns.filter((t) => t.date >= filters.dateFrom!);
    if (filters?.dateTo) txns = txns.filter((t) => t.date <= filters.dateTo!);

    let totalWasteCost = 0;
    const entries: WasteEntry[] = [];

    for (const txn of txns) {
      const item = await this.items.get(txn.itemId);
      const wh = await this.warehouses.get(txn.warehouseId);
      entries.push({
        transactionId: (txn as any).id,
        itemId: txn.itemId,
        itemNumber: item?.number ?? txn.itemId,
        itemDescription: item?.description ?? '',
        warehouseId: txn.warehouseId,
        warehouseName: wh?.name ?? txn.warehouseId,
        quantity: txn.quantity,
        unitCost: txn.unitCost,
        totalCost: txn.totalCost,
        date: txn.date,
        jobId: txn.jobId,
        notes: txn.notes,
      });
      totalWasteCost += txn.totalCost;
    }

    return { entries, totalWasteCost: round2(totalWasteCost) };
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private async updateItemCosts(itemId: string, newCost: number): Promise<void> {
    const item = await this.items.get(itemId);
    if (!item) return;

    // Update last cost
    const lastCost = round2(newCost);

    // Calculate weighted average cost from all receipt transactions
    const txns = await this.getTransactionsByItem(itemId);
    const receipts = txns.filter((t) => t.type === 'receipt');
    let totalQty = 0;
    let totalValue = 0;
    for (const r of receipts) {
      totalQty += r.quantity;
      totalValue += r.totalCost;
    }
    const avgCost = totalQty > 0 ? round2(totalValue / totalQty) : lastCost;

    await this.items.update(itemId, { lastCost, avgCost });
  }
}
