/**
 * Concrete -- Integration Hub Service (Phase 31)
 */
import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';
export type WebhookEvent = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'sync';
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';
export type IntegrationProvider = 'procore' | 'plangrid' | 'bluebeam' | 'hcss' | 'raken' | 'buildertrend' | 'quickbooks' | 'adp' | 'paychex' | 'plaid' | 'zapier' | 'make' | 'email' | 'calendar' | 'sftp' | 'custom';

export interface APIEndpoint { [key: string]: unknown; path: string; method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; description: string; version: string; authRequired: boolean; rateLimit: number; ratePeriod: string; requestSchema?: string; responseSchema?: string; active: boolean; }
export interface APIKey { [key: string]: unknown; keyId: string; name: string; clientId: string; hashedKey: string; scopes: string; expiresAt?: string; lastUsedAt?: string; requestCount: number; active: boolean; createdBy: string; createdDate: string; }
export interface WebhookConfig { [key: string]: unknown; webhookId: string; name: string; url: string; events: string; secret?: string; active: boolean; retryCount: number; lastTriggeredAt?: string; lastStatus?: number; failureCount: number; createdDate: string; }
export interface WebhookLog { [key: string]: unknown; webhookId: string; event: string; payload: string; responseStatus: number; responseBody?: string; sentAt: string; duration: number; success: boolean; retryAttempt: number; }
export interface IntegrationConfig { [key: string]: unknown; integrationId: string; provider: IntegrationProvider; name: string; status: IntegrationStatus; direction: SyncDirection; apiUrl?: string; apiKey?: string; clientId?: string; clientSecret?: string; refreshToken?: string; settings: string; lastSyncAt?: string; syncInterval?: number; errorMessage?: string; createdDate: string; }
export interface IntegrationMapping { [key: string]: unknown; integrationId: string; localCollection: string; localField: string; remoteEntity: string; remoteField: string; transformRule?: string; direction: SyncDirection; active: boolean; }
export interface SyncLog { [key: string]: unknown; integrationId: string; provider: IntegrationProvider; direction: SyncDirection; startedAt: string; completedAt?: string; recordsSynced: number; recordsFailed: number; errors?: string; status: 'running' | 'completed' | 'failed'; }
export interface EmailIntegration { [key: string]: unknown; emailId: string; from: string; subject: string; receivedAt: string; processedAt?: string; attachments: string; documentType?: string; matchedVendor?: string; status: 'pending' | 'processed' | 'rejected' | 'manual_review'; notes?: string; }
export interface CalendarEvent { [key: string]: unknown; eventId: string; title: string; description?: string; startDate: string; endDate: string; allDay: boolean; projectId?: string; projectName?: string; milestoneType?: string; calendarProvider: 'google' | 'outlook' | 'ical'; externalId?: string; synced: boolean; lastSyncAt?: string; }
export interface FlatFileConfig { [key: string]: unknown; configId: string; name: string; protocol: 'sftp' | 'ftp' | 's3'; host: string; port: number; path: string; filePattern: string; dataType: string; schedule?: string; lastProcessedAt?: string; filesProcessed: number; active: boolean; }
export interface FlatFileLog { [key: string]: unknown; configId: string; fileName: string; fileSize: number; receivedAt: string; processedAt?: string; recordsImported: number; recordsFailed: number; status: 'pending' | 'processing' | 'completed' | 'failed'; errorMessage?: string; }

function currentTimestamp(): string { return new Date().toISOString(); }
function currentDate(): string { return new Date().toISOString().split('T')[0]; }

export class IntegrationService {
  constructor(
    private endpoints: Collection<APIEndpoint>, private apiKeys: Collection<APIKey>,
    private webhookConfigs: Collection<WebhookConfig>, private webhookLogs: Collection<WebhookLog>,
    private integrations: Collection<IntegrationConfig>, private mappings: Collection<IntegrationMapping>,
    private syncLogs: Collection<SyncLog>, private emails: Collection<EmailIntegration>,
    private calendarEvents: Collection<CalendarEvent>, private flatFileConfigs: Collection<FlatFileConfig>,
    private flatFileLogs: Collection<FlatFileLog>, private events: EventBus,
  ) {}

  // API Endpoints
  async registerEndpoint(data: { path: string; method: APIEndpoint['method']; description: string; version?: string; rateLimit?: number; ratePeriod?: string; requestSchema?: string; responseSchema?: string }): Promise<APIEndpoint & CollectionMeta> {
    return this.endpoints.insert({ ...data, version: data.version ?? 'v1', authRequired: true, rateLimit: data.rateLimit ?? 100, ratePeriod: data.ratePeriod ?? '1m', requestSchema: data.requestSchema ?? '', responseSchema: data.responseSchema ?? '', active: true });
  }
  async listEndpoints(version?: string): Promise<(APIEndpoint & CollectionMeta)[]> { const q = this.endpoints.query(); if (version) q.where('version', '=', version); q.orderBy('path', 'asc'); return q.execute(); }

  // API Keys
  async createAPIKey(data: { keyId: string; name: string; clientId: string; hashedKey: string; scopes: string; expiresAt?: string; createdBy: string }): Promise<APIKey & CollectionMeta> {
    return this.apiKeys.insert({ ...data, expiresAt: data.expiresAt ?? '', requestCount: 0, active: true, createdDate: currentDate() });
  }
  async revokeAPIKey(id: string): Promise<APIKey & CollectionMeta> { return this.apiKeys.update(id, { active: false }); }
  async listAPIKeys(): Promise<(APIKey & CollectionMeta)[]> { return this.apiKeys.query().orderBy('name', 'asc').execute(); }
  async recordKeyUsage(id: string): Promise<APIKey & CollectionMeta> { const k = await this.apiKeys.get(id); if (!k) throw new Error(`API key ${id} not found`); return this.apiKeys.update(id, { lastUsedAt: currentTimestamp(), requestCount: k.requestCount + 1 }); }

  // Webhooks
  async createWebhook(data: { webhookId: string; name: string; url: string; events: string; secret?: string }): Promise<WebhookConfig & CollectionMeta> {
    return this.webhookConfigs.insert({ ...data, secret: data.secret ?? '', active: true, retryCount: 3, failureCount: 0, createdDate: currentDate() });
  }
  async toggleWebhook(id: string, active: boolean): Promise<WebhookConfig & CollectionMeta> { return this.webhookConfigs.update(id, { active }); }
  async listWebhooks(): Promise<(WebhookConfig & CollectionMeta)[]> { return this.webhookConfigs.query().orderBy('name', 'asc').execute(); }
  async logWebhookCall(data: { webhookId: string; event: string; payload: string; responseStatus: number; responseBody?: string; duration: number; retryAttempt?: number }): Promise<WebhookLog & CollectionMeta> {
    const l = await this.webhookLogs.insert({ ...data, sentAt: currentTimestamp(), success: data.responseStatus >= 200 && data.responseStatus < 300, responseBody: data.responseBody ?? '', retryAttempt: data.retryAttempt ?? 0 });
    if (!l.success) { const cfg = await this.webhookConfigs.get(data.webhookId); if (cfg) await this.webhookConfigs.update(data.webhookId, { failureCount: cfg.failureCount + 1, lastStatus: data.responseStatus, lastTriggeredAt: currentTimestamp() }); }
    else { await this.webhookConfigs.update(data.webhookId, { lastStatus: data.responseStatus, lastTriggeredAt: currentTimestamp(), failureCount: 0 }); }
    return l;
  }
  async getWebhookLogs(webhookId: string): Promise<(WebhookLog & CollectionMeta)[]> { return this.webhookLogs.query().where('webhookId', '=', webhookId).orderBy('sentAt', 'desc').execute(); }

  // Integrations
  async configureIntegration(data: { integrationId: string; provider: IntegrationProvider; name: string; direction: SyncDirection; apiUrl?: string; apiKey?: string; clientId?: string; clientSecret?: string; settings?: string; syncInterval?: number }): Promise<IntegrationConfig & CollectionMeta> {
    const i = await this.integrations.insert({ ...data, status: 'pending' as IntegrationStatus, apiUrl: data.apiUrl ?? '', apiKey: data.apiKey ?? '', clientId: data.clientId ?? '', clientSecret: data.clientSecret ?? '', refreshToken: '', settings: data.settings ?? '{}', syncInterval: data.syncInterval ?? 3600, createdDate: currentDate() });
    this.events.emit('integration.configured', { integration: i }); return i;
  }
  async activateIntegration(id: string): Promise<IntegrationConfig & CollectionMeta> { return this.integrations.update(id, { status: 'active' as IntegrationStatus }); }
  async deactivateIntegration(id: string): Promise<IntegrationConfig & CollectionMeta> { return this.integrations.update(id, { status: 'inactive' as IntegrationStatus }); }
  async setIntegrationError(id: string, msg: string): Promise<IntegrationConfig & CollectionMeta> { return this.integrations.update(id, { status: 'error' as IntegrationStatus, errorMessage: msg }); }
  async listIntegrations(provider?: IntegrationProvider): Promise<(IntegrationConfig & CollectionMeta)[]> { const q = this.integrations.query(); if (provider) q.where('provider', '=', provider); q.orderBy('name', 'asc'); return q.execute(); }

  // Mappings
  async addMapping(data: { integrationId: string; localCollection: string; localField: string; remoteEntity: string; remoteField: string; transformRule?: string; direction: SyncDirection }): Promise<IntegrationMapping & CollectionMeta> {
    return this.mappings.insert({ ...data, transformRule: data.transformRule ?? '', active: true });
  }
  async listMappings(integrationId: string): Promise<(IntegrationMapping & CollectionMeta)[]> { return this.mappings.query().where('integrationId', '=', integrationId).execute(); }

  // Sync Logs
  async startSync(data: { integrationId: string; provider: IntegrationProvider; direction: SyncDirection }): Promise<SyncLog & CollectionMeta> {
    return this.syncLogs.insert({ ...data, startedAt: currentTimestamp(), recordsSynced: 0, recordsFailed: 0, status: 'running' as const });
  }
  async completeSync(id: string, recordsSynced: number, recordsFailed: number, errors?: string): Promise<SyncLog & CollectionMeta> {
    const status = recordsFailed > 0 && recordsSynced === 0 ? 'failed' as const : 'completed' as const;
    return this.syncLogs.update(id, { completedAt: currentTimestamp(), recordsSynced, recordsFailed, errors: errors ?? '', status });
  }
  async listSyncLogs(integrationId?: string): Promise<(SyncLog & CollectionMeta)[]> { const q = this.syncLogs.query(); if (integrationId) q.where('integrationId', '=', integrationId); q.orderBy('startedAt', 'desc'); return q.execute(); }

  // Email Integration
  async receiveEmail(data: { emailId: string; from: string; subject: string; attachments: string; documentType?: string; matchedVendor?: string }): Promise<EmailIntegration & CollectionMeta> {
    return this.emails.insert({ ...data, receivedAt: currentTimestamp(), documentType: data.documentType ?? '', matchedVendor: data.matchedVendor ?? '', status: 'pending' as const });
  }
  async processEmail(id: string, documentType: string, matchedVendor?: string): Promise<EmailIntegration & CollectionMeta> {
    return this.emails.update(id, { processedAt: currentTimestamp(), documentType, matchedVendor: matchedVendor ?? '', status: 'processed' as const });
  }
  async listEmails(status?: string): Promise<(EmailIntegration & CollectionMeta)[]> { const q = this.emails.query(); if (status) q.where('status', '=', status); q.orderBy('receivedAt', 'desc'); return q.execute(); }

  // Calendar
  async createCalendarEvent(data: { eventId: string; title: string; description?: string; startDate: string; endDate: string; allDay?: boolean; projectId?: string; projectName?: string; milestoneType?: string; calendarProvider: CalendarEvent['calendarProvider'] }): Promise<CalendarEvent & CollectionMeta> {
    return this.calendarEvents.insert({ ...data, description: data.description ?? '', allDay: data.allDay ?? false, projectId: data.projectId ?? '', projectName: data.projectName ?? '', milestoneType: data.milestoneType ?? '', externalId: '', synced: false });
  }
  async markSynced(id: string, externalId: string): Promise<CalendarEvent & CollectionMeta> { return this.calendarEvents.update(id, { synced: true, externalId, lastSyncAt: currentTimestamp() }); }
  async listCalendarEvents(projectId?: string): Promise<(CalendarEvent & CollectionMeta)[]> { const q = this.calendarEvents.query(); if (projectId) q.where('projectId', '=', projectId); q.orderBy('startDate', 'asc'); return q.execute(); }

  // Flat File / SFTP
  async configureFlatFile(data: { configId: string; name: string; protocol: FlatFileConfig['protocol']; host: string; port?: number; path: string; filePattern: string; dataType: string; schedule?: string }): Promise<FlatFileConfig & CollectionMeta> {
    return this.flatFileConfigs.insert({ ...data, port: data.port ?? 22, schedule: data.schedule ?? '', filesProcessed: 0, active: true });
  }
  async listFlatFileConfigs(): Promise<(FlatFileConfig & CollectionMeta)[]> { return this.flatFileConfigs.query().orderBy('name', 'asc').execute(); }
  async logFlatFileProcess(data: { configId: string; fileName: string; fileSize: number; recordsImported: number; recordsFailed: number }): Promise<FlatFileLog & CollectionMeta> {
    const status = data.recordsFailed > 0 && data.recordsImported === 0 ? 'failed' as const : 'completed' as const;
    const l = await this.flatFileLogs.insert({ ...data, receivedAt: currentTimestamp(), processedAt: currentTimestamp(), status });
    const cfg = await this.flatFileConfigs.get(data.configId); if (cfg) await this.flatFileConfigs.update(data.configId, { lastProcessedAt: currentTimestamp(), filesProcessed: cfg.filesProcessed + 1 });
    return l;
  }
  async listFlatFileLogs(configId?: string): Promise<(FlatFileLog & CollectionMeta)[]> { const q = this.flatFileLogs.query(); if (configId) q.where('configId', '=', configId); q.orderBy('receivedAt', 'desc'); return q.execute(); }
}
