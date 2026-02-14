/**
 * Lazy singleton accessor for TenantService.
 */

import { TenantService } from './tenant-service';
import type { Tenant, TenantConfig, Subscription, TenantUser, TenantBranding } from './tenant-service';

let _service: TenantService | null = null;

export function getTenantService(): TenantService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Tenant: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new TenantService(
    store.collection<Tenant>('tenant/tenant'),
    store.collection<TenantConfig>('tenant/tenantConfig'),
    store.collection<Subscription>('tenant/subscription'),
    store.collection<TenantUser>('tenant/tenantUser'),
    store.collection<TenantBranding>('tenant/tenantBranding'),
    events,
  );

  return _service;
}
