import type { CourseReleaseState, CourseReleaseStateRepository } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemoryCourseReleaseStateRepository extends InMemoryBaseRepository<CourseReleaseState> implements CourseReleaseStateRepository {
  constructor(seed: CourseReleaseState[] = []) {
    super(seed, 'CourseReleaseState');
  }

  async findState(
    courseInstanceId: string,
    contentContainerId: string,
    releaseKey: string,
    releasedFor = 'all',
    releasedForId?: string
  ): Promise<CourseReleaseState | undefined> {
    return (await this.list()).find((state) =>
      state.courseInstanceId === courseInstanceId &&
      state.contentContainerId === contentContainerId &&
      state.releaseKey === releaseKey &&
      state.releasedFor === releasedFor &&
      state.releasedForId === releasedForId
    );
  }

  async listByCourseInstance(courseInstanceId: string): Promise<CourseReleaseState[]> {
    return (await this.list()).filter((state) => state.courseInstanceId === courseInstanceId);
  }
}
