export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class VersionConflictError extends DomainError {
  constructor(entityType: string, id: string) {
    super(`Version conflict for ${entityType} ${id}`);
    this.name = 'VersionConflictError';
  }
}

export class DuplicateEntityError extends DomainError {
  constructor(entityType: string, key: string) {
    super(`${entityType} already exists: ${key}`);
    this.name = 'DuplicateEntityError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entityType: string, id: string) {
    super(`${entityType} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class PermissionDeniedError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
