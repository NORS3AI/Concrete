import { IntegrationService } from './integration-service';
import type { APIEndpoint, APIKey, WebhookConfig, WebhookLog, IntegrationConfig, IntegrationMapping, SyncLog, EmailIntegration, CalendarEvent, FlatFileConfig, FlatFileLog } from './integration-service';
let _service: IntegrationService | null = null;
export function getIntegrationService(): IntegrationService {
  if (_service) return _service;
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) throw new Error('Integration: app not initialized');
  const s = app.store; const e = app.events;
  _service = new IntegrationService(s.collection<APIEndpoint>('integ/endpoint'), s.collection<APIKey>('integ/apiKey'), s.collection<WebhookConfig>('integ/webhookConfig'), s.collection<WebhookLog>('integ/webhookLog'), s.collection<IntegrationConfig>('integ/integration'), s.collection<IntegrationMapping>('integ/mapping'), s.collection<SyncLog>('integ/syncLog'), s.collection<EmailIntegration>('integ/email'), s.collection<CalendarEvent>('integ/calendarEvent'), s.collection<FlatFileConfig>('integ/flatFileConfig'), s.collection<FlatFileLog>('integ/flatFileLog'), e);
  return _service;
}
