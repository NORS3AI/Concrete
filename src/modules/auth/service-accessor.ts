/**
 * Lazy singleton accessor for AuthService.
 */

import { AuthService } from './auth-service';
import type { AuthUser, AuthRole, AuthSession, AuthApiKey, AuditLogEntry } from './auth-service';

let _service: AuthService | null = null;

export function getAuthService(): AuthService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Auth: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new AuthService(
    store.collection<AuthUser>('auth/user'),
    store.collection<AuthRole>('auth/role'),
    store.collection<AuthSession>('auth/session'),
    store.collection<AuthApiKey>('auth/apiKey'),
    store.collection<AuditLogEntry>('auth/auditLog'),
    events,
  );

  return _service;
}
