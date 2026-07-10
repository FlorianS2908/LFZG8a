export type RoleKey = 'participant' | 'teacher' | 'admin' | 'super_admin' | 'course_manager';

export type DepartmentKey = 'FIAE' | 'FISI' | 'KABUE' | 'KITS' | 'ALLGEMEIN';

export type ContainerCategory = 'course' | 'quiz' | 'tool' | 'standalone' | 'admin';

export type ContainerType =
  | 'learning-content'
  | 'quiz'
  | 'tool'
  | 'standalone-app'
  | 'system'
  | 'factory-generated';

export type ContentContainerStatus = 'draft' | 'active' | 'disabled' | 'archived' | 'placeholder';

export type CourseInstanceStatus = 'draft' | 'planned' | 'active' | 'completed' | 'archived';

export type CourseMemberRole = 'teacher' | 'participant';

export type AssignmentStatus = 'active' | 'inactive' | 'removed';

export interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  key: RoleKey;
  label: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleKey: RoleKey;
  assignedAt: string;
  assignedBy: string;
}

export interface Department {
  id: DepartmentKey;
  label: string;
}

export interface ContentContainer {
  id: string;
  courseName: string;
  courseId: string;
  department: DepartmentKey;
  category: ContainerCategory;
  containerType: ContainerType;
  version: string;
  status: ContentContainerStatus;
  assignable: boolean;
  manifestPath?: string;
  catalogPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseInstance {
  id: string;
  courseInstanceId: string;
  title: string;
  department: DepartmentKey;
  startDate?: string;
  endDate?: string;
  status: CourseInstanceStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseMember {
  id: string;
  courseInstanceId: string;
  userId: string;
  roleInCourse: CourseMemberRole;
  status: AssignmentStatus;
  assignedAt: string;
  assignedBy: string;
}

export interface CourseContainerAssignment {
  id: string;
  courseInstanceId: string;
  contentContainerId: string;
  status: AssignmentStatus;
  assignedAt: string;
  assignedBy: string;
}

export interface CourseReleaseState {
  id: string;
  courseInstanceId: string;
  contentContainerId: string;
  releaseKey: string;
  isReleased: boolean;
  releasedFor: 'all' | 'group' | 'user';
  releasedForId?: string;
  releasedBy?: string;
  releasedAt?: string;
  updatedAt: string;
  version: number;
}

export interface CourseSettings {
  id: string;
  courseInstanceId: string;
  startTime?: string;
  endTime?: string;
  breaks: Array<{
    start: string;
    end: string;
    label?: string;
  }>;
  monitorSettings?: {
    courseViewMonitorIndex?: number;
    teacherViewMonitorIndex?: number;
  };
  updatedAt: string;
  version: number;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  clientId?: string;
  createdAt: string;
}

export interface SyncEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  createdBy?: string;
  createdAt: string;
}
