import type { AuditLogRepository, SyncEventRepository } from '../../domain/src/index.ts';

export type DomainWriterContext = {
  actorUserId: string;
  clientId?: string;
};

export async function writeAuditAndSync(params: {
  auditLogRepository: AuditLogRepository;
  syncEventRepository: SyncEventRepository;
  context: DomainWriterContext;
  action: string;
  eventType: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  const createdAt = new Date().toISOString();
  await params.auditLogRepository.create({
    id: crypto.randomUUID(),
    actorUserId: params.context.actorUserId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before,
    after: params.after,
    clientId: params.context.clientId,
    createdAt
  });
  await params.syncEventRepository.create({
    id: crypto.randomUUID(),
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.after,
    createdBy: params.context.actorUserId,
    createdAt
  });
}
