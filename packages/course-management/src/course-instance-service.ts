import type {
  CourseInstance,
  CourseInstanceRepository,
  CourseInstanceStatus,
  DepartmentKey,
  AuditLogRepository,
  SyncEventRepository
} from '../../domain/src/index.ts';
import type { DomainWriterContext } from './audit-sync.ts';
import { writeAuditAndSync } from './audit-sync.ts';

export class CourseInstanceService {
  private readonly deps: {
    courseInstanceRepository: CourseInstanceRepository;
    auditLogRepository: AuditLogRepository;
    syncEventRepository: SyncEventRepository;
  };

  constructor(deps: {
    courseInstanceRepository: CourseInstanceRepository;
    auditLogRepository: AuditLogRepository;
    syncEventRepository: SyncEventRepository;
  }) {
    this.deps = deps;
  }

  async createCourseInstance(context: DomainWriterContext, input: {
    courseInstanceId: string;
    title: string;
    department: DepartmentKey;
    startDate?: string;
    endDate?: string;
    status?: CourseInstanceStatus;
  }): Promise<CourseInstance> {
    const now = new Date().toISOString();
    const course = await this.deps.courseInstanceRepository.create({
      id: crypto.randomUUID(),
      courseInstanceId: input.courseInstanceId,
      title: input.title,
      department: input.department,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? 'draft',
      version: 1,
      createdBy: context.actorUserId,
      createdAt: now,
      updatedAt: now
    });
    await writeAuditAndSync({
      ...this.deps,
      context,
      action: 'course_instance.created',
      eventType: 'course_instance.created',
      entityType: 'CourseInstance',
      entityId: course.id,
      after: course
    });
    return course;
  }

  async updateCourseInstance(
    context: DomainWriterContext,
    id: string,
    patch: Partial<Pick<CourseInstance, 'title' | 'startDate' | 'endDate' | 'department'>>,
    expectedVersion?: number
  ): Promise<CourseInstance> {
    const before = await this.deps.courseInstanceRepository.getById(id);
    const after = await this.deps.courseInstanceRepository.update(id, {
      ...patch,
      updatedAt: new Date().toISOString()
    }, expectedVersion);
    await writeAuditAndSync({
      ...this.deps,
      context,
      action: 'course_instance.updated',
      eventType: 'course_instance.updated',
      entityType: 'CourseInstance',
      entityId: id,
      before,
      after
    });
    return after;
  }

  async setStatus(context: DomainWriterContext, id: string, status: CourseInstanceStatus, expectedVersion?: number): Promise<CourseInstance> {
    const before = await this.deps.courseInstanceRepository.getById(id);
    const after = await this.deps.courseInstanceRepository.update(id, {
      status,
      updatedAt: new Date().toISOString()
    }, expectedVersion);
    await writeAuditAndSync({
      ...this.deps,
      context,
      action: 'course_instance.status_changed',
      eventType: 'course_instance.status_changed',
      entityType: 'CourseInstance',
      entityId: id,
      before,
      after
    });
    return after;
  }
}
