import type { CourseContainerAssignment, CourseContainerAssignmentRepository } from '../../../domain/src/index.ts';
import { DuplicateEntityError } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemoryCourseContainerAssignmentRepository extends InMemoryBaseRepository<CourseContainerAssignment> implements CourseContainerAssignmentRepository {
  constructor(seed: CourseContainerAssignment[] = []) {
    super(seed, 'CourseContainerAssignment');
  }

  async listByCourseInstance(courseInstanceId: string): Promise<CourseContainerAssignment[]> {
    return (await this.list()).filter((assignment) => assignment.courseInstanceId === courseInstanceId);
  }

  async findActive(courseInstanceId: string, contentContainerId: string): Promise<CourseContainerAssignment | undefined> {
    return (await this.list()).find((assignment) =>
      assignment.courseInstanceId === courseInstanceId &&
      assignment.contentContainerId === contentContainerId &&
      assignment.status === 'active'
    );
  }

  override async create(input: Partial<CourseContainerAssignment>): Promise<CourseContainerAssignment> {
    if (
      input.courseInstanceId &&
      input.contentContainerId &&
      await this.findActive(input.courseInstanceId, input.contentContainerId)
    ) {
      throw new DuplicateEntityError('CourseContainerAssignment', `${input.courseInstanceId}:${input.contentContainerId}`);
    }
    return super.create(input);
  }
}
