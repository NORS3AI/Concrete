/**
 * Concrete -- Service Management Service
 *
 * Core service layer for the Service Management module. Provides service
 * agreement management, work order processing, dispatch and assignment,
 * technician time tracking, customer equipment registry, preventive
 * maintenance scheduling, service call management, billing, profitability
 * analysis, and customer service history.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type AgreementType = 'full_service' | 'preventive' | 'on_call' | 'warranty';
export type AgreementStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type BillingFrequency = 'monthly' | 'quarterly' | 'annually';
export type WorkOrderType = 'scheduled' | 'on_demand' | 'emergency' | 'callback';
export type WorkOrderStatus = 'open' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'invoiced' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'emergency';
export type PricingType = 'flat_rate' | 'tm';
export type BillingStatus = 'unbilled' | 'billed' | 'partial';
export type WorkOrderLineType = 'labor' | 'material' | 'other';
export type ServiceCallType = 'request' | 'complaint' | 'inquiry' | 'emergency';
export type ServiceCallStatus = 'new' | 'dispatched' | 'resolved';
export type EquipmentStatus = 'active' | 'inactive' | 'retired';
export type PMFrequency = 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type PMStatus = 'active' | 'paused' | 'completed';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface ServiceAgreement {
  [key: string]: unknown;
  customerId: string;
  name: string;
  description?: string;
  type: AgreementType;
  status: AgreementStatus;
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  recurringAmount: number;
  billingFrequency?: BillingFrequency;
  terms?: string;
  coveredEquipment?: string;
  responseTimeSla?: string;
  entityId?: string;
}

export interface WorkOrder {
  [key: string]: unknown;
  agreementId?: string;
  customerId: string;
  number: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  description?: string;
  assignedTo?: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  completedDate?: string;
  customerEquipmentId?: string;
  problemDescription?: string;
  resolution?: string;
  laborTotal: number;
  materialTotal: number;
  totalAmount: number;
  pricingType: PricingType;
  flatRateAmount: number;
  billingStatus: BillingStatus;
  invoiceId?: string;
  entityId?: string;
}

export interface WorkOrderLine {
  [key: string]: unknown;
  workOrderId: string;
  type: WorkOrderLineType;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  technicianId?: string;
  partNumber?: string;
}

export interface ServiceCall {
  [key: string]: unknown;
  customerId: string;
  workOrderId?: string;
  callDate: string;
  callType: ServiceCallType;
  priority: WorkOrderPriority;
  description?: string;
  callerName?: string;
  callerPhone?: string;
  status: ServiceCallStatus;
  assignedTo?: string;
  dispatchedAt?: string;
  resolvedAt?: string;
}

export interface CustomerEquipment {
  [key: string]: unknown;
  customerId: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  warrantyEndDate?: string;
  location?: string;
  status: EquipmentStatus;
  lastServiceDate?: string;
  nextServiceDate?: string;
  notes?: string;
}

export interface PreventiveMaintenance {
  [key: string]: unknown;
  customerEquipmentId: string;
  agreementId?: string;
  name: string;
  frequency: PMFrequency;
  lastPerformed?: string;
  nextDue?: string;
  checklist?: string;
  estimatedDuration?: number;
  assignedTo?: string;
  status: PMStatus;
}

export interface TechnicianTimeEntry {
  [key: string]: unknown;
  workOrderId: string;
  technicianId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  hourlyRate: number;
  amount: number;
  travelTime: number;
  description?: string;
}

// ---------------------------------------------------------------------------
// Report Types
// ---------------------------------------------------------------------------

export interface ServiceProfitability {
  agreementId?: string;
  agreementName?: string;
  revenue: number;
  laborCost: number;
  materialCost: number;
  profit: number;
  margin: number;
}

export interface CustomerServiceHistoryEntry {
  type: 'workOrder' | 'call' | 'equipment';
  date: string;
  description: string;
  id: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// ServiceMgmtService
// ---------------------------------------------------------------------------

export class ServiceMgmtService {
  constructor(
    private agreements: Collection<ServiceAgreement>,
    private workOrders: Collection<WorkOrder>,
    private workOrderLines: Collection<WorkOrderLine>,
    private serviceCalls: Collection<ServiceCall>,
    private customerEquipment: Collection<CustomerEquipment>,
    private preventiveMaintenances: Collection<PreventiveMaintenance>,
    private technicianTimeEntries: Collection<TechnicianTimeEntry>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // SERVICE AGREEMENT CRUD
  // ========================================================================

  /**
   * Create a new service agreement.
   * Defaults: status='pending', recurringAmount=0.
   */
  async createAgreement(data: {
    customerId: string;
    name: string;
    description?: string;
    type: AgreementType;
    status?: AgreementStatus;
    startDate: string;
    endDate?: string;
    renewalDate?: string;
    recurringAmount?: number;
    billingFrequency?: BillingFrequency;
    terms?: string;
    coveredEquipment?: string;
    responseTimeSla?: string;
    entityId?: string;
  }): Promise<ServiceAgreement & CollectionMeta> {
    const record = await this.agreements.insert({
      customerId: data.customerId,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status ?? 'pending',
      startDate: data.startDate,
      endDate: data.endDate,
      renewalDate: data.renewalDate,
      recurringAmount: data.recurringAmount ?? 0,
      billingFrequency: data.billingFrequency,
      terms: data.terms,
      coveredEquipment: data.coveredEquipment,
      responseTimeSla: data.responseTimeSla,
      entityId: data.entityId,
    } as ServiceAgreement);

    this.events.emit('service.agreement.created', { agreement: record });
    return record;
  }

  /**
   * Update an existing service agreement.
   */
  async updateAgreement(
    id: string,
    changes: Partial<ServiceAgreement>,
  ): Promise<ServiceAgreement & CollectionMeta> {
    const existing = await this.agreements.get(id);
    if (!existing) {
      throw new Error(`Service agreement not found: ${id}`);
    }

    const updated = await this.agreements.update(id, changes as Partial<ServiceAgreement>);
    return updated;
  }

  /**
   * Renew a service agreement.
   * Sets new start/end/renewal dates and status to 'active'.
   */
  async renewAgreement(
    id: string,
    newStartDate: string,
    newEndDate: string,
    newRenewalDate?: string,
  ): Promise<ServiceAgreement & CollectionMeta> {
    const existing = await this.agreements.get(id);
    if (!existing) {
      throw new Error(`Service agreement not found: ${id}`);
    }

    const updated = await this.agreements.update(id, {
      startDate: newStartDate,
      endDate: newEndDate,
      renewalDate: newRenewalDate,
      status: 'active',
    } as Partial<ServiceAgreement>);

    this.events.emit('service.agreement.renewed', { agreement: updated });
    return updated;
  }

  /**
   * Cancel a service agreement.
   */
  async cancelAgreement(id: string): Promise<ServiceAgreement & CollectionMeta> {
    const existing = await this.agreements.get(id);
    if (!existing) {
      throw new Error(`Service agreement not found: ${id}`);
    }

    const updated = await this.agreements.update(id, {
      status: 'cancelled',
    } as Partial<ServiceAgreement>);

    return updated;
  }

  /**
   * Get a single agreement by ID.
   */
  async getAgreement(id: string): Promise<(ServiceAgreement & CollectionMeta) | null> {
    return this.agreements.get(id);
  }

  /**
   * List agreements with optional filters.
   */
  async listAgreements(filters?: {
    customerId?: string;
    status?: AgreementStatus;
    type?: AgreementType;
    entityId?: string;
  }): Promise<(ServiceAgreement & CollectionMeta)[]> {
    const q = this.agreements.query();

    if (filters?.customerId) {
      q.where('customerId', '=', filters.customerId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.type) {
      q.where('type', '=', filters.type);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Get agreements for a specific customer.
   */
  async getAgreementsByCustomer(
    customerId: string,
  ): Promise<(ServiceAgreement & CollectionMeta)[]> {
    return this.agreements
      .query()
      .where('customerId', '=', customerId)
      .orderBy('startDate', 'desc')
      .execute();
  }

  /**
   * Get agreements expiring within N days from today.
   */
  async getExpiringAgreements(
    daysAhead: number,
  ): Promise<(ServiceAgreement & CollectionMeta)[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const activeAgreements = await this.agreements
      .query()
      .where('status', '=', 'active')
      .execute();

    return activeAgreements.filter((a) => {
      if (!a.endDate) return false;
      return a.endDate >= todayStr && a.endDate <= futureDateStr;
    });
  }

  // ========================================================================
  // WORK ORDER CRUD
  // ========================================================================

  /**
   * Create a new work order.
   * Defaults: status='open', priority='medium', pricingType='tm',
   * billingStatus='unbilled', laborTotal=0, materialTotal=0, totalAmount=0, flatRateAmount=0.
   */
  async createWorkOrder(data: {
    agreementId?: string;
    customerId: string;
    number: string;
    type: WorkOrderType;
    status?: WorkOrderStatus;
    priority?: WorkOrderPriority;
    description?: string;
    assignedTo?: string;
    scheduledDate?: string;
    scheduledTimeSlot?: string;
    customerEquipmentId?: string;
    problemDescription?: string;
    pricingType?: PricingType;
    flatRateAmount?: number;
    entityId?: string;
  }): Promise<WorkOrder & CollectionMeta> {
    const record = await this.workOrders.insert({
      agreementId: data.agreementId,
      customerId: data.customerId,
      number: data.number,
      type: data.type,
      status: data.status ?? 'open',
      priority: data.priority ?? 'medium',
      description: data.description,
      assignedTo: data.assignedTo,
      scheduledDate: data.scheduledDate,
      scheduledTimeSlot: data.scheduledTimeSlot,
      customerEquipmentId: data.customerEquipmentId,
      problemDescription: data.problemDescription,
      laborTotal: 0,
      materialTotal: 0,
      totalAmount: 0,
      pricingType: data.pricingType ?? 'tm',
      flatRateAmount: data.flatRateAmount ?? 0,
      billingStatus: 'unbilled',
      entityId: data.entityId,
    } as WorkOrder);

    this.events.emit('service.wo.created', { workOrder: record });
    return record;
  }

  /**
   * Update an existing work order.
   */
  async updateWorkOrder(
    id: string,
    changes: Partial<WorkOrder>,
  ): Promise<WorkOrder & CollectionMeta> {
    const existing = await this.workOrders.get(id);
    if (!existing) {
      throw new Error(`Work order not found: ${id}`);
    }

    const updated = await this.workOrders.update(id, changes as Partial<WorkOrder>);
    return updated;
  }

  /**
   * Assign a work order to a technician.
   * Sets status to 'assigned'.
   */
  async assignWorkOrder(
    workOrderId: string,
    technicianId: string,
  ): Promise<WorkOrder & CollectionMeta> {
    const existing = await this.workOrders.get(workOrderId);
    if (!existing) {
      throw new Error(`Work order not found: ${workOrderId}`);
    }

    const updated = await this.workOrders.update(workOrderId, {
      assignedTo: technicianId,
      status: 'assigned',
    } as Partial<WorkOrder>);

    this.events.emit('service.wo.assigned', { workOrder: updated, technicianId });
    return updated;
  }

  /**
   * Complete a work order.
   * Sets status to 'completed' and completedDate.
   */
  async completeWorkOrder(
    workOrderId: string,
    resolution?: string,
  ): Promise<WorkOrder & CollectionMeta> {
    const existing = await this.workOrders.get(workOrderId);
    if (!existing) {
      throw new Error(`Work order not found: ${workOrderId}`);
    }

    const completedDate = new Date().toISOString().split('T')[0];
    const updates: Partial<WorkOrder> = {
      status: 'completed',
      completedDate,
    };
    if (resolution !== undefined) {
      updates.resolution = resolution;
    }

    const updated = await this.workOrders.update(workOrderId, updates as Partial<WorkOrder>);
    this.events.emit('service.wo.completed', { workOrder: updated });
    return updated;
  }

  /**
   * Cancel a work order.
   */
  async cancelWorkOrder(workOrderId: string): Promise<WorkOrder & CollectionMeta> {
    const existing = await this.workOrders.get(workOrderId);
    if (!existing) {
      throw new Error(`Work order not found: ${workOrderId}`);
    }

    const updated = await this.workOrders.update(workOrderId, {
      status: 'cancelled',
    } as Partial<WorkOrder>);

    return updated;
  }

  /**
   * Get a single work order by ID.
   */
  async getWorkOrder(id: string): Promise<(WorkOrder & CollectionMeta) | null> {
    return this.workOrders.get(id);
  }

  /**
   * List work orders with optional filters.
   */
  async listWorkOrders(filters?: {
    customerId?: string;
    status?: WorkOrderStatus;
    type?: WorkOrderType;
    priority?: WorkOrderPriority;
    assignedTo?: string;
    entityId?: string;
  }): Promise<(WorkOrder & CollectionMeta)[]> {
    const q = this.workOrders.query();

    if (filters?.customerId) {
      q.where('customerId', '=', filters.customerId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.type) {
      q.where('type', '=', filters.type);
    }
    if (filters?.priority) {
      q.where('priority', '=', filters.priority);
    }
    if (filters?.assignedTo) {
      q.where('assignedTo', '=', filters.assignedTo);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }

    q.orderBy('scheduledDate', 'desc');
    return q.execute();
  }

  /**
   * Get work orders for a specific customer.
   */
  async getWorkOrdersByCustomer(
    customerId: string,
  ): Promise<(WorkOrder & CollectionMeta)[]> {
    return this.workOrders
      .query()
      .where('customerId', '=', customerId)
      .orderBy('scheduledDate', 'desc')
      .execute();
  }

  /**
   * Get work orders assigned to a specific technician.
   */
  async getWorkOrdersByTechnician(
    technicianId: string,
  ): Promise<(WorkOrder & CollectionMeta)[]> {
    return this.workOrders
      .query()
      .where('assignedTo', '=', technicianId)
      .orderBy('scheduledDate', 'desc')
      .execute();
  }

  /**
   * Get work orders by status.
   */
  async getWorkOrdersByStatus(
    status: WorkOrderStatus,
  ): Promise<(WorkOrder & CollectionMeta)[]> {
    return this.workOrders
      .query()
      .where('status', '=', status)
      .orderBy('priority', 'desc')
      .execute();
  }

  // ========================================================================
  // WORK ORDER DISPATCH
  // ========================================================================

  /**
   * Dispatch a work order to a technician.
   * Sets assignedTo and status to 'assigned'.
   */
  async dispatch(
    workOrderId: string,
    technicianId: string,
  ): Promise<WorkOrder & CollectionMeta> {
    return this.assignWorkOrder(workOrderId, technicianId);
  }

  /**
   * Reschedule a work order.
   */
  async reschedule(
    workOrderId: string,
    newDate: string,
    newTimeSlot?: string,
  ): Promise<WorkOrder & CollectionMeta> {
    const existing = await this.workOrders.get(workOrderId);
    if (!existing) {
      throw new Error(`Work order not found: ${workOrderId}`);
    }

    const changes: Partial<WorkOrder> = {
      scheduledDate: newDate,
    };
    if (newTimeSlot !== undefined) {
      changes.scheduledTimeSlot = newTimeSlot;
    }

    const updated = await this.workOrders.update(workOrderId, changes as Partial<WorkOrder>);
    return updated;
  }

  // ========================================================================
  // WORK ORDER LINES
  // ========================================================================

  /**
   * Add a line item to a work order.
   * Recalculates labor/material/total amounts.
   */
  async addWorkOrderLine(data: {
    workOrderId: string;
    type: WorkOrderLineType;
    description?: string;
    quantity: number;
    unitPrice: number;
    technicianId?: string;
    partNumber?: string;
  }): Promise<WorkOrderLine & CollectionMeta> {
    const wo = await this.workOrders.get(data.workOrderId);
    if (!wo) {
      throw new Error(`Work order not found: ${data.workOrderId}`);
    }

    const amount = round2(data.quantity * data.unitPrice);

    const record = await this.workOrderLines.insert({
      workOrderId: data.workOrderId,
      type: data.type,
      description: data.description,
      quantity: data.quantity,
      unitPrice: round2(data.unitPrice),
      amount,
      technicianId: data.technicianId,
      partNumber: data.partNumber,
    } as WorkOrderLine);

    await this.recalculateWorkOrderTotals(data.workOrderId);

    return record;
  }

  /**
   * Update a work order line item.
   */
  async updateWorkOrderLine(
    lineId: string,
    changes: Partial<WorkOrderLine>,
  ): Promise<WorkOrderLine & CollectionMeta> {
    const existing = await this.workOrderLines.get(lineId);
    if (!existing) {
      throw new Error(`Work order line not found: ${lineId}`);
    }

    const quantity = changes.quantity !== undefined ? changes.quantity : existing.quantity;
    const unitPrice = changes.unitPrice !== undefined ? changes.unitPrice : existing.unitPrice;
    const amount = round2(quantity * unitPrice);

    const updated = await this.workOrderLines.update(lineId, {
      ...changes,
      amount,
    } as Partial<WorkOrderLine>);

    await this.recalculateWorkOrderTotals(existing.workOrderId);

    return updated;
  }

  /**
   * Remove a work order line item.
   */
  async removeWorkOrderLine(lineId: string): Promise<void> {
    const existing = await this.workOrderLines.get(lineId);
    if (!existing) {
      throw new Error(`Work order line not found: ${lineId}`);
    }

    const workOrderId = existing.workOrderId;
    await this.workOrderLines.remove(lineId);
    await this.recalculateWorkOrderTotals(workOrderId);
  }

  /**
   * Get all line items for a work order.
   */
  async getWorkOrderLines(
    workOrderId: string,
  ): Promise<(WorkOrderLine & CollectionMeta)[]> {
    return this.workOrderLines
      .query()
      .where('workOrderId', '=', workOrderId)
      .execute();
  }

  /**
   * Calculate the total for a work order from its line items.
   */
  async calculateWorkOrderTotal(workOrderId: string): Promise<{
    laborTotal: number;
    materialTotal: number;
    totalAmount: number;
  }> {
    const lines = await this.getWorkOrderLines(workOrderId);

    let laborTotal = 0;
    let materialTotal = 0;

    for (const line of lines) {
      if (line.type === 'labor') {
        laborTotal = round2(laborTotal + line.amount);
      } else if (line.type === 'material') {
        materialTotal = round2(materialTotal + line.amount);
      } else {
        materialTotal = round2(materialTotal + line.amount);
      }
    }

    const totalAmount = round2(laborTotal + materialTotal);
    return { laborTotal, materialTotal, totalAmount };
  }

  /**
   * Internal helper to recalculate work order totals from lines.
   */
  private async recalculateWorkOrderTotals(workOrderId: string): Promise<void> {
    const totals = await this.calculateWorkOrderTotal(workOrderId);
    await this.workOrders.update(workOrderId, {
      laborTotal: totals.laborTotal,
      materialTotal: totals.materialTotal,
      totalAmount: totals.totalAmount,
    } as Partial<WorkOrder>);
  }

  // ========================================================================
  // SERVICE CALLS
  // ========================================================================

  /**
   * Create a service call.
   * Defaults: status='new', priority='medium'.
   */
  async createCall(data: {
    customerId: string;
    workOrderId?: string;
    callDate: string;
    callType: ServiceCallType;
    priority?: WorkOrderPriority;
    description?: string;
    callerName?: string;
    callerPhone?: string;
  }): Promise<ServiceCall & CollectionMeta> {
    const record = await this.serviceCalls.insert({
      customerId: data.customerId,
      workOrderId: data.workOrderId,
      callDate: data.callDate,
      callType: data.callType,
      priority: data.priority ?? 'medium',
      description: data.description,
      callerName: data.callerName,
      callerPhone: data.callerPhone,
      status: 'new',
    } as ServiceCall);

    this.events.emit('service.call.created', { call: record });
    return record;
  }

  /**
   * Dispatch a service call.
   * Sets assignedTo, dispatchedAt, status='dispatched'.
   */
  async dispatchCall(
    callId: string,
    technicianId: string,
  ): Promise<ServiceCall & CollectionMeta> {
    const existing = await this.serviceCalls.get(callId);
    if (!existing) {
      throw new Error(`Service call not found: ${callId}`);
    }

    const dispatchedAt = new Date().toISOString().split('T')[0];
    const updated = await this.serviceCalls.update(callId, {
      assignedTo: technicianId,
      dispatchedAt,
      status: 'dispatched',
    } as Partial<ServiceCall>);

    this.events.emit('service.call.dispatched', { call: updated, technicianId });
    return updated;
  }

  /**
   * Resolve a service call.
   * Sets resolvedAt, status='resolved'.
   */
  async resolveCall(callId: string): Promise<ServiceCall & CollectionMeta> {
    const existing = await this.serviceCalls.get(callId);
    if (!existing) {
      throw new Error(`Service call not found: ${callId}`);
    }

    const resolvedAt = new Date().toISOString().split('T')[0];
    const updated = await this.serviceCalls.update(callId, {
      resolvedAt,
      status: 'resolved',
    } as Partial<ServiceCall>);

    return updated;
  }

  /**
   * List service calls with optional filters.
   */
  async listCalls(filters?: {
    customerId?: string;
    status?: ServiceCallStatus;
    callType?: ServiceCallType;
    priority?: WorkOrderPriority;
  }): Promise<(ServiceCall & CollectionMeta)[]> {
    const q = this.serviceCalls.query();

    if (filters?.customerId) {
      q.where('customerId', '=', filters.customerId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.callType) {
      q.where('callType', '=', filters.callType);
    }
    if (filters?.priority) {
      q.where('priority', '=', filters.priority);
    }

    q.orderBy('callDate', 'desc');
    return q.execute();
  }

  /**
   * Get calls for a specific customer.
   */
  async getCallsByCustomer(
    customerId: string,
  ): Promise<(ServiceCall & CollectionMeta)[]> {
    return this.serviceCalls
      .query()
      .where('customerId', '=', customerId)
      .orderBy('callDate', 'desc')
      .execute();
  }

  // ========================================================================
  // CUSTOMER EQUIPMENT
  // ========================================================================

  /**
   * Register new customer equipment.
   * Defaults: status='active'.
   */
  async registerEquipment(data: {
    customerId: string;
    name: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    installDate?: string;
    warrantyEndDate?: string;
    location?: string;
    status?: EquipmentStatus;
    notes?: string;
  }): Promise<CustomerEquipment & CollectionMeta> {
    const record = await this.customerEquipment.insert({
      customerId: data.customerId,
      name: data.name,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      installDate: data.installDate,
      warrantyEndDate: data.warrantyEndDate,
      location: data.location,
      status: data.status ?? 'active',
      notes: data.notes,
    } as CustomerEquipment);

    this.events.emit('service.equipment.registered', { equipment: record });
    return record;
  }

  /**
   * Update customer equipment.
   */
  async updateEquipment(
    id: string,
    changes: Partial<CustomerEquipment>,
  ): Promise<CustomerEquipment & CollectionMeta> {
    const existing = await this.customerEquipment.get(id);
    if (!existing) {
      throw new Error(`Customer equipment not found: ${id}`);
    }

    const updated = await this.customerEquipment.update(id, changes as Partial<CustomerEquipment>);
    return updated;
  }

  /**
   * Retire customer equipment. Sets status='retired'.
   */
  async retireEquipment(id: string): Promise<CustomerEquipment & CollectionMeta> {
    const existing = await this.customerEquipment.get(id);
    if (!existing) {
      throw new Error(`Customer equipment not found: ${id}`);
    }

    const updated = await this.customerEquipment.update(id, {
      status: 'retired',
    } as Partial<CustomerEquipment>);
    return updated;
  }

  /**
   * List equipment for a specific customer.
   */
  async listEquipmentByCustomer(
    customerId: string,
  ): Promise<(CustomerEquipment & CollectionMeta)[]> {
    return this.customerEquipment
      .query()
      .where('customerId', '=', customerId)
      .orderBy('name', 'asc')
      .execute();
  }

  /**
   * Get equipment by ID.
   */
  async getEquipment(id: string): Promise<(CustomerEquipment & CollectionMeta) | null> {
    return this.customerEquipment.get(id);
  }

  /**
   * Get service history for a piece of equipment.
   * Returns work orders that reference this equipment.
   */
  async getEquipmentServiceHistory(
    equipmentId: string,
  ): Promise<(WorkOrder & CollectionMeta)[]> {
    return this.workOrders
      .query()
      .where('customerEquipmentId', '=', equipmentId)
      .orderBy('scheduledDate', 'desc')
      .execute();
  }

  // ========================================================================
  // PREVENTIVE MAINTENANCE SCHEDULING
  // ========================================================================

  /**
   * Create a PM schedule.
   * Defaults: status='active'.
   */
  async createPMSchedule(data: {
    customerEquipmentId: string;
    agreementId?: string;
    name: string;
    frequency: PMFrequency;
    lastPerformed?: string;
    nextDue?: string;
    checklist?: string;
    estimatedDuration?: number;
    assignedTo?: string;
    status?: PMStatus;
  }): Promise<PreventiveMaintenance & CollectionMeta> {
    const record = await this.preventiveMaintenances.insert({
      customerEquipmentId: data.customerEquipmentId,
      agreementId: data.agreementId,
      name: data.name,
      frequency: data.frequency,
      lastPerformed: data.lastPerformed,
      nextDue: data.nextDue,
      checklist: data.checklist,
      estimatedDuration: data.estimatedDuration,
      assignedTo: data.assignedTo,
      status: data.status ?? 'active',
    } as PreventiveMaintenance);

    return record;
  }

  /**
   * Update a PM schedule.
   */
  async updatePMSchedule(
    id: string,
    changes: Partial<PreventiveMaintenance>,
  ): Promise<PreventiveMaintenance & CollectionMeta> {
    const existing = await this.preventiveMaintenances.get(id);
    if (!existing) {
      throw new Error(`Preventive maintenance schedule not found: ${id}`);
    }

    const updated = await this.preventiveMaintenances.update(id, changes as Partial<PreventiveMaintenance>);
    return updated;
  }

  /**
   * Get upcoming PM tasks due within N days.
   */
  async getUpcomingPM(
    daysAhead: number,
  ): Promise<(PreventiveMaintenance & CollectionMeta)[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const activePMs = await this.preventiveMaintenances
      .query()
      .where('status', '=', 'active')
      .execute();

    return activePMs.filter((pm) => {
      if (!pm.nextDue) return false;
      return pm.nextDue >= todayStr && pm.nextDue <= futureDateStr;
    });
  }

  /**
   * Mark a PM as completed.
   * Sets lastPerformed to today and calculates nextDue based on frequency.
   */
  async markPMCompleted(id: string): Promise<PreventiveMaintenance & CollectionMeta> {
    const existing = await this.preventiveMaintenances.get(id);
    if (!existing) {
      throw new Error(`Preventive maintenance schedule not found: ${id}`);
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const nextDue = this.calculateNextDue(today, existing.frequency);

    const updated = await this.preventiveMaintenances.update(id, {
      lastPerformed: todayStr,
      nextDue,
    } as Partial<PreventiveMaintenance>);

    this.events.emit('service.pm.completed', { pm: updated });
    return updated;
  }

  /**
   * Generate a work order from a PM schedule.
   */
  async generateWorkOrderFromPM(
    pmId: string,
    workOrderNumber: string,
  ): Promise<WorkOrder & CollectionMeta> {
    const pm = await this.preventiveMaintenances.get(pmId);
    if (!pm) {
      throw new Error(`Preventive maintenance schedule not found: ${pmId}`);
    }

    const equipment = await this.customerEquipment.get(pm.customerEquipmentId);
    if (!equipment) {
      throw new Error(`Customer equipment not found: ${pm.customerEquipmentId}`);
    }

    const wo = await this.createWorkOrder({
      customerId: equipment.customerId,
      number: workOrderNumber,
      type: 'scheduled',
      description: `PM: ${pm.name}`,
      assignedTo: pm.assignedTo,
      scheduledDate: pm.nextDue ?? new Date().toISOString().split('T')[0],
      customerEquipmentId: pm.customerEquipmentId,
      problemDescription: pm.checklist ?? pm.name,
    });

    return wo;
  }

  /**
   * Calculate next due date based on frequency.
   */
  private calculateNextDue(fromDate: Date, frequency: PMFrequency): string {
    const next = new Date(fromDate);
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'semi_annual':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'annual':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next.toISOString().split('T')[0];
  }

  // ========================================================================
  // TECHNICIAN TIME TRACKING
  // ========================================================================

  /**
   * Log time for a technician on a work order.
   * Auto-calculates amount = hours * hourlyRate.
   */
  async logTime(data: {
    workOrderId: string;
    technicianId: string;
    date: string;
    startTime?: string;
    endTime?: string;
    hours: number;
    hourlyRate?: number;
    travelTime?: number;
    description?: string;
  }): Promise<TechnicianTimeEntry & CollectionMeta> {
    const wo = await this.workOrders.get(data.workOrderId);
    if (!wo) {
      throw new Error(`Work order not found: ${data.workOrderId}`);
    }

    const hourlyRate = data.hourlyRate ?? 0;
    const amount = round2(data.hours * hourlyRate);

    const record = await this.technicianTimeEntries.insert({
      workOrderId: data.workOrderId,
      technicianId: data.technicianId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      hours: data.hours,
      hourlyRate,
      amount,
      travelTime: data.travelTime ?? 0,
      description: data.description,
    } as TechnicianTimeEntry);

    return record;
  }

  /**
   * Get time entries for a work order.
   */
  async getTimeByWorkOrder(
    workOrderId: string,
  ): Promise<(TechnicianTimeEntry & CollectionMeta)[]> {
    return this.technicianTimeEntries
      .query()
      .where('workOrderId', '=', workOrderId)
      .orderBy('date', 'desc')
      .execute();
  }

  /**
   * Get time entries for a technician within a date range.
   */
  async getTimeByTechnician(
    technicianId: string,
    dateRange?: { start: string; end: string },
  ): Promise<(TechnicianTimeEntry & CollectionMeta)[]> {
    const allEntries = await this.technicianTimeEntries
      .query()
      .where('technicianId', '=', technicianId)
      .orderBy('date', 'desc')
      .execute();

    if (!dateRange) return allEntries;

    return allEntries.filter(
      (e) => e.date >= dateRange.start && e.date <= dateRange.end,
    );
  }

  // ========================================================================
  // BILLING
  // ========================================================================

  /**
   * Mark a work order for billing.
   * Sets billingStatus to 'billed'.
   */
  async markForBilling(
    workOrderId: string,
  ): Promise<WorkOrder & CollectionMeta> {
    const existing = await this.workOrders.get(workOrderId);
    if (!existing) {
      throw new Error(`Work order not found: ${workOrderId}`);
    }

    if (existing.status !== 'completed') {
      throw new Error(`Work order must be completed before billing. Current status: ${existing.status}`);
    }

    const updated = await this.workOrders.update(workOrderId, {
      billingStatus: 'billed',
      status: 'invoiced',
    } as Partial<WorkOrder>);

    this.events.emit('service.wo.invoiced', { workOrder: updated });
    return updated;
  }

  /**
   * Get all billable (completed, unbilled) work orders.
   */
  async getBillableWorkOrders(): Promise<(WorkOrder & CollectionMeta)[]> {
    return this.workOrders
      .query()
      .where('status', '=', 'completed')
      .where('billingStatus', '=', 'unbilled')
      .execute();
  }

  /**
   * Get total unbilled amount across all completed work orders.
   */
  async getUnbilledTotal(): Promise<number> {
    const billable = await this.getBillableWorkOrders();
    return round2(billable.reduce((sum, wo) => sum + wo.totalAmount, 0));
  }

  // ========================================================================
  // PROFITABILITY
  // ========================================================================

  /**
   * Get service profitability analysis.
   * If agreementId is provided, returns profitability for that agreement.
   * Otherwise returns overall profitability.
   */
  async getServiceProfitability(
    agreementId?: string,
  ): Promise<ServiceProfitability> {
    let workOrders: (WorkOrder & CollectionMeta)[];

    if (agreementId) {
      workOrders = await this.workOrders
        .query()
        .where('agreementId', '=', agreementId)
        .execute();
    } else {
      workOrders = await this.workOrders.query().execute();
    }

    let revenue = 0;
    let laborCost = 0;
    let materialCost = 0;

    for (const wo of workOrders) {
      revenue = round2(revenue + wo.totalAmount);
      laborCost = round2(laborCost + wo.laborTotal);
      materialCost = round2(materialCost + wo.materialTotal);
    }

    // If agreement, add recurring revenue
    if (agreementId) {
      const agreement = await this.agreements.get(agreementId);
      if (agreement) {
        revenue = round2(revenue + agreement.recurringAmount);
      }
    }

    const profit = round2(revenue - laborCost - materialCost);
    const margin = revenue > 0 ? round2((profit / revenue) * 100) : 0;

    let agreementName: string | undefined;
    if (agreementId) {
      const agreement = await this.agreements.get(agreementId);
      if (agreement) {
        agreementName = agreement.name;
      }
    }

    return {
      agreementId,
      agreementName,
      revenue,
      laborCost,
      materialCost,
      profit,
      margin,
    };
  }

  // ========================================================================
  // CUSTOMER SERVICE HISTORY
  // ========================================================================

  /**
   * Get comprehensive service history for a customer.
   * Combines work orders, service calls, and equipment events.
   */
  async getCustomerServiceHistory(
    customerId: string,
  ): Promise<CustomerServiceHistoryEntry[]> {
    const entries: CustomerServiceHistoryEntry[] = [];

    // Work orders
    const wos = await this.workOrders
      .query()
      .where('customerId', '=', customerId)
      .execute();

    for (const wo of wos) {
      entries.push({
        type: 'workOrder',
        date: wo.scheduledDate ?? wo.createdAt,
        description: `WO #${wo.number}: ${wo.description ?? wo.problemDescription ?? wo.type}`,
        id: wo.id,
        status: wo.status,
      });
    }

    // Service calls
    const calls = await this.serviceCalls
      .query()
      .where('customerId', '=', customerId)
      .execute();

    for (const call of calls) {
      entries.push({
        type: 'call',
        date: call.callDate,
        description: `${call.callType} call: ${call.description ?? 'No description'}`,
        id: call.id,
        status: call.status,
      });
    }

    // Equipment events
    const equipment = await this.customerEquipment
      .query()
      .where('customerId', '=', customerId)
      .execute();

    for (const eq of equipment) {
      entries.push({
        type: 'equipment',
        date: eq.installDate ?? eq.createdAt,
        description: `Equipment: ${eq.name} (${eq.manufacturer ?? ''} ${eq.model ?? ''})`.trim(),
        id: eq.id,
        status: eq.status,
      });
    }

    // Sort by date descending
    entries.sort((a, b) => {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
    });

    return entries;
  }
}
