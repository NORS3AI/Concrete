/**
 * Phase Zed.2 - Module Manifest Types
 * Defines the structure for pluggable modules within the Concrete platform.
 */

import type { FieldDef } from './schema';

/** Route configuration for module pages */
export interface RouteConfig {
  path: string;
  component: () => Promise<unknown>;
  title?: string;
  icon?: string;
  guard?: string;
}

/** Navigation item for sidebar/header */
export interface NavItemConfig {
  id: string;
  label: string;
  icon?: string;
  path: string;
  order: number;
  parent?: string;
  badge?: string | (() => string | number | null);
}

/** Dashboard widget configuration */
export interface WidgetConfig {
  id: string;
  title: string;
  component: () => Promise<unknown>;
  defaultSize: 'sm' | 'md' | 'lg' | 'xl';
  category?: string;
}

/** Settings panel configuration */
export interface SettingsConfig {
  id: string;
  title: string;
  component: () => Promise<unknown>;
  order: number;
}

/** Import type definition for a module */
export interface ImportTypeDef {
  id: string;
  label: string;
  collection: string;
  fields: FieldDef[];
  autoDetectHeaders?: boolean;
}

/** Export type definition for a module */
export interface ExportTypeDef {
  id: string;
  label: string;
  collection: string;
  defaultFields?: string[];
}

/** Hook registration for module lifecycle events */
export interface HookRegistration {
  event: string;
  handler: Function;
  priority?: number;
}

/** Permission definition for RBAC */
export interface PermissionDef {
  resource: string;
  actions: string[];
  description?: string;
}

/** Workflow step definition */
export interface WorkflowStepDef {
  id: string;
  name: string;
  type: 'approval' | 'notification' | 'action' | 'condition';
  config: Record<string, unknown>;
}

/** Workflow definition */
export interface WorkflowDef {
  id: string;
  name: string;
  steps: WorkflowStepDef[];
  triggers?: Record<string, unknown>[];
}

/** Module status lifecycle */
export type ModuleStatus = 'registered' | 'loading' | 'active' | 'disabled' | 'error';

/** Complete module manifest */
export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  phase: number;
  dependencies: string[];
  collections: string[];
  routes: RouteConfig[];
  navItems: NavItemConfig[];
  dashboardWidgets: WidgetConfig[];
  settings: SettingsConfig[];
  permissions: PermissionDef[];
  workflows: WorkflowDef[];
  importTypes: ImportTypeDef[];
  exportTypes: ExportTypeDef[];
  hooks: HookRegistration[];
  activate?: () => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
}
