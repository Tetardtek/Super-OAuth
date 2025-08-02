import { DomainError } from './domain-error';

export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class UserAlreadyExistsError extends DomainError {
  readonly code = 'USER_ALREADY_EXISTS';
  readonly httpStatus = 409;

  constructor(field: 'email' | 'nickname', value: string) {
    super(`User with ${field} '${value}' already exists`);
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly httpStatus = 401;

  constructor() {
    super('Invalid credentials provided');
  }
}

export class EmailNotVerifiedError extends DomainError {
  readonly code = 'EMAIL_NOT_VERIFIED';
  readonly httpStatus = 403;

  constructor() {
    super('Email address is not verified');
  }
}

export class AccountDeactivatedError extends DomainError {
  readonly code = 'ACCOUNT_DEACTIVATED';
  readonly httpStatus = 403;

  constructor() {
    super('User account is deactivated');
  }
}

export class MaxLinkedAccountsError extends DomainError {
  readonly code = 'MAX_LINKED_ACCOUNTS';
  readonly httpStatus = 400;

  constructor(maxAllowed: number) {
    super(`Maximum ${maxAllowed} linked accounts allowed`);
  }
}

export class ProviderAlreadyLinkedError extends DomainError {
  readonly code = 'PROVIDER_ALREADY_LINKED';
  readonly httpStatus = 409;

  constructor(provider: string) {
    super(`${provider} account is already linked`);
  }
}

export class CannotUnlinkLastProviderError extends DomainError {
  readonly code = 'CANNOT_UNLINK_LAST_PROVIDER';
  readonly httpStatus = 400;

  constructor() {
    super('Cannot unlink last provider without verified email or password');
  }
}

export class WeakPasswordError extends DomainError {
  readonly code = 'WEAK_PASSWORD';
  readonly httpStatus = 400;

  constructor(message: string) {
    super(`Password validation failed: ${message}`);
  }
}

export class InvalidEmailFormatError extends DomainError {
  readonly code = 'INVALID_EMAIL_FORMAT';
  readonly httpStatus = 400;

  constructor() {
    super('Invalid email format provided');
  }
}

export class InvalidNicknameError extends DomainError {
  readonly code = 'INVALID_NICKNAME';
  readonly httpStatus = 400;

  constructor(message: string) {
    super(`Nickname validation failed: ${message}`);
  }
}
