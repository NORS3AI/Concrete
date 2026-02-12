/**
 * Concrete -- Document Management Service
 *
 * Core service layer for the Document Management module (Phase 14).
 * Provides document CRUD with category/tag filtering, revision management,
 * template CRUD, transmittal creation/send/acknowledge, photo log management,
 * full-text search across metadata, expiration alert queries, and statistics.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';
import { now } from '../../core/types/base';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type DocumentCategory =
  | 'contract'
  | 'change_order'
  | 'rfi'
  | 'submittal'
  | 'drawing'
  | 'photo'
  | 'report'
  | 'correspondence'
  | 'insurance'
  | 'permit'
  | 'other';

export type DocumentStatus = 'active' | 'archived' | 'expired';

export type TemplateCategory =
  | 'contract'
  | 'change_order'
  | 'rfi'
  | 'submittal'
  | 'drawing'
  | 'photo'
  | 'report'
  | 'correspondence'
  | 'insurance'
  | 'permit'
  | 'lien_waiver'
  | 'aia_form'
  | 'other';

export type TransmittalStatus = 'draft' | 'sent' | 'acknowledged';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Document {
  [key: string]: unknown;
  title: string;
  category: DocumentCategory;
  description?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  jobId?: string;
  entityId?: string;
  vendorId?: string;
  employeeId?: string;
  tags?: string[];
  expirationDate?: string;
  status: DocumentStatus;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface Revision {
  [key: string]: unknown;
  documentId: string;
  revisionNumber: number;
  description?: string;
  fileName?: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedAt?: string;
  notes?: string;
}

export interface Template {
  [key: string]: unknown;
  name: string;
  category?: TemplateCategory;
  description?: string;
  content?: string;
  variables?: string[];
  isActive: boolean;
}

export interface Transmittal {
  [key: string]: unknown;
  number: string;
  jobId?: string;
  toName: string;
  toCompany?: string;
  fromName?: string;
  date: string;
  subject?: string;
  notes?: string;
  status: TransmittalStatus;
  items?: string[];
}

export interface Photo {
  [key: string]: unknown;
  documentId: string;
  jobId?: string;
  dateTaken: string;
  location?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  takenBy?: string;
}

// ---------------------------------------------------------------------------
// Report / Stats Types
// ---------------------------------------------------------------------------

export interface DocumentCategoryCount {
  category: DocumentCategory;
  count: number;
}

export interface DocumentJobCount {
  jobId: string;
  count: number;
}

export interface DocumentStats {
  totalDocuments: number;
  byCategory: DocumentCategoryCount[];
  byJob: DocumentJobCount[];
  totalRevisions: number;
  totalTemplates: number;
  totalTransmittals: number;
  totalPhotos: number;
  expiringWithin30Days: number;
}

export interface SearchResult {
  documentId: string;
  title: string;
  category: DocumentCategory;
  description?: string;
  tags?: string[];
  matchField: string;
}

// ---------------------------------------------------------------------------
// DocService
// ---------------------------------------------------------------------------

export class DocService {
  constructor(
    private documents: Collection<Document>,
    private revisions: Collection<Revision>,
    private templates: Collection<Template>,
    private transmittals: Collection<Transmittal>,
    private photos: Collection<Photo>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // DOCUMENT CRUD
  // ========================================================================

  /**
   * Create a new document.
   * Defaults: status='active', uploadedAt=now(), tags=[].
   */
  async createDocument(data: {
    title: string;
    category: DocumentCategory;
    description?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    jobId?: string;
    entityId?: string;
    vendorId?: string;
    employeeId?: string;
    tags?: string[];
    expirationDate?: string;
    status?: DocumentStatus;
    uploadedBy?: string;
  }): Promise<Document & CollectionMeta> {
    const record = await this.documents.insert({
      title: data.title,
      category: data.category,
      description: data.description,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      jobId: data.jobId,
      entityId: data.entityId,
      vendorId: data.vendorId,
      employeeId: data.employeeId,
      tags: data.tags ?? [],
      expirationDate: data.expirationDate,
      status: data.status ?? 'active',
      uploadedBy: data.uploadedBy,
      uploadedAt: now(),
    } as Document);

    this.events.emit('doc.created', { document: record });
    return record;
  }

  /**
   * Update an existing document.
   */
  async updateDocument(
    id: string,
    changes: Partial<Document>,
  ): Promise<Document & CollectionMeta> {
    const existing = await this.documents.get(id);
    if (!existing) {
      throw new Error(`Document not found: ${id}`);
    }

    const updated = await this.documents.update(id, changes as Partial<Document>);
    this.events.emit('doc.updated', { document: updated });
    return updated;
  }

  /**
   * Soft-delete a document.
   * Also removes all associated revisions and photo log entries.
   */
  async deleteDocument(id: string): Promise<void> {
    const existing = await this.documents.get(id);
    if (!existing) {
      throw new Error(`Document not found: ${id}`);
    }

    // Remove associated revisions
    const revisions = await this.revisions
      .query()
      .where('documentId', '=', id)
      .execute();
    for (const rev of revisions) {
      await this.revisions.remove(rev.id);
    }

    // Remove associated photo entries
    const photos = await this.photos
      .query()
      .where('documentId', '=', id)
      .execute();
    for (const photo of photos) {
      await this.photos.remove(photo.id);
    }

    await this.documents.remove(id);
    this.events.emit('doc.deleted', { documentId: id });
  }

  /**
   * Get a single document by ID.
   */
  async getDocument(id: string): Promise<(Document & CollectionMeta) | null> {
    return this.documents.get(id);
  }

  /**
   * Get documents with optional filters, ordered by uploadedAt descending.
   */
  async getDocuments(filters?: {
    category?: DocumentCategory;
    status?: DocumentStatus;
    jobId?: string;
    entityId?: string;
    vendorId?: string;
    employeeId?: string;
  }): Promise<(Document & CollectionMeta)[]> {
    const q = this.documents.query();

    if (filters?.category) {
      q.where('category', '=', filters.category);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.entityId) {
      q.where('entityId', '=', filters.entityId);
    }
    if (filters?.vendorId) {
      q.where('vendorId', '=', filters.vendorId);
    }
    if (filters?.employeeId) {
      q.where('employeeId', '=', filters.employeeId);
    }

    q.orderBy('uploadedAt', 'desc');
    return q.execute();
  }

  /**
   * Get documents filtered by tag. Returns all active documents
   * that contain the specified tag string in their tags array.
   */
  async getDocumentsByTag(tag: string): Promise<(Document & CollectionMeta)[]> {
    const allDocs = await this.documents
      .query()
      .where('status', '=', 'active')
      .execute();

    return allDocs.filter((doc) => {
      const tags = doc.tags;
      if (!Array.isArray(tags)) return false;
      return tags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
    });
  }

  /**
   * Archive a document. Sets status='archived'.
   */
  async archiveDocument(id: string): Promise<Document & CollectionMeta> {
    const existing = await this.documents.get(id);
    if (!existing) {
      throw new Error(`Document not found: ${id}`);
    }

    const updated = await this.documents.update(id, {
      status: 'archived',
    } as Partial<Document>);

    this.events.emit('doc.archived', { document: updated });
    return updated;
  }

  // ========================================================================
  // REVISION MANAGEMENT
  // ========================================================================

  /**
   * Add a new revision to a document.
   * Automatically determines the next revision number.
   */
  async addRevision(data: {
    documentId: string;
    description?: string;
    fileName?: string;
    fileSize?: number;
    uploadedBy?: string;
    notes?: string;
  }): Promise<Revision & CollectionMeta> {
    // Validate document exists
    const document = await this.documents.get(data.documentId);
    if (!document) {
      throw new Error(`Document not found: ${data.documentId}`);
    }

    // Determine next revision number
    const existingRevisions = await this.revisions
      .query()
      .where('documentId', '=', data.documentId)
      .orderBy('revisionNumber', 'desc')
      .limit(1)
      .execute();

    const nextRevisionNumber = existingRevisions.length > 0
      ? (existingRevisions[0].revisionNumber + 1)
      : 1;

    const record = await this.revisions.insert({
      documentId: data.documentId,
      revisionNumber: nextRevisionNumber,
      description: data.description,
      fileName: data.fileName,
      fileSize: data.fileSize,
      uploadedBy: data.uploadedBy,
      uploadedAt: now(),
      notes: data.notes,
    } as Revision);

    // Update the parent document's fileName and fileSize if provided
    if (data.fileName || data.fileSize) {
      const docChanges: Partial<Document> = {};
      if (data.fileName) {
        docChanges.fileName = data.fileName;
      }
      if (data.fileSize !== undefined) {
        docChanges.fileSize = data.fileSize;
      }
      await this.documents.update(data.documentId, docChanges as Partial<Document>);
    }

    this.events.emit('doc.revision.added', { revision: record, documentId: data.documentId });
    return record;
  }

  /**
   * Get all revisions for a document, ordered by revision number descending.
   */
  async getRevisions(documentId: string): Promise<(Revision & CollectionMeta)[]> {
    return this.revisions
      .query()
      .where('documentId', '=', documentId)
      .orderBy('revisionNumber', 'desc')
      .execute();
  }

  /**
   * Get a specific revision by document ID and revision number.
   */
  async getRevision(
    documentId: string,
    revisionNumber: number,
  ): Promise<(Revision & CollectionMeta) | null> {
    const result = await this.revisions
      .query()
      .where('documentId', '=', documentId)
      .where('revisionNumber', '=', revisionNumber)
      .limit(1)
      .first();
    return result;
  }

  /**
   * Get the latest revision number for a document.
   */
  async getLatestRevisionNumber(documentId: string): Promise<number> {
    const revisions = await this.revisions
      .query()
      .where('documentId', '=', documentId)
      .orderBy('revisionNumber', 'desc')
      .limit(1)
      .execute();

    return revisions.length > 0 ? revisions[0].revisionNumber : 0;
  }

  // ========================================================================
  // TEMPLATE CRUD
  // ========================================================================

  /**
   * Create a new template.
   * Defaults: isActive=true, variables=[].
   */
  async createTemplate(data: {
    name: string;
    category?: TemplateCategory;
    description?: string;
    content?: string;
    variables?: string[];
    isActive?: boolean;
  }): Promise<Template & CollectionMeta> {
    // Validate unique name
    const existing = await this.getTemplateByName(data.name);
    if (existing) {
      throw new Error(`Template name "${data.name}" already exists.`);
    }

    const record = await this.templates.insert({
      name: data.name,
      category: data.category,
      description: data.description,
      content: data.content,
      variables: data.variables ?? [],
      isActive: data.isActive ?? true,
    } as Template);

    this.events.emit('doc.template.created', { template: record });
    return record;
  }

  /**
   * Update an existing template.
   */
  async updateTemplate(
    id: string,
    changes: Partial<Template>,
  ): Promise<Template & CollectionMeta> {
    const existing = await this.templates.get(id);
    if (!existing) {
      throw new Error(`Template not found: ${id}`);
    }

    // If name is changing, validate uniqueness
    if (changes.name && changes.name !== existing.name) {
      const duplicate = await this.getTemplateByName(changes.name);
      if (duplicate) {
        throw new Error(`Template name "${changes.name}" already exists.`);
      }
    }

    const updated = await this.templates.update(id, changes as Partial<Template>);
    this.events.emit('doc.template.updated', { template: updated });
    return updated;
  }

  /**
   * Soft-delete a template.
   */
  async deleteTemplate(id: string): Promise<void> {
    const existing = await this.templates.get(id);
    if (!existing) {
      throw new Error(`Template not found: ${id}`);
    }

    await this.templates.remove(id);
    this.events.emit('doc.template.deleted', { templateId: id });
  }

  /**
   * Get a single template by ID.
   */
  async getTemplate(id: string): Promise<(Template & CollectionMeta) | null> {
    return this.templates.get(id);
  }

  /**
   * Lookup a template by name.
   */
  async getTemplateByName(name: string): Promise<(Template & CollectionMeta) | null> {
    const result = await this.templates
      .query()
      .where('name', '=', name)
      .limit(1)
      .first();
    return result;
  }

  /**
   * Get templates with optional filters, ordered by name.
   */
  async getTemplates(filters?: {
    category?: TemplateCategory;
    isActive?: boolean;
  }): Promise<(Template & CollectionMeta)[]> {
    const q = this.templates.query();

    if (filters?.category) {
      q.where('category', '=', filters.category);
    }
    if (filters?.isActive !== undefined) {
      q.where('isActive', '=', filters.isActive);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  /**
   * Render a template by substituting variables in the content.
   * Template variables use {{variableName}} syntax.
   */
  renderTemplate(
    content: string,
    variables: Record<string, string>,
  ): string {
    let rendered = content;
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(pattern, value);
    }
    return rendered;
  }

  // ========================================================================
  // TRANSMITTAL MANAGEMENT
  // ========================================================================

  /**
   * Create a new transmittal.
   * Defaults: status='draft', items=[].
   */
  async createTransmittal(data: {
    number: string;
    jobId?: string;
    toName: string;
    toCompany?: string;
    fromName?: string;
    date: string;
    subject?: string;
    notes?: string;
    status?: TransmittalStatus;
    items?: string[];
  }): Promise<Transmittal & CollectionMeta> {
    // Validate unique transmittal number
    const existing = await this.getTransmittalByNumber(data.number);
    if (existing) {
      throw new Error(`Transmittal number "${data.number}" already exists.`);
    }

    const record = await this.transmittals.insert({
      number: data.number,
      jobId: data.jobId,
      toName: data.toName,
      toCompany: data.toCompany,
      fromName: data.fromName,
      date: data.date,
      subject: data.subject,
      notes: data.notes,
      status: data.status ?? 'draft',
      items: data.items ?? [],
    } as Transmittal);

    this.events.emit('doc.transmittal.created', { transmittal: record });
    return record;
  }

  /**
   * Update an existing transmittal.
   */
  async updateTransmittal(
    id: string,
    changes: Partial<Transmittal>,
  ): Promise<Transmittal & CollectionMeta> {
    const existing = await this.transmittals.get(id);
    if (!existing) {
      throw new Error(`Transmittal not found: ${id}`);
    }

    const updated = await this.transmittals.update(id, changes as Partial<Transmittal>);
    this.events.emit('doc.transmittal.updated', { transmittal: updated });
    return updated;
  }

  /**
   * Send a transmittal. Sets status='sent'.
   * Only draft transmittals can be sent.
   */
  async sendTransmittal(id: string): Promise<Transmittal & CollectionMeta> {
    const existing = await this.transmittals.get(id);
    if (!existing) {
      throw new Error(`Transmittal not found: ${id}`);
    }

    if (existing.status !== 'draft') {
      throw new Error(
        `Transmittal "${existing.number}" cannot be sent: current status is "${existing.status}". Transmittal must be in "draft" status.`,
      );
    }

    const updated = await this.transmittals.update(id, {
      status: 'sent',
    } as Partial<Transmittal>);

    this.events.emit('doc.transmittal.sent', { transmittal: updated });
    return updated;
  }

  /**
   * Acknowledge a transmittal. Sets status='acknowledged'.
   * Only sent transmittals can be acknowledged.
   */
  async acknowledgeTransmittal(id: string): Promise<Transmittal & CollectionMeta> {
    const existing = await this.transmittals.get(id);
    if (!existing) {
      throw new Error(`Transmittal not found: ${id}`);
    }

    if (existing.status !== 'sent') {
      throw new Error(
        `Transmittal "${existing.number}" cannot be acknowledged: current status is "${existing.status}". Transmittal must be in "sent" status.`,
      );
    }

    const updated = await this.transmittals.update(id, {
      status: 'acknowledged',
    } as Partial<Transmittal>);

    this.events.emit('doc.transmittal.acknowledged', { transmittal: updated });
    return updated;
  }

  /**
   * Get a single transmittal by ID.
   */
  async getTransmittal(id: string): Promise<(Transmittal & CollectionMeta) | null> {
    return this.transmittals.get(id);
  }

  /**
   * Lookup a transmittal by number.
   */
  async getTransmittalByNumber(number: string): Promise<(Transmittal & CollectionMeta) | null> {
    const result = await this.transmittals
      .query()
      .where('number', '=', number)
      .limit(1)
      .first();
    return result;
  }

  /**
   * Get transmittals with optional filters, ordered by date descending.
   */
  async getTransmittals(filters?: {
    jobId?: string;
    status?: TransmittalStatus;
  }): Promise<(Transmittal & CollectionMeta)[]> {
    const q = this.transmittals.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('date', 'desc');
    return q.execute();
  }

  /**
   * Add a document to a transmittal's items list.
   */
  async addDocumentToTransmittal(
    transmittalId: string,
    documentId: string,
  ): Promise<Transmittal & CollectionMeta> {
    const transmittal = await this.transmittals.get(transmittalId);
    if (!transmittal) {
      throw new Error(`Transmittal not found: ${transmittalId}`);
    }

    // Validate document exists
    const document = await this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const currentItems = Array.isArray(transmittal.items) ? transmittal.items : [];
    if (currentItems.includes(documentId)) {
      throw new Error(`Document "${documentId}" is already in transmittal "${transmittal.number}".`);
    }

    const updatedItems = [...currentItems, documentId];
    const updated = await this.transmittals.update(transmittalId, {
      items: updatedItems,
    } as Partial<Transmittal>);

    return updated;
  }

  /**
   * Remove a document from a transmittal's items list.
   */
  async removeDocumentFromTransmittal(
    transmittalId: string,
    documentId: string,
  ): Promise<Transmittal & CollectionMeta> {
    const transmittal = await this.transmittals.get(transmittalId);
    if (!transmittal) {
      throw new Error(`Transmittal not found: ${transmittalId}`);
    }

    const currentItems = Array.isArray(transmittal.items) ? transmittal.items : [];
    const updatedItems = currentItems.filter((item: string) => item !== documentId);

    const updated = await this.transmittals.update(transmittalId, {
      items: updatedItems,
    } as Partial<Transmittal>);

    return updated;
  }

  // ========================================================================
  // PHOTO LOG MANAGEMENT
  // ========================================================================

  /**
   * Create a photo log entry. Also creates an associated document record
   * with category='photo'.
   */
  async createPhotoEntry(data: {
    title: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    jobId?: string;
    dateTaken: string;
    location?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    takenBy?: string;
    tags?: string[];
    uploadedBy?: string;
  }): Promise<{ document: Document & CollectionMeta; photo: Photo & CollectionMeta }> {
    // Create the document record first
    const document = await this.createDocument({
      title: data.title,
      category: 'photo',
      description: data.description,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType ?? 'image/jpeg',
      jobId: data.jobId,
      tags: data.tags,
      uploadedBy: data.uploadedBy,
    });

    // Create the photo log entry
    const photo = await this.photos.insert({
      documentId: document.id,
      jobId: data.jobId,
      dateTaken: data.dateTaken,
      location: data.location,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      takenBy: data.takenBy,
    } as Photo);

    this.events.emit('doc.photo.created', { photo, document });
    return { document, photo };
  }

  /**
   * Update a photo log entry.
   */
  async updatePhoto(
    id: string,
    changes: Partial<Photo>,
  ): Promise<Photo & CollectionMeta> {
    const existing = await this.photos.get(id);
    if (!existing) {
      throw new Error(`Photo entry not found: ${id}`);
    }

    const updated = await this.photos.update(id, changes as Partial<Photo>);
    return updated;
  }

  /**
   * Get a single photo entry by ID.
   */
  async getPhoto(id: string): Promise<(Photo & CollectionMeta) | null> {
    return this.photos.get(id);
  }

  /**
   * Get photo log entries with optional filters, ordered by dateTaken descending.
   */
  async getPhotos(filters?: {
    jobId?: string;
    takenBy?: string;
  }): Promise<(Photo & CollectionMeta)[]> {
    const q = this.photos.query();

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.takenBy) {
      q.where('takenBy', '=', filters.takenBy);
    }

    q.orderBy('dateTaken', 'desc');
    return q.execute();
  }

  // ========================================================================
  // DRAWING LOG
  // ========================================================================

  /**
   * Get all documents in the 'drawing' category, ordered by title.
   * This acts as the drawing log, where each drawing document can have
   * associated revisions for revision tracking.
   */
  async getDrawingLog(filters?: {
    jobId?: string;
    status?: DocumentStatus;
  }): Promise<(Document & CollectionMeta)[]> {
    const q = this.documents.query();
    q.where('category', '=', 'drawing');

    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }
    if (filters?.status) {
      q.where('status', '=', filters.status);
    }

    q.orderBy('title', 'asc');
    return q.execute();
  }

  /**
   * Get a drawing with its full revision history.
   */
  async getDrawingWithRevisions(
    documentId: string,
  ): Promise<{ drawing: Document & CollectionMeta; revisions: (Revision & CollectionMeta)[] } | null> {
    const drawing = await this.documents.get(documentId);
    if (!drawing || drawing.category !== 'drawing') {
      return null;
    }

    const revisions = await this.getRevisions(documentId);
    return { drawing, revisions };
  }

  // ========================================================================
  // FULL-TEXT SEARCH
  // ========================================================================

  /**
   * Search across document metadata: title, description, tags, and category.
   * Returns matching documents with the field that matched.
   */
  async searchDocuments(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();
    const allDocs = await this.documents.query().execute();
    const results: SearchResult[] = [];

    for (const doc of allDocs) {
      // Search title
      if (doc.title && doc.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          documentId: doc.id,
          title: doc.title,
          category: doc.category,
          description: doc.description,
          tags: doc.tags as string[] | undefined,
          matchField: 'title',
        });
        continue;
      }

      // Search description
      if (doc.description && doc.description.toLowerCase().includes(lowerQuery)) {
        results.push({
          documentId: doc.id,
          title: doc.title,
          category: doc.category,
          description: doc.description,
          tags: doc.tags as string[] | undefined,
          matchField: 'description',
        });
        continue;
      }

      // Search tags
      if (Array.isArray(doc.tags)) {
        const tagMatch = doc.tags.some(
          (tag: string) => tag.toLowerCase().includes(lowerQuery),
        );
        if (tagMatch) {
          results.push({
            documentId: doc.id,
            title: doc.title,
            category: doc.category,
            description: doc.description,
            tags: doc.tags as string[],
            matchField: 'tags',
          });
          continue;
        }
      }

      // Search category
      if (doc.category && doc.category.toLowerCase().includes(lowerQuery)) {
        results.push({
          documentId: doc.id,
          title: doc.title,
          category: doc.category,
          description: doc.description,
          tags: doc.tags as string[] | undefined,
          matchField: 'category',
        });
        continue;
      }

      // Search fileName
      if (doc.fileName && doc.fileName.toLowerCase().includes(lowerQuery)) {
        results.push({
          documentId: doc.id,
          title: doc.title,
          category: doc.category,
          description: doc.description,
          tags: doc.tags as string[] | undefined,
          matchField: 'fileName',
        });
        continue;
      }
    }

    return results;
  }

  // ========================================================================
  // EXPIRATION ALERTS
  // ========================================================================

  /**
   * Get documents expiring within N days from today.
   * Returns active documents with an expirationDate between today
   * and today + daysAhead.
   */
  async getExpiringDocuments(
    daysAhead: number,
  ): Promise<(Document & CollectionMeta)[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const activeDocs = await this.documents
      .query()
      .where('status', '=', 'active')
      .execute();

    const expiring = activeDocs.filter((doc) => {
      if (!doc.expirationDate) return false;
      return doc.expirationDate >= todayStr && doc.expirationDate <= futureDateStr;
    });

    // Emit event for expired documents
    for (const doc of expiring) {
      if (doc.expirationDate && doc.expirationDate <= todayStr) {
        this.events.emit('doc.expired', { document: doc });
      }
    }

    return expiring;
  }

  /**
   * Get documents that have already expired (expirationDate < today)
   * but are still marked as 'active'.
   */
  async getExpiredDocuments(): Promise<(Document & CollectionMeta)[]> {
    const todayStr = new Date().toISOString().split('T')[0];

    const activeDocs = await this.documents
      .query()
      .where('status', '=', 'active')
      .execute();

    return activeDocs.filter((doc) => {
      if (!doc.expirationDate) return false;
      return doc.expirationDate < todayStr;
    });
  }

  /**
   * Mark expired documents as 'expired' status.
   * Returns the number of documents updated.
   */
  async markExpiredDocuments(): Promise<number> {
    const expired = await this.getExpiredDocuments();
    let count = 0;

    for (const doc of expired) {
      await this.documents.update(doc.id, {
        status: 'expired',
      } as Partial<Document>);
      this.events.emit('doc.expired', { document: doc });
      count++;
    }

    return count;
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  /**
   * Get document statistics: counts by category, by job, and totals.
   */
  async getStats(): Promise<DocumentStats> {
    const allDocs = await this.documents.query().execute();
    const allRevisions = await this.revisions.query().execute();
    const allTemplates = await this.templates.query().execute();
    const allTransmittals = await this.transmittals.query().execute();
    const allPhotos = await this.photos.query().execute();

    // Count by category
    const categoryMap = new Map<DocumentCategory, number>();
    for (const doc of allDocs) {
      const cat = doc.category;
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    const byCategory: DocumentCategoryCount[] = [];
    for (const [category, count] of categoryMap) {
      byCategory.push({ category, count });
    }
    byCategory.sort((a, b) => a.category.localeCompare(b.category));

    // Count by job
    const jobMap = new Map<string, number>();
    for (const doc of allDocs) {
      if (doc.jobId) {
        jobMap.set(doc.jobId, (jobMap.get(doc.jobId) ?? 0) + 1);
      }
    }
    const byJob: DocumentJobCount[] = [];
    for (const [jobId, count] of jobMap) {
      byJob.push({ jobId, count });
    }
    byJob.sort((a, b) => b.count - a.count);

    // Count expiring within 30 days
    const today = new Date();
    const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];
    let expiringWithin30Days = 0;
    for (const doc of allDocs) {
      if (
        doc.status === 'active' &&
        doc.expirationDate &&
        doc.expirationDate >= todayStr &&
        doc.expirationDate <= futureDateStr
      ) {
        expiringWithin30Days++;
      }
    }

    return {
      totalDocuments: allDocs.length,
      byCategory,
      byJob,
      totalRevisions: allRevisions.length,
      totalTemplates: allTemplates.length,
      totalTransmittals: allTransmittals.length,
      totalPhotos: allPhotos.length,
      expiringWithin30Days,
    };
  }
}
