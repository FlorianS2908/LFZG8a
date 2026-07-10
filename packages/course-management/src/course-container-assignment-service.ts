import type {
  AuditLogRepository,
  ContentContainerRepository,
  CourseContainerAssignment,
  CourseContainerAssignmentRepository,
  SyncEventRepository
} from '../../domain/src/index.ts';
import { ValidationError } from '../../domain/src/index.ts';
import type { DomainWriterContext } from './audit-sync.ts';
import { writeAuditAndSync } from './audit-sync.ts';

export class CourseContainerAssignmentService {
  private readonly deps: {
    contentContainerRepository: ContentContainerRepository;
    courseContainerAssignmentRepository: CourseContainerAssignmentRepository;
    auditLogRepository: AuditLogRepository;
    syncEventRepository: SyncEventRepository;
  };

  constructor(deps: {
    contentContainerRepository: ContentContainerRepository;
    courseContainerAssignmentRepository: CourseContainerAssignmentRepository;
    auditLogRepository: AuditLogRepository;
    syncEventRepository: SyncEventRepository;
  }) {
    this.deps = deps;
  }

  async assignContainer(context: DomainWriterContext, courseInstanceId: string, contentContainerId: string): Promise<CourseContainerAssignment> {
    const container = await this.deps.contentContainerRepository.getById(contentContainerId);
    if (!container || container.status !== 'active' || !container.assignable || container.category === 'admin') {
      throw new ValidationError('Only active assignable ContentContainers can be assigned to CourseInstances');
    }
    const assignedAt = new Date().toISOString();
    const assignment = await this.deps.courseContainerAssignmentRepository.create({
      id: crypto.randomUUID(),
      courseInstanceId,
      contentContainerId,
      status: 'active',
      assignedAt,
      assignedBy: context.actorUserId
    });
    await writeAuditAndSync({
      ...this.deps,
      context,
      action: 'course_container.assigned',
      eventType: 'course_container.assigned',
      entityType: 'CourseContainerAssignment',
      entityId: assignment.id,
      after: assignment
    });
    return assignment;
  }

  async deactivateAssignment(context: DomainWriterContext, assignmentId: string): Promise<CourseContainerAssignment> {
    const before = await this.deps.courseContainerAssignmentRepository.getById(assignmentId);
    const after = await this.deps.courseContainerAssignmentRepository.update(assignmentId, { status: 'inactive' });
    await writeAuditAndSync({
      ...this.deps,
      context,
      action: 'course_container.deactivated',
      eventType: 'course_container.deactivated',
      entityType: 'CourseContainerAssignment',
      entityId: assignmentId,
      before,
      after
    });
    return after;
  }

  async listActiveContainers(courseInstanceId: string): Promise<CourseContainerAssignment[]> {
    return (await this.deps.courseContainerAssignmentRepository.listByCourseInstance(courseInstanceId))
      .filter((assignment) => assignment.status === 'active');
  }
}
