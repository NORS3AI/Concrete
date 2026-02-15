import { MobileService } from './mobile-service';
import type { MobileTimeEntry, DailyLog, MobileInspection, MaterialReceipt, EquipmentLog, CrewTimeEntry, FieldWorkOrder, OfflineQueueItem, PushNotification, QRScanRecord, DigitalSignature } from './mobile-service';
let _service: MobileService | null = null;
export function getMobileService(): MobileService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('Mobile: app not initialized');
  const s = app.store; const e = app.events;
  _service = new MobileService(s.collection<MobileTimeEntry>('mobile/timeEntry'), s.collection<DailyLog>('mobile/dailyLog'), s.collection<MobileInspection>('mobile/inspection'), s.collection<MaterialReceipt>('mobile/receipt'), s.collection<EquipmentLog>('mobile/equipmentLog'), s.collection<CrewTimeEntry>('mobile/crewEntry'), s.collection<FieldWorkOrder>('mobile/fieldWO'), s.collection<OfflineQueueItem>('mobile/offlineQueue'), s.collection<PushNotification>('mobile/notification'), s.collection<QRScanRecord>('mobile/qrScan'), s.collection<DigitalSignature>('mobile/signature'), e);
  return _service;
}
