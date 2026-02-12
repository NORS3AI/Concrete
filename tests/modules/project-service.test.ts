/**
 * Project Service Tests
 * Tests for the Project Management business logic layer (Phase 18).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectService } from '../../src/modules/project/project-service';
import type {
  Project, Milestone, Task, TaskDependency,
  DailyLog, RFI, Submittal, MeetingMinutes,
  WeatherDelay, ResourceAllocation,
} from '../../src/modules/project/project-service';
import { Collection } from '../../src/core/store/collection';
import { EventBus } from '../../src/core/events/bus';
import { SchemaRegistry } from '../../src/core/schema/registry';
import { LocalStorageAdapter } from '../../src/core/store/local-storage';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createTestService() {
  const adapter = new LocalStorageAdapter();
  const events = new EventBus();
  const schemas = new SchemaRegistry();

  const projects = new Collection<Project>('project/project', adapter, schemas, events);
  const milestones = new Collection<Milestone>('project/milestone', adapter, schemas, events);
  const tasks = new Collection<Task>('project/task', adapter, schemas, events);
  const taskDependencies = new Collection<TaskDependency>('project/taskDependency', adapter, schemas, events);
  const dailyLogs = new Collection<DailyLog>('project/dailyLog', adapter, schemas, events);
  const rfis = new Collection<RFI>('project/rfi', adapter, schemas, events);
  const submittals = new Collection<Submittal>('project/submittal', adapter, schemas, events);
  const meetingMinutes = new Collection<MeetingMinutes>('project/meetingMinutes', adapter, schemas, events);
  const weatherDelays = new Collection<WeatherDelay>('project/weatherDelay', adapter, schemas, events);
  const resourceAllocations = new Collection<ResourceAllocation>('project/resourceAllocation', adapter, schemas, events);

  const service = new ProjectService(
    projects, milestones, tasks, taskDependencies,
    dailyLogs, rfis, submittals, meetingMinutes,
    weatherDelays, resourceAllocations, events,
  );

  return { service, events };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProjectService', () => {
  let service: ProjectService;
  let events: EventBus;

  beforeEach(() => {
    localStorage.clear();
    const ctx = createTestService();
    service = ctx.service;
    events = ctx.events;
  });

  // ==========================================================================
  // Project CRUD
  // ==========================================================================

  describe('Project CRUD', () => {
    it('creates a project with defaults', async () => {
      const project = await service.createProject({
        name: 'Highway Bridge Reconstruction',
      });

      expect(project.name).toBe('Highway Bridge Reconstruction');
      expect(project.status).toBe('planning');
      expect(project.percentComplete).toBe(0);
      expect(project.percentCompleteMethod).toBe('manual');
      expect(project.budgetedCost).toBe(0);
      expect(project.actualCost).toBe(0);
      expect(project.earnedValue).toBe(0);
    });

    it('creates a project with all fields', async () => {
      const project = await service.createProject({
        name: 'Office Tower',
        jobId: 'job-1',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        baselineStartDate: '2026-01-01',
        baselineEndDate: '2026-12-31',
        manager: 'John Smith',
        budgetedCost: 5000000,
        percentCompleteMethod: 'cost',
      });

      expect(project.status).toBe('active');
      expect(project.manager).toBe('John Smith');
      expect(project.budgetedCost).toBe(5000000);
      expect(project.percentCompleteMethod).toBe('cost');
    });

    it('updates a project', async () => {
      const project = await service.createProject({ name: 'Test Project' });
      const updated = await service.updateProject(project.id, {
        status: 'active',
        manager: 'Jane Doe',
      });

      expect(updated.status).toBe('active');
      expect(updated.manager).toBe('Jane Doe');
    });

    it('deletes a project', async () => {
      const project = await service.createProject({ name: 'Test Project' });
      await service.deleteProject(project.id);
      const found = await service.getProject(project.id);
      expect(found).toBeNull();
    });

    it('filters projects by status', async () => {
      await service.createProject({ name: 'Active Project', status: 'active' });
      await service.createProject({ name: 'Planning Project', status: 'planning' });

      const active = await service.getProjects({ status: 'active' });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active Project');
    });

    it('filters projects by jobId', async () => {
      await service.createProject({ name: 'Project A', jobId: 'job-1' });
      await service.createProject({ name: 'Project B', jobId: 'job-2' });

      const filtered = await service.getProjects({ jobId: 'job-1' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Project A');
    });

    it('throws when updating non-existent project', async () => {
      await expect(
        service.updateProject('non-existent', { name: 'X' }),
      ).rejects.toThrow('Project not found');
    });
  });

  // ==========================================================================
  // Milestone CRUD
  // ==========================================================================

  describe('Milestone CRUD', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'Test Project' });
      projectId = project.id;
    });

    it('creates a milestone with defaults', async () => {
      const milestone = await service.createMilestone({
        projectId,
        name: 'Foundation Complete',
        dueDate: '2026-06-01',
      });

      expect(milestone.name).toBe('Foundation Complete');
      expect(milestone.status).toBe('pending');
      expect(milestone.isCritical).toBe(false);
    });

    it('completes a milestone', async () => {
      const milestone = await service.createMilestone({
        projectId,
        name: 'Foundation Complete',
        dueDate: '2026-06-01',
      });

      const completed = await service.completeMilestone(milestone.id, '2026-05-28');
      expect(completed.status).toBe('completed');
      expect(completed.actualDate).toBe('2026-05-28');
    });

    it('lists milestones by project', async () => {
      await service.createMilestone({ projectId, name: 'MS-1', dueDate: '2026-03-01' });
      await service.createMilestone({ projectId, name: 'MS-2', dueDate: '2026-06-01' });

      const milestones = await service.getMilestones(projectId);
      expect(milestones).toHaveLength(2);
      // Ordered by dueDate ascending
      expect(milestones[0].name).toBe('MS-1');
      expect(milestones[1].name).toBe('MS-2');
    });

    it('throws when creating milestone for non-existent project', async () => {
      await expect(
        service.createMilestone({ projectId: 'non-existent', name: 'MS' }),
      ).rejects.toThrow('Project not found');
    });
  });

  // ==========================================================================
  // Task CRUD with Dependencies
  // ==========================================================================

  describe('Task CRUD', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'Test Project' });
      projectId = project.id;
    });

    it('creates a task with defaults', async () => {
      const task = await service.createTask({
        projectId,
        name: 'Excavation',
      });

      expect(task.name).toBe('Excavation');
      expect(task.status).toBe('not_started');
      expect(task.percentComplete).toBe(0);
      expect(task.isCriticalPath).toBe(false);
      expect(task.budgetHours).toBe(0);
      expect(task.actualHours).toBe(0);
      expect(task.budgetCost).toBe(0);
      expect(task.actualCost).toBe(0);
      expect(task.duration).toBe(0);
    });

    it('completes a task', async () => {
      const task = await service.createTask({
        projectId,
        name: 'Excavation',
        status: 'in_progress',
      });

      const completed = await service.completeTask(task.id, '2026-03-15');
      expect(completed.status).toBe('completed');
      expect(completed.percentComplete).toBe(100);
      expect(completed.actualEnd).toBe('2026-03-15');
    });

    it('adds and retrieves task dependencies', async () => {
      const taskA = await service.createTask({ projectId, name: 'Task A', duration: 5 });
      const taskB = await service.createTask({ projectId, name: 'Task B', duration: 3 });

      const dep = await service.addDependency({
        taskId: taskB.id,
        predecessorId: taskA.id,
        type: 'FS',
        lag: 1,
      });

      expect(dep.taskId).toBe(taskB.id);
      expect(dep.predecessorId).toBe(taskA.id);
      expect(dep.type).toBe('FS');
      expect(dep.lag).toBe(1);

      const deps = await service.getDependencies(taskB.id);
      expect(deps).toHaveLength(1);
    });

    it('prevents self-dependency', async () => {
      const task = await service.createTask({ projectId, name: 'Task A' });

      await expect(
        service.addDependency({ taskId: task.id, predecessorId: task.id }),
      ).rejects.toThrow('cannot depend on itself');
    });

    it('removes a dependency', async () => {
      const taskA = await service.createTask({ projectId, name: 'Task A' });
      const taskB = await service.createTask({ projectId, name: 'Task B' });

      const dep = await service.addDependency({
        taskId: taskB.id,
        predecessorId: taskA.id,
      });

      await service.removeDependency(dep.id);
      const deps = await service.getDependencies(taskB.id);
      expect(deps).toHaveLength(0);
    });

    it('lists tasks by project ordered by sortOrder', async () => {
      await service.createTask({ projectId, name: 'Task B', sortOrder: 2 });
      await service.createTask({ projectId, name: 'Task A', sortOrder: 1 });

      const tasks = await service.getTasks(projectId);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].name).toBe('Task A');
      expect(tasks[1].name).toBe('Task B');
    });
  });

  // ==========================================================================
  // Critical Path Calculation
  // ==========================================================================

  describe('Critical Path', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'CPM Test' });
      projectId = project.id;
    });

    it('calculates critical path for linear chain', async () => {
      const taskA = await service.createTask({ projectId, name: 'Task A', duration: 5 });
      const taskB = await service.createTask({ projectId, name: 'Task B', duration: 3 });
      const taskC = await service.createTask({ projectId, name: 'Task C', duration: 2 });

      await service.addDependency({ taskId: taskB.id, predecessorId: taskA.id });
      await service.addDependency({ taskId: taskC.id, predecessorId: taskB.id });

      const critical = await service.calculateCriticalPath(projectId);
      // All tasks in a linear chain are critical
      expect(critical).toHaveLength(3);
      const names = critical.map(t => t.name);
      expect(names).toContain('Task A');
      expect(names).toContain('Task B');
      expect(names).toContain('Task C');
    });

    it('identifies non-critical tasks in parallel branches', async () => {
      const taskA = await service.createTask({ projectId, name: 'Start', duration: 2 });
      const taskB = await service.createTask({ projectId, name: 'Long Path', duration: 10 });
      const taskC = await service.createTask({ projectId, name: 'Short Path', duration: 3 });
      const taskD = await service.createTask({ projectId, name: 'End', duration: 2 });

      // A -> B -> D (total: 14 days, critical)
      // A -> C -> D (total: 7 days, not critical)
      await service.addDependency({ taskId: taskB.id, predecessorId: taskA.id });
      await service.addDependency({ taskId: taskC.id, predecessorId: taskA.id });
      await service.addDependency({ taskId: taskD.id, predecessorId: taskB.id });
      await service.addDependency({ taskId: taskD.id, predecessorId: taskC.id });

      const critical = await service.calculateCriticalPath(projectId);
      const criticalNames = critical.map(t => t.name);

      // The critical path should be A -> B -> D
      expect(criticalNames).toContain('Start');
      expect(criticalNames).toContain('Long Path');
      expect(criticalNames).toContain('End');
      // Short Path should NOT be critical
      expect(criticalNames).not.toContain('Short Path');
    });

    it('returns empty for project with no tasks', async () => {
      const critical = await service.calculateCriticalPath(projectId);
      expect(critical).toHaveLength(0);
    });
  });

  // ==========================================================================
  // EVM Calculations
  // ==========================================================================

  describe('EVM Calculations', () => {
    it('calculates EVM metrics', async () => {
      const project = await service.createProject({
        name: 'EVM Test',
        budgetedCost: 100000,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      });

      // Create tasks with budget and actual costs
      await service.createTask({
        projectId: project.id,
        name: 'Task A',
        budgetCost: 50000,
        actualCost: 45000,
        percentComplete: 80,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      await service.createTask({
        projectId: project.id,
        name: 'Task B',
        budgetCost: 50000,
        actualCost: 30000,
        percentComplete: 50,
        startDate: '2026-02-01',
        endDate: '2026-03-31',
      });

      const evm = await service.calculateEVM(project.id);

      // BCWP = (50000 * 0.80) + (50000 * 0.50) = 40000 + 25000 = 65000
      expect(evm.bcwp).toBe(65000);

      // ACWP = 45000 + 30000 = 75000
      expect(evm.acwp).toBe(75000);

      // CPI = 65000 / 75000 = 0.87
      expect(evm.cpi).toBeCloseTo(0.87, 1);

      // EAC = 100000 / CPI
      expect(evm.eac).toBeGreaterThan(100000);

      // VAC = budget - EAC (negative since over budget)
      expect(evm.vac).toBeLessThan(0);
    });

    it('handles project with no tasks', async () => {
      const project = await service.createProject({
        name: 'Empty EVM',
        budgetedCost: 100000,
      });

      const evm = await service.calculateEVM(project.id);
      expect(evm.bcws).toBe(0);
      expect(evm.bcwp).toBe(0);
      expect(evm.acwp).toBe(0);
      expect(evm.cpi).toBe(0);
      expect(evm.spi).toBe(0);
    });

    it('throws for non-existent project', async () => {
      await expect(
        service.calculateEVM('non-existent'),
      ).rejects.toThrow('Project not found');
    });
  });

  // ==========================================================================
  // Percent Complete
  // ==========================================================================

  describe('Percent Complete', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'Test' });
      projectId = project.id;
    });

    it('updates percent complete manually', async () => {
      const task = await service.createTask({ projectId, name: 'Task A' });
      const updated = await service.updatePercentComplete(task.id, 'manual', 45);
      expect(updated.percentComplete).toBe(45);
      expect(updated.status).toBe('in_progress');
    });

    it('auto-completes at 100%', async () => {
      const task = await service.createTask({ projectId, name: 'Task A' });
      const updated = await service.updatePercentComplete(task.id, 'manual', 100);
      expect(updated.percentComplete).toBe(100);
      expect(updated.status).toBe('completed');
    });

    it('calculates percent complete by cost', async () => {
      const task = await service.createTask({
        projectId,
        name: 'Task A',
        budgetCost: 10000,
        actualCost: 7500,
      });

      const updated = await service.updatePercentComplete(task.id, 'cost');
      expect(updated.percentComplete).toBe(75);
    });

    it('calculates percent complete by units', async () => {
      const task = await service.createTask({
        projectId,
        name: 'Task A',
        budgetHours: 100,
        actualHours: 60,
      });

      const updated = await service.updatePercentComplete(task.id, 'units');
      expect(updated.percentComplete).toBe(60);
    });
  });

  // ==========================================================================
  // Look-Ahead Scheduling
  // ==========================================================================

  describe('Look-Ahead Scheduling', () => {
    it('returns tasks within look-ahead window', async () => {
      const project = await service.createProject({ name: 'Look-Ahead Test' });

      const todayStr = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const farFuture = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await service.createTask({
        projectId: project.id,
        name: 'This Week',
        startDate: todayStr,
        endDate: nextWeek,
      });

      await service.createTask({
        projectId: project.id,
        name: 'Next Month',
        startDate: nextMonth,
        endDate: farFuture,
      });

      const twoWeek = await service.getLookAhead(project.id, 2);
      expect(twoWeek).toHaveLength(1);
      expect(twoWeek[0].name).toBe('This Week');

      const sixWeek = await service.getLookAhead(project.id, 6);
      // 6 weeks covers both tasks since nextMonth (30 days) falls within 42 days
      expect(sixWeek).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Schedule Variance
  // ==========================================================================

  describe('Schedule Variance', () => {
    it('computes variance between baseline and actual', async () => {
      const project = await service.createProject({ name: 'Variance Test' });

      await service.createTask({
        projectId: project.id,
        name: 'Delayed Task',
        baselineStart: '2026-01-01',
        baselineEnd: '2026-01-15',
        actualStart: '2026-01-05',
        actualEnd: '2026-01-25',
        duration: 14,
      });

      const variance = await service.getScheduleVariance(project.id);
      expect(variance).toHaveLength(1);
      expect(variance[0].taskName).toBe('Delayed Task');
      expect(variance[0].varianceDays).toBe(10); // 10 days late
    });

    it('shows negative variance when ahead of schedule', async () => {
      const project = await service.createProject({ name: 'Ahead Test' });

      await service.createTask({
        projectId: project.id,
        name: 'Early Task',
        baselineStart: '2026-01-01',
        baselineEnd: '2026-01-31',
        actualStart: '2026-01-01',
        actualEnd: '2026-01-20',
        duration: 30,
      });

      const variance = await service.getScheduleVariance(project.id);
      expect(variance).toHaveLength(1);
      expect(variance[0].varianceDays).toBeLessThan(0); // Ahead of schedule
    });
  });

  // ==========================================================================
  // Daily Log CRUD
  // ==========================================================================

  describe('Daily Log', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'Log Test' });
      projectId = project.id;
    });

    it('creates a daily log entry', async () => {
      const log = await service.createDailyLog({
        projectId,
        date: '2026-02-12',
        weather: 'Sunny',
        temperature: '72F',
        crew: '10 laborers, 2 operators',
        workPerformed: 'Poured foundation section 3A',
        photos: ['photo1.jpg', 'photo2.jpg'],
      });

      expect(log.date).toBe('2026-02-12');
      expect(log.weather).toBe('Sunny');
      expect(log.photos).toHaveLength(2);
    });

    it('lists daily logs ordered by date desc', async () => {
      await service.createDailyLog({ projectId, date: '2026-02-10' });
      await service.createDailyLog({ projectId, date: '2026-02-12' });

      const logs = await service.getDailyLogs(projectId);
      expect(logs).toHaveLength(2);
      expect(logs[0].date).toBe('2026-02-12');
      expect(logs[1].date).toBe('2026-02-10');
    });

    it('updates a daily log entry', async () => {
      const log = await service.createDailyLog({
        projectId,
        date: '2026-02-12',
      });

      const updated = await service.updateDailyLog(log.id, {
        weather: 'Rainy',
        incidents: 'Minor equipment malfunction',
      });

      expect(updated.weather).toBe('Rainy');
      expect(updated.incidents).toBe('Minor equipment malfunction');
    });
  });

  // ==========================================================================
  // RFI Lifecycle
  // ==========================================================================

  describe('RFI Lifecycle', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'RFI Test' });
      projectId = project.id;
    });

    it('creates an RFI with defaults', async () => {
      const rfi = await service.createRFI({
        projectId,
        number: 1,
        subject: 'Concrete mix design clarification',
        requestedBy: 'Site Engineer',
      });

      expect(rfi.number).toBe(1);
      expect(rfi.subject).toBe('Concrete mix design clarification');
      expect(rfi.status).toBe('open');
      expect(rfi.priority).toBe('medium');
    });

    it('responds to an RFI', async () => {
      const rfi = await service.createRFI({
        projectId,
        number: 1,
        subject: 'Test RFI',
      });

      const responded = await service.respondToRFI(
        rfi.id,
        'Use 4000 PSI mix per specification section 03300',
        '2026-02-15',
      );

      expect(responded.status).toBe('answered');
      expect(responded.response).toBe('Use 4000 PSI mix per specification section 03300');
      expect(responded.responseDate).toBe('2026-02-15');
    });

    it('closes an RFI', async () => {
      const rfi = await service.createRFI({
        projectId,
        number: 1,
        subject: 'Test RFI',
      });

      await service.respondToRFI(rfi.id, 'Answer here');
      const closed = await service.closeRFI(rfi.id);
      expect(closed.status).toBe('closed');
    });

    it('filters RFIs by status', async () => {
      await service.createRFI({ projectId, number: 1, subject: 'Open RFI' });
      const rfi2 = await service.createRFI({ projectId, number: 2, subject: 'Answered RFI' });
      await service.respondToRFI(rfi2.id, 'Done');

      const openRFIs = await service.getRFIsByStatus(projectId, 'open');
      expect(openRFIs).toHaveLength(1);
      expect(openRFIs[0].subject).toBe('Open RFI');

      const answeredRFIs = await service.getRFIsByStatus(projectId, 'answered');
      expect(answeredRFIs).toHaveLength(1);
      expect(answeredRFIs[0].subject).toBe('Answered RFI');
    });

    it('lists all RFIs ordered by number', async () => {
      await service.createRFI({ projectId, number: 3, subject: 'RFI 3' });
      await service.createRFI({ projectId, number: 1, subject: 'RFI 1' });

      const rfis = await service.listRFIs(projectId);
      expect(rfis).toHaveLength(2);
      expect(rfis[0].number).toBe(1);
      expect(rfis[1].number).toBe(3);
    });
  });

  // ==========================================================================
  // Submittal Lifecycle
  // ==========================================================================

  describe('Submittal Lifecycle', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'Submittal Test' });
      projectId = project.id;
    });

    it('creates a submittal with defaults', async () => {
      const sub = await service.createSubmittal({
        projectId,
        number: 1,
        specSection: '03300',
        description: 'Concrete mix design',
        submittedBy: 'Subcontractor A',
      });

      expect(sub.number).toBe(1);
      expect(sub.specSection).toBe('03300');
      expect(sub.status).toBe('pending');
    });

    it('reviews a submittal', async () => {
      const sub = await service.createSubmittal({
        projectId,
        number: 1,
        specSection: '03300',
        description: 'Concrete mix design',
      });

      const reviewed = await service.reviewSubmittal(
        sub.id,
        'Architect Smith',
        'approved',
        '2026-02-20',
      );

      expect(reviewed.status).toBe('approved');
      expect(reviewed.reviewer).toBe('Architect Smith');
      expect(reviewed.reviewedDate).toBe('2026-02-20');
    });

    it('reviews a submittal as approved_as_noted', async () => {
      const sub = await service.createSubmittal({
        projectId,
        number: 2,
        description: 'Steel shop drawings',
      });

      const reviewed = await service.reviewSubmittal(
        sub.id,
        'Engineer Jones',
        'approved_as_noted',
      );

      expect(reviewed.status).toBe('approved_as_noted');
    });

    it('lists submittals ordered by number', async () => {
      await service.createSubmittal({ projectId, number: 3, description: 'Sub 3' });
      await service.createSubmittal({ projectId, number: 1, description: 'Sub 1' });

      const subs = await service.listSubmittals(projectId);
      expect(subs).toHaveLength(2);
      expect(subs[0].number).toBe(1);
    });
  });

  // ==========================================================================
  // Meeting Minutes
  // ==========================================================================

  describe('Meeting Minutes', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'Meetings Test' });
      projectId = project.id;
    });

    it('creates meeting minutes', async () => {
      const minutes = await service.createMeetingMinutes({
        projectId,
        date: '2026-02-10',
        type: 'progress',
        attendees: ['John Smith', 'Jane Doe'],
        topics: ['Schedule update', 'Budget review'],
        actionItems: ['Submit revised schedule by 2/15'],
        nextMeetingDate: '2026-02-17',
      });

      expect(minutes.type).toBe('progress');
      expect(minutes.attendees).toHaveLength(2);
      expect(minutes.topics).toHaveLength(2);
      expect(minutes.actionItems).toHaveLength(1);
      expect(minutes.nextMeetingDate).toBe('2026-02-17');
    });

    it('lists meeting minutes ordered by date desc', async () => {
      await service.createMeetingMinutes({
        projectId,
        date: '2026-02-03',
        type: 'progress',
      });
      await service.createMeetingMinutes({
        projectId,
        date: '2026-02-10',
        type: 'safety',
      });

      const minutes = await service.listMeetingMinutes(projectId);
      expect(minutes).toHaveLength(2);
      expect(minutes[0].date).toBe('2026-02-10');
    });
  });

  // ==========================================================================
  // Weather Delay Tracking
  // ==========================================================================

  describe('Weather Delays', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'Weather Test' });
      projectId = project.id;
    });

    it('logs a weather delay', async () => {
      const delay = await service.logWeatherDelay({
        projectId,
        date: '2026-02-12',
        type: 'rain',
        hoursLost: 6,
        description: 'Heavy rainfall, site flooded',
        impactedTasks: ['task-1', 'task-2'],
      });

      expect(delay.type).toBe('rain');
      expect(delay.hoursLost).toBe(6);
      expect(delay.impactedTasks).toHaveLength(2);
    });

    it('calculates delay impact', async () => {
      await service.logWeatherDelay({
        projectId,
        date: '2026-02-10',
        type: 'rain',
        hoursLost: 8,
        impactedTasks: ['task-1'],
      });

      await service.logWeatherDelay({
        projectId,
        date: '2026-02-11',
        type: 'snow',
        hoursLost: 4,
        impactedTasks: ['task-1', 'task-2'],
      });

      const impact = await service.calculateDelayImpact(projectId);
      expect(impact.totalHoursLost).toBe(12);
      expect(impact.totalDaysLost).toBe(1.5);
      expect(impact.delaysByType['rain']).toBe(8);
      expect(impact.delaysByType['snow']).toBe(4);
      expect(impact.impactedTaskCount).toBe(2); // task-1 and task-2
    });

    it('lists weather delays ordered by date desc', async () => {
      await service.logWeatherDelay({ projectId, date: '2026-02-10', type: 'rain', hoursLost: 4 });
      await service.logWeatherDelay({ projectId, date: '2026-02-12', type: 'snow', hoursLost: 8 });

      const delays = await service.getWeatherDelays(projectId);
      expect(delays).toHaveLength(2);
      expect(delays[0].date).toBe('2026-02-12');
    });
  });

  // ==========================================================================
  // Resource Allocation
  // ==========================================================================

  describe('Resource Allocation', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await service.createProject({ name: 'Resource Test' });
      projectId = project.id;
    });

    it('allocates a resource to a project', async () => {
      const alloc = await service.allocateResource({
        projectId,
        resourceType: 'labor',
        resourceId: 'crew-1',
        hours: 40,
        startDate: '2026-02-10',
        endDate: '2026-02-14',
      });

      expect(alloc.resourceType).toBe('labor');
      expect(alloc.hours).toBe(40);
    });

    it('allocates a resource to a task', async () => {
      const task = await service.createTask({ projectId, name: 'Task A' });

      const alloc = await service.allocateResource({
        projectId,
        taskId: task.id,
        resourceType: 'equipment',
        resourceId: 'crane-1',
        hours: 16,
        startDate: '2026-02-10',
        endDate: '2026-02-11',
      });

      expect(alloc.taskId).toBe(task.id);
      expect(alloc.resourceType).toBe('equipment');
    });

    it('calculates resource loading', async () => {
      await service.allocateResource({
        projectId,
        resourceType: 'labor',
        hours: 40,
        startDate: '2026-02-10',
        endDate: '2026-02-14',
      });

      await service.allocateResource({
        projectId,
        resourceType: 'equipment',
        hours: 16,
        startDate: '2026-02-10',
        endDate: '2026-02-11',
      });

      const loading = await service.getResourceLoading(projectId, {
        start: '2026-02-10',
        end: '2026-02-14',
      });

      expect(loading.length).toBe(5); // 5 days
      // Each day should have some labor hours
      expect(loading[0].laborHours).toBeGreaterThan(0);
      // First two days should have equipment hours
      expect(loading[0].equipmentHours).toBeGreaterThan(0);
    });

    it('throws when allocating to non-existent project', async () => {
      await expect(
        service.allocateResource({
          projectId: 'non-existent',
          resourceType: 'labor',
          hours: 8,
        }),
      ).rejects.toThrow('Project not found');
    });

    it('throws when allocating to non-existent task', async () => {
      await expect(
        service.allocateResource({
          projectId,
          taskId: 'non-existent',
          resourceType: 'labor',
          hours: 8,
        }),
      ).rejects.toThrow('Task not found');
    });
  });

  // ==========================================================================
  // Events Emission
  // ==========================================================================

  describe('Events', () => {
    it('emits project.created', async () => {
      let emitted = false;
      events.on('project.created', () => { emitted = true; });
      await service.createProject({ name: 'Test' });
      expect(emitted).toBe(true);
    });

    it('emits project.updated', async () => {
      const project = await service.createProject({ name: 'Test' });
      let emitted = false;
      events.on('project.updated', () => { emitted = true; });
      await service.updateProject(project.id, { status: 'active' });
      expect(emitted).toBe(true);
    });

    it('emits project.task.created', async () => {
      const project = await service.createProject({ name: 'Test' });
      let emitted = false;
      events.on('project.task.created', () => { emitted = true; });
      await service.createTask({ projectId: project.id, name: 'Task A' });
      expect(emitted).toBe(true);
    });

    it('emits project.task.completed', async () => {
      const project = await service.createProject({ name: 'Test' });
      const task = await service.createTask({ projectId: project.id, name: 'Task A' });
      let emitted = false;
      events.on('project.task.completed', () => { emitted = true; });
      await service.completeTask(task.id);
      expect(emitted).toBe(true);
    });

    it('emits project.milestone.completed', async () => {
      const project = await service.createProject({ name: 'Test' });
      const ms = await service.createMilestone({ projectId: project.id, name: 'MS-1' });
      let emitted = false;
      events.on('project.milestone.completed', () => { emitted = true; });
      await service.completeMilestone(ms.id);
      expect(emitted).toBe(true);
    });

    it('emits project.rfi.created', async () => {
      const project = await service.createProject({ name: 'Test' });
      let emitted = false;
      events.on('project.rfi.created', () => { emitted = true; });
      await service.createRFI({ projectId: project.id, number: 1, subject: 'Test' });
      expect(emitted).toBe(true);
    });

    it('emits project.rfi.answered', async () => {
      const project = await service.createProject({ name: 'Test' });
      const rfi = await service.createRFI({ projectId: project.id, number: 1, subject: 'Test' });
      let emitted = false;
      events.on('project.rfi.answered', () => { emitted = true; });
      await service.respondToRFI(rfi.id, 'Response');
      expect(emitted).toBe(true);
    });

    it('emits project.submittal.reviewed', async () => {
      const project = await service.createProject({ name: 'Test' });
      const sub = await service.createSubmittal({ projectId: project.id, number: 1 });
      let emitted = false;
      events.on('project.submittal.reviewed', () => { emitted = true; });
      await service.reviewSubmittal(sub.id, 'Reviewer', 'approved');
      expect(emitted).toBe(true);
    });

    it('emits project.dailylog.created', async () => {
      const project = await service.createProject({ name: 'Test' });
      let emitted = false;
      events.on('project.dailylog.created', () => { emitted = true; });
      await service.createDailyLog({ projectId: project.id, date: '2026-02-12' });
      expect(emitted).toBe(true);
    });
  });
});
