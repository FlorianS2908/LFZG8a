import type {
  AuditLogRepository,
  CourseMember,
  CourseMemberRepository,
  CourseMemberRole,
  SyncEventRepository
} from '../../domain/src/index.ts';
import type { DomainWriterContext } from './audit-sync.ts';
import { writeAuditAndSync } from './audit-sync.ts';

export class CourseMembershipService {
  private readonly deps: {
    courseMemberRepository: CourseMemberRepository;
    auditLogRepository: AuditLogRepository;
    syncEventRepository: SyncEventRepository;
  };

  constructor(deps: {
    courseMemberRepository: CourseMemberRepository;
    auditLogRepository: AuditLogRepository;
    syncEventRepository: SyncEventRepository;
  }) {
    this.deps = deps;
  }

  async assignTeacher(context: DomainWriterContext, courseInstanceId: string, userId: string): Promise<CourseMember> {
    return this.assignMember(context, courseInstanceId, userId, 'teacher');
  }

  async assignParticipant(context: DomainWriterContext, courseInstanceId: string, userId: string): Promise<CourseMember> {
    return this.assignMember(context, courseInstanceId, userId, 'participant');
  }

  async assignMember(context: DomainWriterContext, courseInstanceId: string, userId: string, roleInCourse: CourseMemberRole): Promise<CourseMember> {
    const assignedAt = new Date().toISOString();
    const member = await this.deps.courseMemberRepository.create({
      id: crypto.randomUUID(),
      courseInstanceId,
      userId,
      roleInCourse,
      status: 'active',
      assignedAt,
      assignedBy: context.actorUserId
    });
    await writeAuditAndSync({
      ...this.deps,
      context,
      action: 'course_member.assigned',
      eventType: 'course_member.assigned',
      entityType: 'CourseMember',
      entityId: member.id,
      after: member
    });
    return member;
  }

  async deactivateMember(context: DomainWriterContext, memberId: string): Promise<CourseMember> {
    const before = await this.deps.courseMemberRepository.getById(memberId);
    const after = await this.deps.courseMemberRepository.update(memberId, { status: 'inactive' });
    await writeAuditAndSync({
      ...this.deps,
      context,
      action: 'course_member.deactivated',
      eventType: 'course_member.deactivated',
      entityType: 'CourseMember',
      entityId: memberId,
      before,
      after
    });
    return after;
  }

  async listMembers(courseInstanceId: string): Promise<CourseMember[]> {
    return this.deps.courseMemberRepository.listByCourseInstance(courseInstanceId);
  }
}
