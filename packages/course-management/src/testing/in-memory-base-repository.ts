import { NotFoundError, VersionConflictError } from '../../../domain/src/index.ts';

type Entity = {
  id: string;
  version?: number;
};

export class InMemoryBaseRepository<TEntity extends Entity, TCreate = Partial<TEntity>, TPatch = Partial<TEntity>> {
  protected items = new Map<string, TEntity>();
  private nextNumber = 1;
  private readonly entityType: string;

  constructor(seed: TEntity[] = [], entityType = 'Entity') {
    this.entityType = entityType;
    seed.forEach((item) => this.items.set(item.id, structuredClone(item)));
  }

  async list(): Promise<TEntity[]> {
    return Array.from(this.items.values()).map((item) => structuredClone(item));
  }

  async getById(id: string): Promise<TEntity | undefined> {
    const item = this.items.get(id);
    return item ? structuredClone(item) : undefined;
  }

  async create(input: TCreate): Promise<TEntity> {
    const entity = {
      ...(input as object),
      id: (input as { id?: string }).id ?? this.createId()
    } as TEntity;
    this.items.set(entity.id, structuredClone(entity));
    return structuredClone(entity);
  }

  async update(id: string, patch: TPatch, expectedVersion?: number): Promise<TEntity> {
    const current = this.items.get(id);
    if (!current) {
      throw new NotFoundError(this.entityType, id);
    }
    if (typeof expectedVersion === 'number' && typeof current.version === 'number' && current.version !== expectedVersion) {
      throw new VersionConflictError(this.entityType, id);
    }
    const next = {
      ...current,
      ...(patch as object)
    } as TEntity;
    if (typeof current.version === 'number') {
      next.version = current.version + 1;
    }
    this.items.set(id, structuredClone(next));
    return structuredClone(next);
  }

  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }

  protected createId(prefix = 'mem'): string {
    const value = `${prefix}-${String(this.nextNumber).padStart(4, '0')}`;
    this.nextNumber += 1;
    return value;
  }
}
