export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    public readonly context?: Record<string, any>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_ERROR';
  readonly httpStatus = 422;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}
