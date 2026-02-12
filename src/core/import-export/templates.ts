/**
 * Concrete -- Mapping Template Manager
 * Phase Zed.10 Import/Export Framework
 *
 * Persists and manages reusable column mapping templates in localStorage.
 * Users can save a mapping configuration for a specific data type and
 * apply it to future imports, avoiding repetitive manual mapping.
 */

import type { MappingTemplate, ColumnMapping } from '../types/import-export';
import { generateId, now } from '../types/base';

// ---------------------------------------------------------------------------
// MappingTemplateManager
// ---------------------------------------------------------------------------

export class MappingTemplateManager {
  private templates: MappingTemplate[] = [];
  private readonly storageKey = 'concrete_mapping_templates';

  constructor() {
    this.load();
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  /**
   * Save a new mapping template.
   * Generates an `id` and `createdAt` timestamp automatically.
   */
  save(template: Omit<MappingTemplate, 'id' | 'createdAt'>): MappingTemplate {
    const full: MappingTemplate = {
      ...template,
      id: generateId(),
      createdAt: now(),
    };

    this.templates.push(full);
    this.persist();
    return full;
  }

  /**
   * Get a template by its ID.
   */
  get(id: string): MappingTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  /**
   * Get all saved templates.
   */
  getAll(): MappingTemplate[] {
    return [...this.templates];
  }

  /**
   * Get all templates for a specific data type.
   */
  getByDataType(dataType: string): MappingTemplate[] {
    return this.templates.filter((t) => t.dataType === dataType);
  }

  /**
   * Remove a template by ID.
   */
  remove(id: string): void {
    const idx = this.templates.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.templates.splice(idx, 1);
      this.persist();
    }
  }

  /**
   * Update an existing template's name or mappings.
   */
  update(id: string, changes: { name?: string; mappings?: ColumnMapping[] }): MappingTemplate | undefined {
    const template = this.templates.find((t) => t.id === id);
    if (!template) return undefined;

    if (changes.name !== undefined) {
      template.name = changes.name;
    }
    if (changes.mappings !== undefined) {
      template.mappings = changes.mappings;
    }

    this.persist();
    return template;
  }

  // -----------------------------------------------------------------------
  // Private: localStorage persistence
  // -----------------------------------------------------------------------

  private load(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          this.templates = parsed as MappingTemplate[];
        }
      }
    } catch {
      this.templates = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.templates));
    } catch {
      // localStorage may be full; best-effort persistence
    }
  }
}
