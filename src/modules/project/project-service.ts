/**
 * Concrete -- Project Management Service
 *
 * Core service layer for the Project Management module (Phase 18).
 * Provides project, milestone, and task CRUD, critical path method (CPM)
 * scheduling, earned value management (EVM), look-ahead scheduling,
 * daily logs, RFIs, submittals, meeting minutes, weather delay logging,
 * and resource allocation.
 */

import type { Collection, CollectionMeta } from '../../core/store/collection';
import type { EventBus } from '../../core/events/bus';

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type PercentCompleteMethod = 'cost' | 'units' | 'manual';
export type MilestoneStatus = 'pending' | 'completed' | 'late';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';
export type DependencyType = 'FS' | 'FF' | 'SS' | 'SF';
export type ResourceType = 'labor' | 'equipment' | 'material';
export type AllocResourceType = 'labor' | 'equipment';
export type RFIStatus = 'open' | 'answered' | 'closed' | 'overdue';
export type RFIPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SubmittalStatus = 'pending' | 'approved' | 'approved_as_noted' | 'rejected' | 'resubmit';
export type MeetingType = 'progress' | 'safety' | 'owner' | 'pre_construction';
export type WeatherType = 'rain' | 'snow' | 'wind' | 'extreme_heat' | 'extreme_cold' | 'other';

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface Project {
  [key: string]: unknown;
  name: string;
  jobId?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  baselineStartDate?: string;
  baselineEndDate?: string;
  manager?: string;
  percentComplete: number;
  percentCompleteMethod: PercentCompleteMethod;
  budgetedCost: number;
  actualCost: number;
  earnedValue: number;
  description?: string;
}

export interface Milestone {
  [key: string]: unknown;
  projectId: string;
  name: string;
  dueDate?: string;
  actualDate?: string;
  status: MilestoneStatus;
  isCritical: boolean;
  description?: string;
}

export interface Task {
  [key: string]: unknown;
  projectId: string;
  milestoneId?: string;
  name: string;
  description?: string;
  assignee?: string;
  startDate?: string;
  endDate?: string;
  baselineStart?: string;
  baselineEnd?: string;
  duration: number;
  actualStart?: string;
  actualEnd?: string;
  percentComplete: number;
  status: TaskStatus;
  isCriticalPath: boolean;
  resourceType?: ResourceType;
  budgetHours: number;
  actualHours: number;
  budgetCost: number;
  actualCost: number;
  sortOrder: number;
}

export interface TaskDependency {
  [key: string]: unknown;
  taskId: string;
  predecessorId: string;
  type: DependencyType;
  lag: number;
}

export interface DailyLog {
  [key: string]: unknown;
  projectId: string;
  date: string;
  weather?: string;
  temperature?: string;
  crew?: string;
  workPerformed?: string;
  visitors?: string;
  incidents?: string;
  notes?: string;
  photos?: string[];
}

export interface RFI {
  [key: string]: unknown;
  projectId: string;
  number: number;
  subject: string;
  question?: string;
  requestedBy?: string;
  assignedTo?: string;
  dueDate?: string;
  status: RFIStatus;
  priority: RFIPriority;
  response?: string;
  responseDate?: string;
}

export interface Submittal {
  [key: string]: unknown;
  projectId: string;
  number: number;
  specSection?: string;
  description?: string;
  submittedBy?: string;
  status: SubmittalStatus;
  submittedDate?: string;
  reviewedDate?: string;
  reviewer?: string;
  notes?: string;
}

export interface MeetingMinutes {
  [key: string]: unknown;
  projectId: string;
  date: string;
  type: MeetingType;
  attendees: string[];
  topics: string[];
  actionItems: string[];
  nextMeetingDate?: string;
  notes?: string;
}

export interface WeatherDelay {
  [key: string]: unknown;
  projectId: string;
  date: string;
  type: WeatherType;
  hoursLost: number;
  description?: string;
  impactedTasks: string[];
}

export interface ResourceAllocation {
  [key: string]: unknown;
  projectId: string;
  taskId?: string;
  resourceType: AllocResourceType;
  resourceId?: string;
  hours: number;
  startDate?: string;
  endDate?: string;
}

// ---------------------------------------------------------------------------
// Report / Result Types
// ---------------------------------------------------------------------------

export interface EVMResult {
  bcws: number;
  bcwp: number;
  acwp: number;
  cpi: number;
  spi: number;
  eac: number;
  etc: number;
  vac: number;
}

export interface ScheduleVarianceRow {
  taskId: string;
  taskName: string;
  baselineStart?: string;
  baselineEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  plannedDuration: number;
  actualDuration: number;
  varianceDays: number;
}

export interface DelayImpact {
  totalHoursLost: number;
  totalDaysLost: number;
  delaysByType: Record<string, number>;
  impactedTaskCount: number;
}

export interface ResourceLoadingRow {
  date: string;
  laborHours: number;
  equipmentHours: number;
  totalHours: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Calculate working days between two ISO date strings. */
function daysBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

/** Add days to an ISO date string, returning a new ISO date string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Get today as ISO date string. */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// ProjectService
// ---------------------------------------------------------------------------

export class ProjectService {
  constructor(
    private projects: Collection<Project>,
    private milestones: Collection<Milestone>,
    private tasks: Collection<Task>,
    private taskDependencies: Collection<TaskDependency>,
    private dailyLogs: Collection<DailyLog>,
    private rfis: Collection<RFI>,
    private submittals: Collection<Submittal>,
    private meetingMinutesColl: Collection<MeetingMinutes>,
    private weatherDelays: Collection<WeatherDelay>,
    private resourceAllocations: Collection<ResourceAllocation>,
    private events: EventBus,
  ) {}

  // ========================================================================
  // PROJECT CRUD
  // ========================================================================

  /**
   * Create a new project.
   * Defaults: status='planning', percentComplete=0, percentCompleteMethod='manual',
   * budgetedCost=0, actualCost=0, earnedValue=0.
   */
  async createProject(data: {
    name: string;
    jobId?: string;
    status?: ProjectStatus;
    startDate?: string;
    endDate?: string;
    baselineStartDate?: string;
    baselineEndDate?: string;
    manager?: string;
    percentComplete?: number;
    percentCompleteMethod?: PercentCompleteMethod;
    budgetedCost?: number;
    actualCost?: number;
    earnedValue?: number;
    description?: string;
  }): Promise<Project & CollectionMeta> {
    const record = await this.projects.insert({
      name: data.name,
      jobId: data.jobId,
      status: data.status ?? 'planning',
      startDate: data.startDate,
      endDate: data.endDate,
      baselineStartDate: data.baselineStartDate,
      baselineEndDate: data.baselineEndDate,
      manager: data.manager,
      percentComplete: data.percentComplete ?? 0,
      percentCompleteMethod: data.percentCompleteMethod ?? 'manual',
      budgetedCost: data.budgetedCost ?? 0,
      actualCost: data.actualCost ?? 0,
      earnedValue: data.earnedValue ?? 0,
      description: data.description,
    } as Project);

    this.events.emit('project.created', { project: record });
    return record;
  }

  /**
   * Update an existing project.
   */
  async updateProject(
    id: string,
    changes: Partial<Project>,
  ): Promise<Project & CollectionMeta> {
    const existing = await this.projects.get(id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    const updated = await this.projects.update(id, changes as Partial<Project>);
    this.events.emit('project.updated', { project: updated });
    return updated;
  }

  /**
   * Delete a project and all associated records.
   */
  async deleteProject(id: string): Promise<void> {
    const existing = await this.projects.get(id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    await this.projects.remove(id);
  }

  /**
   * Get a single project by ID.
   */
  async getProject(id: string): Promise<(Project & CollectionMeta) | null> {
    return this.projects.get(id);
  }

  /**
   * Get projects with optional filters, ordered by name.
   */
  async getProjects(filters?: {
    status?: ProjectStatus;
    jobId?: string;
  }): Promise<(Project & CollectionMeta)[]> {
    const q = this.projects.query();

    if (filters?.status) {
      q.where('status', '=', filters.status);
    }
    if (filters?.jobId) {
      q.where('jobId', '=', filters.jobId);
    }

    q.orderBy('name', 'asc');
    return q.execute();
  }

  // ========================================================================
  // MILESTONE CRUD
  // ========================================================================

  /**
   * Create a milestone for a project.
   * Defaults: status='pending', isCritical=false.
   */
  async createMilestone(data: {
    projectId: string;
    name: string;
    dueDate?: string;
    actualDate?: string;
    status?: MilestoneStatus;
    isCritical?: boolean;
    description?: string;
  }): Promise<Milestone & CollectionMeta> {
    const project = await this.projects.get(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const record = await this.milestones.insert({
      projectId: data.projectId,
      name: data.name,
      dueDate: data.dueDate,
      actualDate: data.actualDate,
      status: data.status ?? 'pending',
      isCritical: data.isCritical ?? false,
      description: data.description,
    } as Milestone);

    return record;
  }

  /**
   * Update an existing milestone.
   */
  async updateMilestone(
    id: string,
    changes: Partial<Milestone>,
  ): Promise<Milestone & CollectionMeta> {
    const existing = await this.milestones.get(id);
    if (!existing) {
      throw new Error(`Milestone not found: ${id}`);
    }

    const updated = await this.milestones.update(id, changes as Partial<Milestone>);
    return updated;
  }

  /**
   * Mark a milestone as completed.
   */
  async completeMilestone(id: string, actualDate?: string): Promise<Milestone & CollectionMeta> {
    const existing = await this.milestones.get(id);
    if (!existing) {
      throw new Error(`Milestone not found: ${id}`);
    }

    const updated = await this.milestones.update(id, {
      status: 'completed',
      actualDate: actualDate ?? today(),
    } as Partial<Milestone>);

    this.events.emit('project.milestone.completed', { milestone: updated });
    return updated;
  }

  /**
   * Get milestones for a project.
   */
  async getMilestones(projectId: string): Promise<(Milestone & CollectionMeta)[]> {
    return this.milestones
      .query()
      .where('projectId', '=', projectId)
      .orderBy('dueDate', 'asc')
      .execute();
  }

  // ========================================================================
  // TASK CRUD
  // ========================================================================

  /**
   * Create a task for a project.
   * Defaults: status='not_started', percentComplete=0, isCriticalPath=false,
   * budgetHours=0, actualHours=0, budgetCost=0, actualCost=0, duration=0, sortOrder=0.
   */
  async createTask(data: {
    projectId: string;
    milestoneId?: string;
    name: string;
    description?: string;
    assignee?: string;
    startDate?: string;
    endDate?: string;
    baselineStart?: string;
    baselineEnd?: string;
    duration?: number;
    actualStart?: string;
    actualEnd?: string;
    percentComplete?: number;
    status?: TaskStatus;
    isCriticalPath?: boolean;
    resourceType?: ResourceType;
    budgetHours?: number;
    actualHours?: number;
    budgetCost?: number;
    actualCost?: number;
    sortOrder?: number;
  }): Promise<Task & CollectionMeta> {
    const project = await this.projects.get(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const record = await this.tasks.insert({
      projectId: data.projectId,
      milestoneId: data.milestoneId,
      name: data.name,
      description: data.description,
      assignee: data.assignee,
      startDate: data.startDate,
      endDate: data.endDate,
      baselineStart: data.baselineStart,
      baselineEnd: data.baselineEnd,
      duration: data.duration ?? 0,
      actualStart: data.actualStart,
      actualEnd: data.actualEnd,
      percentComplete: data.percentComplete ?? 0,
      status: data.status ?? 'not_started',
      isCriticalPath: data.isCriticalPath ?? false,
      resourceType: data.resourceType,
      budgetHours: data.budgetHours ?? 0,
      actualHours: data.actualHours ?? 0,
      budgetCost: data.budgetCost ?? 0,
      actualCost: data.actualCost ?? 0,
      sortOrder: data.sortOrder ?? 0,
    } as Task);

    this.events.emit('project.task.created', { task: record });
    return record;
  }

  /**
   * Update an existing task.
   */
  async updateTask(
    id: string,
    changes: Partial<Task>,
  ): Promise<Task & CollectionMeta> {
    const existing = await this.tasks.get(id);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    const updated = await this.tasks.update(id, changes as Partial<Task>);
    return updated;
  }

  /**
   * Mark a task as completed.
   */
  async completeTask(id: string, actualEnd?: string): Promise<Task & CollectionMeta> {
    const existing = await this.tasks.get(id);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    const updated = await this.tasks.update(id, {
      status: 'completed',
      percentComplete: 100,
      actualEnd: actualEnd ?? today(),
    } as Partial<Task>);

    this.events.emit('project.task.completed', { task: updated });
    return updated;
  }

  /**
   * Get tasks for a project, ordered by sortOrder.
   */
  async getTasks(projectId: string): Promise<(Task & CollectionMeta)[]> {
    return this.tasks
      .query()
      .where('projectId', '=', projectId)
      .orderBy('sortOrder', 'asc')
      .execute();
  }

  /**
   * Get tasks for a specific milestone.
   */
  async getTasksByMilestone(milestoneId: string): Promise<(Task & CollectionMeta)[]> {
    return this.tasks
      .query()
      .where('milestoneId', '=', milestoneId)
      .orderBy('sortOrder', 'asc')
      .execute();
  }

  // ========================================================================
  // TASK DEPENDENCIES
  // ========================================================================

  /**
   * Add a dependency between tasks.
   * Defaults: type='FS', lag=0.
   */
  async addDependency(data: {
    taskId: string;
    predecessorId: string;
    type?: DependencyType;
    lag?: number;
  }): Promise<TaskDependency & CollectionMeta> {
    // Validate both tasks exist
    const task = await this.tasks.get(data.taskId);
    if (!task) {
      throw new Error(`Task not found: ${data.taskId}`);
    }
    const predecessor = await this.tasks.get(data.predecessorId);
    if (!predecessor) {
      throw new Error(`Predecessor task not found: ${data.predecessorId}`);
    }

    // Prevent self-dependency
    if (data.taskId === data.predecessorId) {
      throw new Error('A task cannot depend on itself.');
    }

    const record = await this.taskDependencies.insert({
      taskId: data.taskId,
      predecessorId: data.predecessorId,
      type: data.type ?? 'FS',
      lag: data.lag ?? 0,
    } as TaskDependency);

    return record;
  }

  /**
   * Remove a dependency.
   */
  async removeDependency(id: string): Promise<void> {
    const existing = await this.taskDependencies.get(id);
    if (!existing) {
      throw new Error(`Dependency not found: ${id}`);
    }

    await this.taskDependencies.remove(id);
  }

  /**
   * Get all dependencies for a task (where task is the dependent).
   */
  async getDependencies(taskId: string): Promise<(TaskDependency & CollectionMeta)[]> {
    return this.taskDependencies
      .query()
      .where('taskId', '=', taskId)
      .execute();
  }

  /**
   * Get all dependencies for a project (all tasks in the project).
   */
  async getProjectDependencies(projectId: string): Promise<(TaskDependency & CollectionMeta)[]> {
    const projectTasks = await this.getTasks(projectId);
    const taskIds = new Set(projectTasks.map(t => t.id));
    const allDeps = await this.taskDependencies.query().execute();
    return allDeps.filter(d => taskIds.has(d.taskId));
  }

  // ========================================================================
  // CRITICAL PATH METHOD (CPM)
  // ========================================================================

  /**
   * Calculate the critical path for a project.
   * Uses forward pass / backward pass on task durations and dependencies.
   * Returns the list of tasks on the critical path.
   */
  async calculateCriticalPath(projectId: string): Promise<(Task & CollectionMeta)[]> {
    const allTasks = await this.getTasks(projectId);
    const allDeps = await this.getProjectDependencies(projectId);

    if (allTasks.length === 0) return [];

    // Build adjacency: taskId -> list of { predecessorId, lag }
    const predecessorMap = new Map<string, { predecessorId: string; lag: number }[]>();
    // Build successors: predecessorId -> list of { taskId, lag }
    const successorMap = new Map<string, { taskId: string; lag: number }[]>();

    for (const dep of allDeps) {
      const preds = predecessorMap.get(dep.taskId) ?? [];
      preds.push({ predecessorId: dep.predecessorId, lag: dep.lag });
      predecessorMap.set(dep.taskId, preds);

      const succs = successorMap.get(dep.predecessorId) ?? [];
      succs.push({ taskId: dep.taskId, lag: dep.lag });
      successorMap.set(dep.predecessorId, succs);
    }

    // Earliest start / earliest finish
    const es = new Map<string, number>();
    const ef = new Map<string, number>();
    const taskMap = new Map<string, Task & CollectionMeta>();

    for (const task of allTasks) {
      taskMap.set(task.id, task);
    }

    // Topological sort via Kahn's algorithm
    const inDegree = new Map<string, number>();
    for (const task of allTasks) {
      inDegree.set(task.id, 0);
    }
    for (const dep of allDeps) {
      inDegree.set(dep.taskId, (inDegree.get(dep.taskId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      const succs = successorMap.get(current) ?? [];
      for (const s of succs) {
        const newDeg = (inDegree.get(s.taskId) ?? 1) - 1;
        inDegree.set(s.taskId, newDeg);
        if (newDeg === 0) {
          queue.push(s.taskId);
        }
      }
    }

    // Forward pass
    for (const taskId of sorted) {
      const task = taskMap.get(taskId)!;
      const preds = predecessorMap.get(taskId) ?? [];
      let earliest = 0;

      for (const p of preds) {
        const predFinish = ef.get(p.predecessorId) ?? 0;
        earliest = Math.max(earliest, predFinish + p.lag);
      }

      es.set(taskId, earliest);
      ef.set(taskId, earliest + (task.duration || 0));
    }

    // Find project duration (max EF)
    let projectDuration = 0;
    for (const val of ef.values()) {
      if (val > projectDuration) projectDuration = val;
    }

    // Backward pass
    const ls = new Map<string, number>();
    const lf = new Map<string, number>();

    for (let i = sorted.length - 1; i >= 0; i--) {
      const taskId = sorted[i];
      const task = taskMap.get(taskId)!;
      const succs = successorMap.get(taskId) ?? [];

      let latest = projectDuration;
      for (const s of succs) {
        const succStart = ls.get(s.taskId) ?? projectDuration;
        latest = Math.min(latest, succStart - s.lag);
      }

      lf.set(taskId, latest);
      ls.set(taskId, latest - (task.duration || 0));
    }

    // Critical path: tasks where ES == LS (zero float)
    const criticalTasks: (Task & CollectionMeta)[] = [];
    for (const taskId of sorted) {
      const earlyStart = es.get(taskId) ?? 0;
      const lateStart = ls.get(taskId) ?? 0;
      const floatVal = lateStart - earlyStart;

      if (Math.abs(floatVal) < 0.001) {
        const task = taskMap.get(taskId)!;
        criticalTasks.push(task);
      }
    }

    // Update tasks' isCriticalPath flag
    const criticalIds = new Set(criticalTasks.map(t => t.id));
    for (const task of allTasks) {
      const shouldBeCritical = criticalIds.has(task.id);
      if (task.isCriticalPath !== shouldBeCritical) {
        await this.tasks.update(task.id, {
          isCriticalPath: shouldBeCritical,
        } as Partial<Task>);
      }
    }

    return criticalTasks;
  }

  // ========================================================================
  // EARNED VALUE MANAGEMENT (EVM)
  // ========================================================================

  /**
   * Calculate earned value metrics for a project.
   *
   * BCWS (Budgeted Cost of Work Scheduled) = sum of budgetCost for tasks that
   *   should be done by now (based on schedule).
   * BCWP (Budgeted Cost of Work Performed) = sum of (budgetCost * percentComplete/100).
   * ACWP (Actual Cost of Work Performed) = sum of actualCost for all tasks.
   * CPI = BCWP / ACWP
   * SPI = BCWP / BCWS
   * EAC = budgetedCost / CPI (Estimate at Completion)
   * ETC = EAC - ACWP (Estimate to Complete)
   * VAC = budgetedCost - EAC (Variance at Completion)
   */
  async calculateEVM(projectId: string): Promise<EVMResult> {
    const project = await this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const allTasks = await this.getTasks(projectId);
    const todayStr = today();

    // BCWS: budget cost of tasks that should be complete or in progress by today
    let bcws = 0;
    let bcwp = 0;
    let acwp = 0;

    for (const task of allTasks) {
      // BCWP: earned value based on percent complete
      bcwp += round2((task.budgetCost || 0) * ((task.percentComplete || 0) / 100));

      // ACWP: actual costs
      acwp += task.actualCost || 0;

      // BCWS: if the task's planned end date is on or before today, full budget is scheduled
      if (task.endDate && task.endDate <= todayStr) {
        bcws += task.budgetCost || 0;
      } else if (task.startDate && task.startDate <= todayStr && task.endDate) {
        // Partially scheduled: pro-rate based on elapsed time vs duration
        const totalDays = daysBetween(task.startDate, task.endDate);
        const elapsedDays = daysBetween(task.startDate, todayStr);
        if (totalDays > 0) {
          const fraction = Math.min(elapsedDays / totalDays, 1);
          bcws += round2((task.budgetCost || 0) * fraction);
        }
      }
    }

    bcws = round2(bcws);
    bcwp = round2(bcwp);
    acwp = round2(acwp);

    const cpi = acwp > 0 ? round2(bcwp / acwp) : 0;
    const spi = bcws > 0 ? round2(bcwp / bcws) : 0;
    const eac = cpi > 0 ? round2(project.budgetedCost / cpi) : 0;
    const etc = round2(Math.max(0, eac - acwp));
    const vac = round2(project.budgetedCost - eac);

    return { bcws, bcwp, acwp, cpi, spi, eac, etc, vac };
  }

  // ========================================================================
  // PERCENT COMPLETE
  // ========================================================================

  /**
   * Update percent complete for a task using specified method.
   * - manual: directly set the value
   * - cost: calculate from actualCost / budgetCost
   * - units: calculate from actualHours / budgetHours
   */
  async updatePercentComplete(
    taskId: string,
    method: PercentCompleteMethod,
    value?: number,
  ): Promise<Task & CollectionMeta> {
    const task = await this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    let pct = 0;

    switch (method) {
      case 'manual':
        pct = Math.min(100, Math.max(0, value ?? 0));
        break;
      case 'cost':
        pct = task.budgetCost > 0
          ? Math.min(100, round2((task.actualCost / task.budgetCost) * 100))
          : 0;
        break;
      case 'units':
        pct = task.budgetHours > 0
          ? Math.min(100, round2((task.actualHours / task.budgetHours) * 100))
          : 0;
        break;
    }

    let status: TaskStatus = task.status;
    if (pct >= 100) {
      status = 'completed';
    } else if (pct > 0 && status === 'not_started') {
      status = 'in_progress';
    }

    const updated = await this.tasks.update(taskId, {
      percentComplete: round2(pct),
      status,
    } as Partial<Task>);

    return updated;
  }

  // ========================================================================
  // LOOK-AHEAD SCHEDULING
  // ========================================================================

  /**
   * Get look-ahead tasks for a project within a specified number of weeks.
   * Returns tasks whose start date falls within [today, today + weeks*7 days].
   */
  async getLookAhead(
    projectId: string,
    weeks: number,
  ): Promise<(Task & CollectionMeta)[]> {
    const allTasks = await this.getTasks(projectId);
    const todayStr = today();
    const endStr = addDays(todayStr, weeks * 7);

    return allTasks.filter(task => {
      const taskStart = task.startDate || task.actualStart;
      const taskEnd = task.endDate || task.actualEnd;
      if (!taskStart) return false;

      // Task overlaps with the look-ahead window
      // Task starts before the window ends AND task ends after window starts
      const effectiveEnd = taskEnd || taskStart;
      return taskStart <= endStr && effectiveEnd >= todayStr;
    });
  }

  // ========================================================================
  // SCHEDULE VARIANCE
  // ========================================================================

  /**
   * Get baseline vs. actual schedule comparison.
   * Returns variance information for each task that has baseline dates.
   */
  async getScheduleVariance(projectId: string): Promise<ScheduleVarianceRow[]> {
    const allTasks = await this.getTasks(projectId);
    const rows: ScheduleVarianceRow[] = [];

    for (const task of allTasks) {
      const baselineStart = task.baselineStart;
      const baselineEnd = task.baselineEnd;
      const actualStart = task.actualStart || task.startDate;
      const actualEnd = task.actualEnd || task.endDate;

      const plannedDuration = baselineStart && baselineEnd
        ? daysBetween(baselineStart, baselineEnd)
        : task.duration || 0;

      const actualDuration = actualStart && actualEnd
        ? daysBetween(actualStart, actualEnd)
        : 0;

      let varianceDays = 0;
      if (baselineEnd && actualEnd) {
        varianceDays = daysBetween(baselineEnd, actualEnd);
        // If actual end is before baseline end, variance is negative (ahead of schedule)
        if (actualEnd < baselineEnd) {
          varianceDays = -daysBetween(actualEnd, baselineEnd);
        }
      }

      rows.push({
        taskId: task.id,
        taskName: task.name,
        baselineStart,
        baselineEnd,
        actualStart,
        actualEnd,
        plannedDuration,
        actualDuration,
        varianceDays,
      });
    }

    return rows;
  }

  // ========================================================================
  // DAILY LOG
  // ========================================================================

  /**
   * Create a daily log entry.
   */
  async createDailyLog(data: {
    projectId: string;
    date: string;
    weather?: string;
    temperature?: string;
    crew?: string;
    workPerformed?: string;
    visitors?: string;
    incidents?: string;
    notes?: string;
    photos?: string[];
  }): Promise<DailyLog & CollectionMeta> {
    const project = await this.projects.get(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const record = await this.dailyLogs.insert({
      projectId: data.projectId,
      date: data.date,
      weather: data.weather,
      temperature: data.temperature,
      crew: data.crew,
      workPerformed: data.workPerformed,
      visitors: data.visitors,
      incidents: data.incidents,
      notes: data.notes,
      photos: data.photos ?? [],
    } as DailyLog);

    this.events.emit('project.dailylog.created', { dailyLog: record });
    return record;
  }

  /**
   * Get daily logs for a project, ordered by date descending.
   */
  async getDailyLogs(projectId: string): Promise<(DailyLog & CollectionMeta)[]> {
    return this.dailyLogs
      .query()
      .where('projectId', '=', projectId)
      .orderBy('date', 'desc')
      .execute();
  }

  /**
   * Update a daily log entry.
   */
  async updateDailyLog(
    id: string,
    changes: Partial<DailyLog>,
  ): Promise<DailyLog & CollectionMeta> {
    const existing = await this.dailyLogs.get(id);
    if (!existing) {
      throw new Error(`Daily log not found: ${id}`);
    }

    const updated = await this.dailyLogs.update(id, changes as Partial<DailyLog>);
    return updated;
  }

  // ========================================================================
  // RFI MANAGEMENT
  // ========================================================================

  /**
   * Create a new RFI.
   * Defaults: status='open', priority='medium'.
   */
  async createRFI(data: {
    projectId: string;
    number: number;
    subject: string;
    question?: string;
    requestedBy?: string;
    assignedTo?: string;
    dueDate?: string;
    status?: RFIStatus;
    priority?: RFIPriority;
  }): Promise<RFI & CollectionMeta> {
    const project = await this.projects.get(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const record = await this.rfis.insert({
      projectId: data.projectId,
      number: data.number,
      subject: data.subject,
      question: data.question,
      requestedBy: data.requestedBy,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      status: data.status ?? 'open',
      priority: data.priority ?? 'medium',
    } as RFI);

    this.events.emit('project.rfi.created', { rfi: record });
    return record;
  }

  /**
   * Respond to an RFI. Sets response, responseDate, and status to 'answered'.
   */
  async respondToRFI(
    id: string,
    response: string,
    responseDate?: string,
  ): Promise<RFI & CollectionMeta> {
    const existing = await this.rfis.get(id);
    if (!existing) {
      throw new Error(`RFI not found: ${id}`);
    }

    const updated = await this.rfis.update(id, {
      response,
      responseDate: responseDate ?? today(),
      status: 'answered',
    } as Partial<RFI>);

    this.events.emit('project.rfi.answered', { rfi: updated });
    return updated;
  }

  /**
   * Close an RFI.
   */
  async closeRFI(id: string): Promise<RFI & CollectionMeta> {
    const existing = await this.rfis.get(id);
    if (!existing) {
      throw new Error(`RFI not found: ${id}`);
    }

    const updated = await this.rfis.update(id, {
      status: 'closed',
    } as Partial<RFI>);

    return updated;
  }

  /**
   * Get RFIs for a project, ordered by number.
   */
  async listRFIs(projectId: string): Promise<(RFI & CollectionMeta)[]> {
    return this.rfis
      .query()
      .where('projectId', '=', projectId)
      .orderBy('number', 'asc')
      .execute();
  }

  /**
   * Get RFIs filtered by status.
   */
  async getRFIsByStatus(
    projectId: string,
    status: RFIStatus,
  ): Promise<(RFI & CollectionMeta)[]> {
    return this.rfis
      .query()
      .where('projectId', '=', projectId)
      .where('status', '=', status)
      .orderBy('number', 'asc')
      .execute();
  }

  // ========================================================================
  // SUBMITTAL MANAGEMENT
  // ========================================================================

  /**
   * Create a new submittal.
   * Defaults: status='pending'.
   */
  async createSubmittal(data: {
    projectId: string;
    number: number;
    specSection?: string;
    description?: string;
    submittedBy?: string;
    status?: SubmittalStatus;
    submittedDate?: string;
    notes?: string;
  }): Promise<Submittal & CollectionMeta> {
    const project = await this.projects.get(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const record = await this.submittals.insert({
      projectId: data.projectId,
      number: data.number,
      specSection: data.specSection,
      description: data.description,
      submittedBy: data.submittedBy,
      status: data.status ?? 'pending',
      submittedDate: data.submittedDate,
      notes: data.notes,
    } as Submittal);

    return record;
  }

  /**
   * Review a submittal. Sets reviewer, reviewedDate, and new status.
   */
  async reviewSubmittal(
    id: string,
    reviewer: string,
    status: SubmittalStatus,
    reviewedDate?: string,
  ): Promise<Submittal & CollectionMeta> {
    const existing = await this.submittals.get(id);
    if (!existing) {
      throw new Error(`Submittal not found: ${id}`);
    }

    const updated = await this.submittals.update(id, {
      reviewer,
      status,
      reviewedDate: reviewedDate ?? today(),
    } as Partial<Submittal>);

    this.events.emit('project.submittal.reviewed', { submittal: updated });
    return updated;
  }

  /**
   * Get submittals for a project, ordered by number.
   */
  async listSubmittals(projectId: string): Promise<(Submittal & CollectionMeta)[]> {
    return this.submittals
      .query()
      .where('projectId', '=', projectId)
      .orderBy('number', 'asc')
      .execute();
  }

  // ========================================================================
  // MEETING MINUTES
  // ========================================================================

  /**
   * Create meeting minutes.
   */
  async createMeetingMinutes(data: {
    projectId: string;
    date: string;
    type: MeetingType;
    attendees?: string[];
    topics?: string[];
    actionItems?: string[];
    nextMeetingDate?: string;
    notes?: string;
  }): Promise<MeetingMinutes & CollectionMeta> {
    const project = await this.projects.get(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const record = await this.meetingMinutesColl.insert({
      projectId: data.projectId,
      date: data.date,
      type: data.type,
      attendees: data.attendees ?? [],
      topics: data.topics ?? [],
      actionItems: data.actionItems ?? [],
      nextMeetingDate: data.nextMeetingDate,
      notes: data.notes,
    } as MeetingMinutes);

    return record;
  }

  /**
   * Get meeting minutes for a project, ordered by date descending.
   */
  async listMeetingMinutes(projectId: string): Promise<(MeetingMinutes & CollectionMeta)[]> {
    return this.meetingMinutesColl
      .query()
      .where('projectId', '=', projectId)
      .orderBy('date', 'desc')
      .execute();
  }

  // ========================================================================
  // WEATHER DELAYS
  // ========================================================================

  /**
   * Log a weather delay.
   */
  async logWeatherDelay(data: {
    projectId: string;
    date: string;
    type: WeatherType;
    hoursLost: number;
    description?: string;
    impactedTasks?: string[];
  }): Promise<WeatherDelay & CollectionMeta> {
    const project = await this.projects.get(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    const record = await this.weatherDelays.insert({
      projectId: data.projectId,
      date: data.date,
      type: data.type,
      hoursLost: data.hoursLost,
      description: data.description,
      impactedTasks: data.impactedTasks ?? [],
    } as WeatherDelay);

    return record;
  }

  /**
   * Get weather delays for a project, ordered by date descending.
   */
  async getWeatherDelays(projectId: string): Promise<(WeatherDelay & CollectionMeta)[]> {
    return this.weatherDelays
      .query()
      .where('projectId', '=', projectId)
      .orderBy('date', 'desc')
      .execute();
  }

  /**
   * Calculate the total delay impact for a project.
   */
  async calculateDelayImpact(projectId: string): Promise<DelayImpact> {
    const delays = await this.getWeatherDelays(projectId);

    let totalHoursLost = 0;
    const delaysByType: Record<string, number> = {};
    const impactedTaskSet = new Set<string>();

    for (const delay of delays) {
      totalHoursLost += delay.hoursLost || 0;

      const typeKey = delay.type;
      delaysByType[typeKey] = (delaysByType[typeKey] || 0) + (delay.hoursLost || 0);

      if (delay.impactedTasks) {
        for (const taskId of delay.impactedTasks) {
          impactedTaskSet.add(taskId);
        }
      }
    }

    return {
      totalHoursLost: round2(totalHoursLost),
      totalDaysLost: round2(totalHoursLost / 8),
      delaysByType,
      impactedTaskCount: impactedTaskSet.size,
    };
  }

  // ========================================================================
  // RESOURCE LOADING
  // ========================================================================

  /**
   * Allocate a resource to a project/task.
   */
  async allocateResource(data: {
    projectId: string;
    taskId?: string;
    resourceType: AllocResourceType;
    resourceId?: string;
    hours: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ResourceAllocation & CollectionMeta> {
    const project = await this.projects.get(data.projectId);
    if (!project) {
      throw new Error(`Project not found: ${data.projectId}`);
    }

    if (data.taskId) {
      const task = await this.tasks.get(data.taskId);
      if (!task) {
        throw new Error(`Task not found: ${data.taskId}`);
      }
    }

    const record = await this.resourceAllocations.insert({
      projectId: data.projectId,
      taskId: data.taskId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      hours: data.hours,
      startDate: data.startDate,
      endDate: data.endDate,
    } as ResourceAllocation);

    return record;
  }

  /**
   * Get resource loading for a project within a date range.
   * Aggregates labor and equipment hours by date.
   */
  async getResourceLoading(
    projectId: string,
    dateRange: { start: string; end: string },
  ): Promise<ResourceLoadingRow[]> {
    const allocations = await this.resourceAllocations
      .query()
      .where('projectId', '=', projectId)
      .execute();

    // Build a map of date -> { labor, equipment }
    const dateMap = new Map<string, { labor: number; equipment: number }>();

    // Initialize all dates in range
    let current = dateRange.start;
    while (current <= dateRange.end) {
      dateMap.set(current, { labor: 0, equipment: 0 });
      current = addDays(current, 1);
    }

    for (const alloc of allocations) {
      const allocStart = alloc.startDate || dateRange.start;
      const allocEnd = alloc.endDate || dateRange.end;

      // Skip if completely outside range
      if (allocEnd < dateRange.start || allocStart > dateRange.end) continue;

      const effectiveStart = allocStart < dateRange.start ? dateRange.start : allocStart;
      const effectiveEnd = allocEnd > dateRange.end ? dateRange.end : allocEnd;
      const allocDays = Math.max(1, daysBetween(effectiveStart, effectiveEnd) + 1);
      const hoursPerDay = allocDays > 0 ? round2(alloc.hours / allocDays) : 0;

      let d = effectiveStart;
      while (d <= effectiveEnd) {
        if (!dateMap.has(d)) {
          dateMap.set(d, { labor: 0, equipment: 0 });
        }
        const entry = dateMap.get(d)!;
        if (alloc.resourceType === 'labor') {
          entry.labor = round2(entry.labor + hoursPerDay);
        } else {
          entry.equipment = round2(entry.equipment + hoursPerDay);
        }
        d = addDays(d, 1);
      }
    }

    const rows: ResourceLoadingRow[] = [];
    const sortedDates = Array.from(dateMap.keys()).sort();
    for (const date of sortedDates) {
      const entry = dateMap.get(date)!;
      rows.push({
        date,
        laborHours: entry.labor,
        equipmentHours: entry.equipment,
        totalHours: round2(entry.labor + entry.equipment),
      });
    }

    return rows;
  }
}
