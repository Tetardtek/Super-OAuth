import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';

export type PlatformRole = 'suadmin' | 'client';

/**
 * Platform-level user (SuperOAuth SaaS customer or SUAdmin).
 *
 * Distinct from tenant `User` :
 * - No tenantId — platform scope, email unique globally
 * - passwordHash nullable : seed users go through password reset flow to set
 *   their password (MYSECRETS-safe onboarding)
 * - role 'suadmin' | 'client' (flat — expansion via value addition later)
 */
export class PlatformUser {
  private constructor(
    private readonly _id: string,
    private _email: Email,
    private _passwordHash: string | null,
    private _role: PlatformRole,
    private _emailVerified: boolean,
    private _lastLoginAt: Date | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(id: string, email: Email, password: Password): PlatformUser {
    return new PlatformUser(
      id,
      email,
      password.hash(),
      'client',
      false,
      null,
      new Date(),
      new Date()
    );
  }

  static reconstruct(
    id: string,
    email: string,
    passwordHash: string | null,
    role: PlatformRole,
    emailVerified: boolean,
    lastLoginAt: Date | null,
    createdAt: Date,
    updatedAt: Date
  ): PlatformUser {
    return new PlatformUser(
      id,
      Email.create(email),
      passwordHash,
      role,
      emailVerified,
      lastLoginAt,
      createdAt,
      updatedAt
    );
  }

  verifyEmail(): void {
    this._emailVerified = true;
    this._updatedAt = new Date();
  }

  updatePassword(password: Password): void {
    this._passwordHash = password.hash();
    this._updatedAt = new Date();
  }

  verifyPassword(plain: string): boolean {
    if (!this._passwordHash) return false;
    return Password.verify(plain, this._passwordHash);
  }

  recordLogin(): void {
    this._lastLoginAt = new Date();
    this._updatedAt = new Date();
  }

  /** True when the user was seeded without a password and must go through reset flow first. */
  requiresPasswordReset(): boolean {
    return this._passwordHash === null;
  }

  isSuAdmin(): boolean {
    return this._role === 'suadmin';
  }

  get id(): string {
    return this._id;
  }
  get email(): Email {
    return this._email;
  }
  get role(): PlatformRole {
    return this._role;
  }
  get emailVerified(): boolean {
    return this._emailVerified;
  }
  get lastLoginAt(): Date | null {
    return this._lastLoginAt;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** @internal persistence access only */
  getPasswordHash(): string | null {
    return this._passwordHash;
  }
}
