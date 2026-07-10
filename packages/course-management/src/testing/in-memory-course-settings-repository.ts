import type { CourseSettings, CourseSettingsRepository } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemoryCourseSettingsRepository extends InMemoryBaseRepository<CourseSettings> implements CourseSettingsRepository {
  constructor(seed: CourseSettings[] = []) {
    super(seed, 'CourseSettings');
  }

  async getByCourseInstanceId(courseInstanceId: string): Promise<CourseSettings | undefined> {
    return (await this.list()).find((settings) => settings.courseInstanceId === courseInstanceId);
  }
}
