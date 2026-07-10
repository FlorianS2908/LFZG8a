import type { AuditLogEntry, AuditLogRepository } from '../../../domain/src/index.ts';
import { InMemoryBaseRepository } from './in-memory-base-repository.ts';

export class InMemoryAuditLogRepository extends InMemoryBaseRepository<AuditLogEntry> implements AuditLogRepository {
  constructor(seed: AuditLogEntry[] = []) {
    super(seed, 'AuditLogEntry');
  }
}
