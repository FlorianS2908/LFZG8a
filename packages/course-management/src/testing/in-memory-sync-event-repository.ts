import type { SyncEvent, SyncEventRepository } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemorySyncEventRepository extends InMemoryBaseRepository<SyncEvent> implements SyncEventRepository {
  constructor(seed: SyncEvent[] = []) {
    super(seed, 'SyncEvent');
  }
}
