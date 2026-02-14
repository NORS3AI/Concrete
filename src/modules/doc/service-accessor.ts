/**
 * Lazy singleton accessor for DocService.
 */

import { DocService } from './doc-service';
import type { Document, Revision, Template, Transmittal, Photo } from './doc-service';

let _service: DocService | null = null;

export function getDocService(): DocService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Doc: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new DocService(
    store.collection<Document>('doc/document'),
    store.collection<Revision>('doc/revision'),
    store.collection<Template>('doc/template'),
    store.collection<Transmittal>('doc/transmittal'),
    store.collection<Photo>('doc/photo'),
    events,
  );

  return _service;
}
