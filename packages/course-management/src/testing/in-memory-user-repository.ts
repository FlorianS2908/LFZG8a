import type { User, UserRepository } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemoryUserRepository extends InMemoryBaseRepository<User> implements UserRepository {
  constructor(seed: User[] = []) {
    super(seed, 'User');
  }
}
