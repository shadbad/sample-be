/** Base class for all domain/application exceptions. */
export class AppException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Resource not found. Maps to HTTP 404. */
export class NotFoundException extends AppException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', context);
  }
}

/** Duplicate or conflicting resource. Maps to HTTP 409. */
export class ConflictException extends AppException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFLICT', context);
  }
}

/** Business-rule validation failure. Maps to HTTP 422. */
export class ValidationException extends AppException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/** Authentication or authorisation failure. Maps to HTTP 401. */
export class UnauthorisedException extends AppException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'UNAUTHORISED', context);
  }
}
