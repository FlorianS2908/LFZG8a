import type {
  AuditLogRepository,
  CourseMemberRepository,
  CourseReleaseState,
  CourseReleaseStateRepository,
  SyncEventRepository
} from '../../domain/src/index.ts';
import { PermissionDeniedError } from '../../domain/src/index.ts';
import type { DomainWriterContext } from './audit-sync.ts';
import { writeAuditAndSync } from './audit-sync.ts';

export class CourseReleaseService {
  private readonly deps: {
    courseMemberRepository: CourseMemberRepository;
    courseReleaseStateRepository: CourseReleaseStateRepository;
    auditLogRepository: AuditLogRepository;
    syncEventRepository: SyncEventRepository;
  };

  constructor(deps: {
    courseMemberRepository: CourseMemberRepository;
    courseReleaseStateRepository: CourseReleaseStateRepository;
    auditLogRepository: AuditLogRepository;
    syncEventRepository: SyncEventRepository;
  }) {
    this.deps = deps;
  }

  async releaseKey(context: DomainWriterContext, input: {
    courseInstanceId: string;
    contentContainerId: string;
    releaseKey: string;
    releasedFor?: 'all' | 'group' | 'user';
    releasedForId?: string;
    expectedVersion?: number;
  }): Promise<CourseReleaseState> {
    return this.setReleaseState(context, { ...input, isReleased: true });
  }

  async lockKey(context: DomainWriterContext, input: {
    courseInstanceId: string;
    contentContainerId: string;
    releaseKey: string;
    releasedFor?: 'all' | 'group' | 'user';
    releasedForId?: string;
    expectedVersion?: number;
  }): Promise<CourseReleaseState> {
    return this.setReleaseState(context, { ...input, isReleased: false });
  }

  async getReleaseState(courseInstanceId: string, contentContainerId: string, releaseKey: string): Promise<CourseReleaseState | undefined> {
    return this.deps.courseReleaseStateRepository.findState(courseInstanceId, contentContainerId, releaseKey);
  }

  async listReleasedKeysForParticipant(userId: string, courseInstanceId: string, contentContainerId: string): Promise<string[]> {
    const membership = await this.deps.courseMemberRepository.findActive(courseInstanceId, userId, 'participant');
    if (!membership) {
      return [];
    }
    const solutionPattern = /(^|[.\-_/])(solution|solutions|loesung|loesungen|lösung|lösungen)([.\-_/]|$)/i;
    return (await this.deps.courseReleaseStateRepository.listByCourseInstance(courseInstanceId))
      .filter((state) => state.contentContainerId === contentContainerId)
      .filter((state) => state.isReleased)
      .filter((state) => state.releasedFor === 'all' || (state.releasedFor === 'user' && state.releasedForId === userId))
      .filter((state) => !solutionPattern.test(state.releaseKey))
      .map((state) => state.releaseKey);
  }

  private async setReleaseState(context: DomainWriterContext, input: {
    courseInstanceId: string;
    contentContainerId: string;
    releaseKey: string;
    isReleased: boolean;
    releasedFor?: 'all' | 'group' | 'user';
    releasedForId?: string;
    expectedVersion?: number;
  }): Promise<CourseReleaseState> {
    const teacherMembership = await this.deps.courseMemberRepository.findActive(input.courseInstanceId, context.actorUserId, 'teacher');
    if (!teacherMembership) {
      throw new PermissionDeniedError('Only teachers assigned to the CourseInstance can change ReleaseStates');
    }

    const now = new Date().toISOString();
    const releasedFor = input.releasedFor ?? 'all';
    const before = await this.deps.courseReleaseStateRepository.findState(
      input.courseInstanceId,
      input.contentContainerId,
      input.releaseKey,
      releasedFor,
      input.releasedForId
    );
    const payload = {
      courseInstanceId: input.courseInstanceId,
      contentContainerId: input.contentContainerId,
      releaseKey: input.releaseKey,
      isReleased: input.isReleased,
      releasedFor,
      releasedForId: input.releasedForId,
      releasedBy: input.isReleased ? context.actorUserId : undefined,
      releasedAt: input.isReleased ? now : undefined,
      updatedAt: now,
      version: 1
    };

    const after = before
      ? await this.deps.courseReleaseStateRepository.update(before.id, payload, input.expectedVersion)
      : await this.deps.courseReleaseStateRepository.create({ id: crypto.randomUUID(), ...payload });

    await writeAuditAndSync({
      ...this.deps,
      context,
      action: 'course_release.changed',
      eventType: 'course_release.changed',
      entityType: 'CourseReleaseState',
      entityId: after.id,
      before,
      after
    });
    return after;
  }
}
