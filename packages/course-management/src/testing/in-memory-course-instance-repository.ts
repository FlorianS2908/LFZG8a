import type { CourseInstance, CourseInstanceRepository } from '../../../domain/src/index.ts';
import { DuplicateEntityError } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemoryCourseInstanceRepository extends InMemoryBaseRepository<CourseInstance> implements CourseInstanceRepository {
  constructor(seed: CourseInstance[] = []) {
    super(seed, 'CourseInstance');
  }

  async getByCourseInstanceId(courseInstanceId: string): Promise<CourseInstance | undefined> {
    return (await this.list()).find((course) => course.courseInstanceId === courseInstanceId);
  }

  override async create(input: Partial<CourseInstance>): Promise<CourseInstance> {
    if (input.courseInstanceId && await this.getByCourseInstanceId(input.courseInstanceId)) {
      throw new DuplicateEntityError('CourseInstance', input.courseInstanceId);
    }
    return super.create(input);
  }
}
