import type {
  AuditLogEntry,
  ContentContainer,
  CourseContainerAssignment,
  CourseInstance,
  CourseMember,
  CourseReleaseState,
  CourseSettings,
  SyncEvent,
  User
} from './models.ts';

export interface Repository<TEntity, TCreate = Partial<TEntity>, TPatch = Partial<TEntity>> {
  list(): Promise<TEntity[]>;
  getById(id: string): Promise<TEntity | undefined>;
  create(input: TCreate): Promise<TEntity>;
  update(id: string, patch: TPatch, expectedVersion?: number): Promise<TEntity>;
  remove(id: string): Promise<void>;
}

export interface UserRepository extends Repository<User> {}

export interface ContentContainerRepository extends Repository<ContentContainer> {
  getByCourseId(courseId: string): Promise<ContentContainer | undefined>;
}

export interface CourseInstanceRepository extends Repository<CourseInstance> {
  getByCourseInstanceId(courseInstanceId: string): Promise<CourseInstance | undefined>;
}

export interface CourseMemberRepository extends Repository<CourseMember> {
  listByCourseInstance(courseInstanceId: string): Promise<CourseMember[]>;
  listByUser(userId: string): Promise<CourseMember[]>;
  findActive(courseInstanceId: string, userId: string, roleInCourse?: string): Promise<CourseMember | undefined>;
}

export interface CourseContainerAssignmentRepository extends Repository<CourseContainerAssignment> {
  listByCourseInstance(courseInstanceId: string): Promise<CourseContainerAssignment[]>;
  findActive(courseInstanceId: string, contentContainerId: string): Promise<CourseContainerAssignment | undefined>;
}

export interface CourseReleaseStateRepository extends Repository<CourseReleaseState> {
  findState(courseInstanceId: string, contentContainerId: string, releaseKey: string, releasedFor?: string, releasedForId?: string): Promise<CourseReleaseState | undefined>;
  listByCourseInstance(courseInstanceId: string): Promise<CourseReleaseState[]>;
}

export interface CourseSettingsRepository extends Repository<CourseSettings> {
  getByCourseInstanceId(courseInstanceId: string): Promise<CourseSettings | undefined>;
}

export interface AuditLogRepository extends Repository<AuditLogEntry> {}

export interface SyncEventRepository extends Repository<SyncEvent> {}
