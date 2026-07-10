import type { ContentContainer, ContentContainerRepository } from '../../../domain/src/index.ts';
import { DuplicateEntityError } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemoryContentContainerRepository extends InMemoryBaseRepository<ContentContainer> implements ContentContainerRepository {
  constructor(seed: ContentContainer[] = []) {
    super(seed, 'ContentContainer');
  }

  async getByCourseId(courseId: string): Promise<ContentContainer | undefined> {
    return (await this.list()).find((container) => container.courseId === courseId);
  }

  override async create(input: Partial<ContentContainer>): Promise<ContentContainer> {
    if (input.courseId && await this.getByCourseId(input.courseId)) {
      throw new DuplicateEntityError('ContentContainer', input.courseId);
    }
    return super.create(input);
  }
}
