'use strict';

class CourseForgeError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code || 'COURSE_FORGE_ERROR';
    this.category = options.category || 'application';
    this.operationId = options.operationId || '';
    this.requestId = options.requestId || '';
    this.retryable = Boolean(options.retryable);
    this.safeMessage = options.safeMessage || message;
  }
}

class ConfigurationError extends CourseForgeError {}
class SourceProcessingError extends CourseForgeError {}
class ProviderError extends CourseForgeError {}
class ProviderAuthError extends ProviderError {}
class ProviderRateLimitError extends ProviderError {}
class ProviderTimeoutError extends ProviderError {}
class ResponseSchemaError extends CourseForgeError {}
class ComplianceError extends CourseForgeError {}
class PersistenceError extends CourseForgeError {}

function toCourseForgeError(error, context = {}) {
  if (error instanceof CourseForgeError) return error;
  const code = String(error?.code || 'PROVIDER_ERROR');
  const common = {
    cause: error,
    code,
    category: 'provider',
    operationId: context.operationId,
    requestId: context.requestId,
    safeMessage: 'Die KI-Anfrage konnte nicht abgeschlossen werden.'
  };
  if (code === 'OPENAI_AUTH') return new ProviderAuthError(common.safeMessage, { ...common, retryable: false });
  if (code === 'OPENAI_RATE_LIMIT') return new ProviderRateLimitError(common.safeMessage, { ...common, retryable: true });
  if (/TIMEOUT/.test(code)) return new ProviderTimeoutError(common.safeMessage, { ...common, retryable: true });
  return new ProviderError(common.safeMessage, { ...common, retryable: Boolean(error?.retryable) });
}

module.exports = {
  CourseForgeError,
  ConfigurationError,
  SourceProcessingError,
  ProviderError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ResponseSchemaError,
  ComplianceError,
  PersistenceError,
  toCourseForgeError
};
