/**
 * Lazy singleton accessor for ImportExportService.
 */

import { ImportExportService } from './import-export-service';
import type { ImportBatch, ImportError, ExportJob, FieldMapping } from './import-export-service';

let _service: ImportExportService | null = null;

export function getImportExportService(): ImportExportService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('ImportExport: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new ImportExportService(
    store.collection<ImportBatch>('integration/importBatch'),
    store.collection<ImportError>('integration/importError'),
    store.collection<ExportJob>('integration/exportJob'),
    store.collection<FieldMapping>('integration/fieldMapping'),
    events,
    (name: string) => store.collection<Record<string, unknown>>(name) ?? null,
  );

  return _service;
}
