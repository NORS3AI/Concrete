/**
 * Concrete -- Mobile & Field Operations Service (Phase 26)
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

export type TimeEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type DailyLogStatus = 'draft' | 'submitted' | 'approved';
export type SyncStatus = 'pending' | 'synced' | 'conflict' | 'failed';
export type InspectionCheckStatus = 'pass' | 'fail' | 'na' | 'pending';

export interface MobileTimeEntry { [key: string]: unknown; employeeId: string; employeeName?: string; jobId: string; jobName?: string; costCode?: string; date: string; hours: number; overtime?: number; status: TimeEntryStatus; gpsLat?: number; gpsLon?: number; notes?: string; syncStatus: SyncStatus; deviceId?: string; }
export interface DailyLog { [key: string]: unknown; jobId: string; jobName?: string; date: string; createdBy: string; weather?: string; temperature?: string; windSpeed?: string; crewCount: number; visitors?: string; workPerformed: string; materials?: string; equipment?: string; delays?: string; safetyNotes?: string; photos?: string; status: DailyLogStatus; syncStatus: SyncStatus; }
export interface MobileInspection { [key: string]: unknown; templateName: string; jobId: string; jobName?: string; inspectorId: string; inspectorName?: string; date: string; itemsTotal: number; itemsPassed: number; itemsFailed: number; overallStatus: InspectionCheckStatus; findings?: string; photos?: string; syncStatus: SyncStatus; }
export interface MaterialReceipt { [key: string]: unknown; jobId: string; jobName?: string; itemId?: string; itemDescription: string; quantity: number; unit: string; receivedBy: string; date: string; poNumber?: string; deliveryTicket?: string; photos?: string; signature?: string; syncStatus: SyncStatus; notes?: string; }
export interface EquipmentLog { [key: string]: unknown; equipmentId: string; equipmentName?: string; jobId: string; date: string; hoursUsed: number; meterReading?: number; operatorId?: string; operatorName?: string; fuelAdded?: number; condition?: string; syncStatus: SyncStatus; notes?: string; }
export interface CrewTimeEntry { [key: string]: unknown; foremanId: string; foremanName?: string; jobId: string; jobName?: string; costCode?: string; date: string; crewMembers: string; crewSize: number; totalHours: number; status: TimeEntryStatus; syncStatus: SyncStatus; notes?: string; }
export interface FieldWorkOrder { [key: string]: unknown; workOrderId: string; jobId: string; jobName?: string; assignedTo: string; description: string; status: 'assigned' | 'in_progress' | 'completed' | 'cancelled'; startedDate?: string; completedDate?: string; laborHours?: number; materialsUsed?: string; signature?: string; photos?: string; syncStatus: SyncStatus; notes?: string; }
export interface OfflineQueueItem { [key: string]: unknown; action: string; collection: string; recordId?: string; payload: string; createdAt: string; syncStatus: SyncStatus; retryCount: number; lastError?: string; }
export interface PushNotification { [key: string]: unknown; recipientId: string; type: 'approval' | 'alert' | 'assignment' | 'reminder'; title: string; body: string; sentAt: string; readAt?: string; actionUrl?: string; read: boolean; }
export interface QRScanRecord { [key: string]: unknown; scannedBy: string; scannedAt: string; qrData: string; entityType: 'equipment' | 'material' | 'location'; entityId?: string; jobId?: string; action: string; notes?: string; }
export interface DigitalSignature { [key: string]: unknown; documentType: string; documentId: string; signerName: string; signerRole?: string; signedAt: string; signatureData?: string; jobId?: string; notes?: string; }

const round2 = (n: number): number => Math.round(n * 100) / 100;
function currentDate(): string { return new Date().toISOString().split('T')[0]; }
function currentTimestamp(): string { return new Date().toISOString(); }

export class MobileService {
  constructor(
    private timeEntries: Collection<MobileTimeEntry>, private dailyLogs: Collection<DailyLog>,
    private inspections: Collection<MobileInspection>, private receipts: Collection<MaterialReceipt>,
    private equipmentLogs: Collection<EquipmentLog>, private crewEntries: Collection<CrewTimeEntry>,
    private fieldWorkOrders: Collection<FieldWorkOrder>, private offlineQueue: Collection<OfflineQueueItem>,
    private notifications: Collection<PushNotification>, private qrScans: Collection<QRScanRecord>,
    private signatures: Collection<DigitalSignature>, private events: EventBus,
  ) {}

  // Time Entry
  async submitTimeEntry(data: { employeeId: string; employeeName?: string; jobId: string; jobName?: string; costCode?: string; date: string; hours: number; overtime?: number; gpsLat?: number; gpsLon?: number; notes?: string; deviceId?: string }): Promise<MobileTimeEntry & CollectionMeta> {
    const t = await this.timeEntries.insert({ ...data, employeeName: data.employeeName ?? '', jobName: data.jobName ?? '', costCode: data.costCode ?? '', hours: round2(data.hours), overtime: round2(data.overtime ?? 0), status: 'submitted' as TimeEntryStatus, notes: data.notes ?? '', syncStatus: 'pending' as SyncStatus, deviceId: data.deviceId ?? '' });
    this.events.emit('mobile.time.submitted', { entry: t }); return t;
  }
  async approveTimeEntry(id: string): Promise<MobileTimeEntry & CollectionMeta> { const e = await this.timeEntries.get(id); if (!e) throw new Error(`Time entry ${id} not found`); return this.timeEntries.update(id, { status: 'approved' as TimeEntryStatus }); }
  async rejectTimeEntry(id: string): Promise<MobileTimeEntry & CollectionMeta> { const e = await this.timeEntries.get(id); if (!e) throw new Error(`Time entry ${id} not found`); return this.timeEntries.update(id, { status: 'rejected' as TimeEntryStatus }); }
  async listTimeEntries(filters?: { employeeId?: string; jobId?: string; status?: TimeEntryStatus; date?: string }): Promise<(MobileTimeEntry & CollectionMeta)[]> { const q = this.timeEntries.query(); if (filters?.employeeId) q.where('employeeId', '=', filters.employeeId); if (filters?.jobId) q.where('jobId', '=', filters.jobId); if (filters?.status) q.where('status', '=', filters.status); if (filters?.date) q.where('date', '=', filters.date); q.orderBy('date', 'desc'); return q.execute(); }

  // Daily Log
  async submitDailyLog(data: { jobId: string; jobName?: string; date: string; createdBy: string; weather?: string; temperature?: string; crewCount: number; workPerformed: string; materials?: string; equipment?: string; delays?: string; safetyNotes?: string; photos?: string }): Promise<DailyLog & CollectionMeta> {
    const l = await this.dailyLogs.insert({ ...data, jobName: data.jobName ?? '', weather: data.weather ?? '', temperature: data.temperature ?? '', windSpeed: '', visitors: '', materials: data.materials ?? '', equipment: data.equipment ?? '', delays: data.delays ?? '', safetyNotes: data.safetyNotes ?? '', photos: data.photos ?? '', status: 'submitted' as DailyLogStatus, syncStatus: 'pending' as SyncStatus });
    this.events.emit('mobile.dailyLog.submitted', { log: l }); return l;
  }
  async approveDailyLog(id: string): Promise<DailyLog & CollectionMeta> { const e = await this.dailyLogs.get(id); if (!e) throw new Error(`Daily log ${id} not found`); return this.dailyLogs.update(id, { status: 'approved' as DailyLogStatus }); }
  async listDailyLogs(filters?: { jobId?: string; status?: DailyLogStatus }): Promise<(DailyLog & CollectionMeta)[]> { const q = this.dailyLogs.query(); if (filters?.jobId) q.where('jobId', '=', filters.jobId); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('date', 'desc'); return q.execute(); }

  // Mobile Inspections
  async submitInspection(data: { templateName: string; jobId: string; jobName?: string; inspectorId: string; inspectorName?: string; itemsTotal: number; itemsPassed: number; itemsFailed: number; findings?: string; photos?: string }): Promise<MobileInspection & CollectionMeta> {
    const overall: InspectionCheckStatus = data.itemsFailed > 0 ? 'fail' : 'pass';
    const i = await this.inspections.insert({ ...data, jobName: data.jobName ?? '', inspectorName: data.inspectorName ?? '', date: currentDate(), overallStatus: overall, findings: data.findings ?? '', photos: data.photos ?? '', syncStatus: 'pending' as SyncStatus });
    this.events.emit('mobile.inspection.submitted', { inspection: i }); return i;
  }
  async listInspections(filters?: { jobId?: string }): Promise<(MobileInspection & CollectionMeta)[]> { const q = this.inspections.query(); if (filters?.jobId) q.where('jobId', '=', filters.jobId); q.orderBy('date', 'desc'); return q.execute(); }

  // Material Receipts
  async recordReceipt(data: { jobId: string; jobName?: string; itemDescription: string; quantity: number; unit: string; receivedBy: string; poNumber?: string; deliveryTicket?: string; signature?: string; notes?: string }): Promise<MaterialReceipt & CollectionMeta> {
    const r = await this.receipts.insert({ ...data, jobName: data.jobName ?? '', quantity: round2(data.quantity), date: currentDate(), poNumber: data.poNumber ?? '', deliveryTicket: data.deliveryTicket ?? '', photos: '', signature: data.signature ?? '', syncStatus: 'pending' as SyncStatus, notes: data.notes ?? '' });
    this.events.emit('mobile.receipt.recorded', { receipt: r }); return r;
  }
  async listReceipts(filters?: { jobId?: string }): Promise<(MaterialReceipt & CollectionMeta)[]> { const q = this.receipts.query(); if (filters?.jobId) q.where('jobId', '=', filters.jobId); q.orderBy('date', 'desc'); return q.execute(); }

  // Equipment Hours
  async logEquipmentHours(data: { equipmentId: string; equipmentName?: string; jobId: string; hoursUsed: number; meterReading?: number; operatorId?: string; operatorName?: string; fuelAdded?: number; condition?: string; notes?: string }): Promise<EquipmentLog & CollectionMeta> {
    const l = await this.equipmentLogs.insert({ ...data, equipmentName: data.equipmentName ?? '', date: currentDate(), hoursUsed: round2(data.hoursUsed), operatorId: data.operatorId ?? '', operatorName: data.operatorName ?? '', fuelAdded: round2(data.fuelAdded ?? 0), condition: data.condition ?? '', syncStatus: 'pending' as SyncStatus, notes: data.notes ?? '' });
    this.events.emit('mobile.equipment.logged', { log: l }); return l;
  }
  async listEquipmentLogs(filters?: { equipmentId?: string; jobId?: string }): Promise<(EquipmentLog & CollectionMeta)[]> { const q = this.equipmentLogs.query(); if (filters?.equipmentId) q.where('equipmentId', '=', filters.equipmentId); if (filters?.jobId) q.where('jobId', '=', filters.jobId); q.orderBy('date', 'desc'); return q.execute(); }

  // Crew Time
  async submitCrewTime(data: { foremanId: string; foremanName?: string; jobId: string; jobName?: string; costCode?: string; date: string; crewMembers: string; crewSize: number; totalHours: number; notes?: string }): Promise<CrewTimeEntry & CollectionMeta> {
    const c = await this.crewEntries.insert({ ...data, foremanName: data.foremanName ?? '', jobName: data.jobName ?? '', costCode: data.costCode ?? '', totalHours: round2(data.totalHours), status: 'submitted' as TimeEntryStatus, syncStatus: 'pending' as SyncStatus, notes: data.notes ?? '' });
    this.events.emit('mobile.crewTime.submitted', { entry: c }); return c;
  }
  async approveCrewTime(id: string): Promise<CrewTimeEntry & CollectionMeta> { const e = await this.crewEntries.get(id); if (!e) throw new Error(`Crew entry ${id} not found`); return this.crewEntries.update(id, { status: 'approved' as TimeEntryStatus }); }
  async listCrewEntries(filters?: { foremanId?: string; jobId?: string; status?: TimeEntryStatus }): Promise<(CrewTimeEntry & CollectionMeta)[]> { const q = this.crewEntries.query(); if (filters?.foremanId) q.where('foremanId', '=', filters.foremanId); if (filters?.jobId) q.where('jobId', '=', filters.jobId); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('date', 'desc'); return q.execute(); }

  // Field Work Orders
  async startWorkOrder(id: string): Promise<FieldWorkOrder & CollectionMeta> { const e = await this.fieldWorkOrders.get(id); if (!e) throw new Error(`WO ${id} not found`); return this.fieldWorkOrders.update(id, { status: 'in_progress' as const, startedDate: currentDate() }); }
  async completeWorkOrder(id: string, laborHours: number, materialsUsed?: string, signature?: string): Promise<FieldWorkOrder & CollectionMeta> { const e = await this.fieldWorkOrders.get(id); if (!e) throw new Error(`WO ${id} not found`); return this.fieldWorkOrders.update(id, { status: 'completed' as const, completedDate: currentDate(), laborHours: round2(laborHours), materialsUsed: materialsUsed ?? '', signature: signature ?? '' }); }
  async createFieldWorkOrder(data: { workOrderId: string; jobId: string; jobName?: string; assignedTo: string; description: string; notes?: string }): Promise<FieldWorkOrder & CollectionMeta> {
    const w = await this.fieldWorkOrders.insert({ ...data, jobName: data.jobName ?? '', status: 'assigned' as const, syncStatus: 'pending' as SyncStatus, notes: data.notes ?? '' });
    this.events.emit('mobile.workOrder.created', { workOrder: w }); return w;
  }
  async listFieldWorkOrders(filters?: { jobId?: string; assignedTo?: string; status?: string }): Promise<(FieldWorkOrder & CollectionMeta)[]> { const q = this.fieldWorkOrders.query(); if (filters?.jobId) q.where('jobId', '=', filters.jobId); if (filters?.assignedTo) q.where('assignedTo', '=', filters.assignedTo); if (filters?.status) q.where('status', '=', filters.status); q.orderBy('workOrderId', 'desc'); return q.execute(); }

  // Offline Queue
  async addToQueue(data: { action: string; collection: string; recordId?: string; payload: string }): Promise<OfflineQueueItem & CollectionMeta> {
    return this.offlineQueue.insert({ ...data, recordId: data.recordId ?? '', createdAt: currentTimestamp(), syncStatus: 'pending' as SyncStatus, retryCount: 0 });
  }
  async getQueueItems(): Promise<(OfflineQueueItem & CollectionMeta)[]> { return this.offlineQueue.query().orderBy('createdAt', 'asc').execute(); }
  async markSynced(id: string): Promise<void> { await this.offlineQueue.update(id, { syncStatus: 'synced' as SyncStatus }); }

  // Push Notifications
  async sendNotification(data: { recipientId: string; type: PushNotification['type']; title: string; body: string; actionUrl?: string }): Promise<PushNotification & CollectionMeta> {
    const n = await this.notifications.insert({ ...data, sentAt: currentTimestamp(), read: false, actionUrl: data.actionUrl ?? '' });
    this.events.emit('mobile.notification.sent', { notification: n }); return n;
  }
  async markRead(id: string): Promise<void> { await this.notifications.update(id, { read: true, readAt: currentTimestamp() }); }
  async listNotifications(recipientId: string): Promise<(PushNotification & CollectionMeta)[]> { const q = this.notifications.query(); q.where('recipientId', '=', recipientId); q.orderBy('sentAt', 'desc'); return q.execute(); }
  async getUnreadCount(recipientId: string): Promise<number> { const all = await this.listNotifications(recipientId); return all.filter(n => !n.read).length; }

  // QR Scanning
  async recordScan(data: { scannedBy: string; qrData: string; entityType: QRScanRecord['entityType']; entityId?: string; jobId?: string; action: string; notes?: string }): Promise<QRScanRecord & CollectionMeta> {
    return this.qrScans.insert({ ...data, scannedAt: currentTimestamp(), entityId: data.entityId ?? '', jobId: data.jobId ?? '', notes: data.notes ?? '' });
  }
  async listScans(filters?: { entityType?: string; jobId?: string }): Promise<(QRScanRecord & CollectionMeta)[]> { const q = this.qrScans.query(); if (filters?.entityType) q.where('entityType', '=', filters.entityType); if (filters?.jobId) q.where('jobId', '=', filters.jobId); q.orderBy('scannedAt', 'desc'); return q.execute(); }

  // Digital Signatures
  async captureSignature(data: { documentType: string; documentId: string; signerName: string; signerRole?: string; signatureData?: string; jobId?: string; notes?: string }): Promise<DigitalSignature & CollectionMeta> {
    return this.signatures.insert({ ...data, signedAt: currentTimestamp(), signerRole: data.signerRole ?? '', signatureData: data.signatureData ?? '', jobId: data.jobId ?? '', notes: data.notes ?? '' });
  }
  async listSignatures(documentId?: string): Promise<(DigitalSignature & CollectionMeta)[]> { const q = this.signatures.query(); if (documentId) q.where('documentId', '=', documentId); q.orderBy('signedAt', 'desc'); return q.execute(); }
}
