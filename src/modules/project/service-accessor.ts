/**
 * Lazy singleton accessor for ProjectService.
 */

import { ProjectService } from './project-service';
import type {
  Project, Milestone, Task, TaskDependency,
  DailyLog, RFI, Submittal, MeetingMinutes,
  WeatherDelay, ResourceAllocation,
} from './project-service';

let _service: ProjectService | null = null;

export function getProjectService(): ProjectService {
  if (_service) return _service;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (window as any).concrete;
  if (!app?.store || !app?.events) {
    throw new Error('Project: app not initialized');
  }

  const store = app.store;
  const events = app.events;

  _service = new ProjectService(
    store.collection<Project>('project/project'),
    store.collection<Milestone>('project/milestone'),
    store.collection<Task>('project/task'),
    store.collection<TaskDependency>('project/taskDependency'),
    store.collection<DailyLog>('project/dailyLog'),
    store.collection<RFI>('project/rfi'),
    store.collection<Submittal>('project/submittal'),
    store.collection<MeetingMinutes>('project/meetingMinutes'),
    store.collection<WeatherDelay>('project/weatherDelay'),
    store.collection<ResourceAllocation>('project/resourceAllocation'),
    events,
  );

  return _service;
}
