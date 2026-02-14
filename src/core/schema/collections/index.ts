/**
 * Phase Zed.2 - Collection Schema Index
 * Imports all collection stub schemas and exports a combined array.
 */

import type { SchemaDef } from '../../types/schema';

import { coreSchemas } from './core';
import { glSchemas } from './gl';
import { jobSchemas } from './job';
import { entitySchemas } from './entity';
import { apSchemas } from './ap';
import { arSchemas } from './ar';
import { payrollSchemas } from './payroll';
import { unionSchemas } from './union';
import { equipSchemas } from './equip';
import { subSchemas } from './sub';
import { poSchemas } from './po';
import { docSchemas } from './doc';
import { projSchemas } from './proj';
import { svcSchemas } from './svc';
import { invSchemas } from './inv';
import { hrSchemas } from './hr';
import { safetySchemas } from './safety';
import { bondSchemas } from './bond';
import { bankSchemas } from './bank';
import { contractSchemas } from './contract';
import { fleetSchemas } from './fleet';
import { analyticsSchemas } from './analytics';
import { workflowSchemas } from './workflow';
import { integrationSchemas } from './integration';
import { pluginSchemas } from './plugin';
import { authSchemas } from './auth';
import { projectSchemas } from './project';

/** Combined array of all collection schemas across every module */
export const allCollectionSchemas: SchemaDef[] = [
  ...coreSchemas,
  ...glSchemas,
  ...jobSchemas,
  ...entitySchemas,
  ...apSchemas,
  ...arSchemas,
  ...payrollSchemas,
  ...unionSchemas,
  ...equipSchemas,
  ...subSchemas,
  ...poSchemas,
  ...docSchemas,
  ...projSchemas,
  ...svcSchemas,
  ...invSchemas,
  ...hrSchemas,
  ...safetySchemas,
  ...bondSchemas,
  ...bankSchemas,
  ...contractSchemas,
  ...fleetSchemas,
  ...analyticsSchemas,
  ...workflowSchemas,
  ...integrationSchemas,
  ...pluginSchemas,
  ...authSchemas,
  ...projectSchemas,
];

// Re-export individual module schema arrays for targeted access
export {
  coreSchemas,
  glSchemas,
  jobSchemas,
  entitySchemas,
  apSchemas,
  arSchemas,
  payrollSchemas,
  unionSchemas,
  equipSchemas,
  subSchemas,
  poSchemas,
  docSchemas,
  projSchemas,
  svcSchemas,
  invSchemas,
  hrSchemas,
  safetySchemas,
  bondSchemas,
  bankSchemas,
  contractSchemas,
  fleetSchemas,
  analyticsSchemas,
  workflowSchemas,
  integrationSchemas,
  pluginSchemas,
  authSchemas,
  projectSchemas,
};
