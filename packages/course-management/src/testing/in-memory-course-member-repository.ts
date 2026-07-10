import type { CourseMember, CourseMemberRepository } from '../../../domain/src/index.ts';
import { DuplicateEntityError } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemoryCourseMemberRepository extends InMemoryBaseRepository<CourseMember> implements CourseMemberRepository {
  constructor(seed: CourseMember[] = []) {
    super(seed, 'CourseMember');
  }

  async listByCourseInstance(courseInstanceId: string): Promise<CourseMember[]> {
    return (await this.list()).filter((member) => member.courseInstanceId === courseInstanceId);
  }

  async listByUser(userId: string): Promise<CourseMember[]> {
    return (await this.list()).filter((member) => member.userId === userId);
  }

  async findActive(courseInstanceId: string, userId: string, roleInCourse?: string): Promise<CourseMember | undefined> {
    return (await this.list()).find((member) =>
      member.courseInstanceId === courseInstanceId &&
      member.userId === userId &&
      member.status === 'active' &&
      (!roleInCourse || member.roleInCourse === roleInCourse)
    );
  }

  override async create(input: Partial<CourseMember>): Promise<CourseMember> {
    if (
      input.courseInstanceId &&
      input.userId &&
      input.roleInCourse &&
      await this.findActive(input.courseInstanceId, input.userId, input.roleInCourse)
    ) {
      throw new DuplicateEntityError('CourseMember', `${input.courseInstanceId}:${input.userId}:${input.roleInCourse}`);
    }
    return super.create(input);
  }
}
