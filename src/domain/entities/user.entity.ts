import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { Nickname } from '../value-objects/nickname.vo';
import { LinkedAccount } from './linked-account';

export class User {
  private constructor(
    private readonly _id: string,
    private _email: Email | null,
    private _nickname: Nickname,
    private _passwordHash: string | null,
    private _emailVerified: boolean,
    private _isActive: boolean,
    private _createdAt: Date,
    private _updatedAt: Date,
    private _lastLogin: Date | null,
    private _loginCount: number,
    private _linkedAccounts: LinkedAccount[] = [],
    private readonly _tenantId: string = 'origins',
    private _emailSource: string | null = null
  ) {}

  // Factory Methods
  static createWithEmail(
    id: string,
    email: Email,
    nickname: Nickname,
    password: Password,
    tenantId: string
  ): User {
    return new User(
      id,
      email,
      nickname,
      password.hash(),
      false,
      true,
      new Date(),
      new Date(),
      null,
      0,
      [],
      tenantId,
      'classic'
    );
  }

  static createWithProvider(
    id: string,
    nickname: Nickname,
    linkedAccount: LinkedAccount,
    tenantId: string,
    email?: Email,
    emailVerified?: boolean
  ): User {
    const verified = email ? (emailVerified ?? false) : false;
    const emailSource = email && verified ? `provider:${linkedAccount.getProvider()}` : null;
    const user = new User(
      id,
      email || null,
      nickname,
      null,
      verified,
      true,
      new Date(),
      new Date(),
      null,
      0,
      [],
      tenantId,
      emailSource
    );
    user._linkedAccounts.push(linkedAccount);
    return user;
  }

  // Factory method for reconstructing from database
  static reconstruct(
    id: string,
    email: string | null,
    nickname: string,
    passwordHash: string | null,
    emailVerified: boolean,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    lastLogin: Date | null,
    loginCount: number,
    linkedAccounts: LinkedAccount[] = [],
    tenantId: string = 'origins',
    emailSource: string | null = null
  ): User {
    return new User(
      id,
      email ? Email.create(email) : null,
      Nickname.create(nickname),
      passwordHash,
      emailVerified,
      isActive,
      createdAt,
      updatedAt,
      lastLogin,
      loginCount,
      linkedAccounts,
      tenantId,
      emailSource
    );
  }

  // Business Methods
  linkAccount(linkedAccount: LinkedAccount): void {
    // Business Rule: Maximum 5 providers
    if (this._linkedAccounts.length >= 5) {
      throw new Error('Maximum 5 linked accounts allowed');
    }

    // Business Rule: No duplicate providers
    const existingProvider = this._linkedAccounts.find(
      (acc) => acc.getProvider() === linkedAccount.getProvider()
    );
    if (existingProvider) {
      throw new Error(`${linkedAccount.getProvider()} account already linked`);
    }

    this._linkedAccounts.push(linkedAccount);
    this._updatedAt = new Date();
  }

  unlinkAccount(provider: string): void {
    // Business Rule: Cannot unlink last provider if no email verified
    if (this._linkedAccounts.length === 1 && !this._emailVerified && !this._passwordHash) {
      throw new Error('Cannot unlink last provider without verified email or password');
    }

    this._linkedAccounts = this._linkedAccounts.filter((acc) => acc.getProvider() !== provider);
    this._updatedAt = new Date();
  }

  verifyEmail(): void {
    this._emailVerified = true;
    this._updatedAt = new Date();
  }

  updatePassword(newPassword: Password): void {
    this._passwordHash = newPassword.hash();
    this._updatedAt = new Date();
  }

  verifyPassword(password: string): boolean {
    if (!this._passwordHash) {
      return false;
    }
    return Password.verify(password, this._passwordHash);
  }

  recordLogin(): void {
    this._lastLogin = new Date();
    this._loginCount += 1;
    this._updatedAt = new Date();
  }

  deactivate(_reason?: string): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /** Update email when the original provider source sends a new verified email (staleness — ADR-008) */
  updateEmailFromProvider(email: Email, source: string): void {
    if (this._emailSource === source) {
      this._email = email;
      this._updatedAt = new Date();
    }
  }

  // Validation Methods
  canUnlinkProvider(provider: string): boolean {
    const isLastProvider = this._linkedAccounts.length === 1;
    const hasVerifiedEmail = this._emailVerified && Boolean(this._email);
    const hasPassword = this._passwordHash !== null;

    if (!isLastProvider) return true;
    if (this._linkedAccounts[0]?.getProvider() !== provider) return true;
    return hasVerifiedEmail || hasPassword;
  }

  isProviderLinked(provider: string): boolean {
    return this._linkedAccounts.some((acc) => acc.getProvider() === provider);
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get email(): Email | null {
    return this._email;
  }
  get nickname(): Nickname {
    return this._nickname;
  }
  get emailVerified(): boolean {
    return this._emailVerified;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get lastLogin(): Date | null {
    return this._lastLogin;
  }
  get loginCount(): number {
    return this._loginCount;
  }
  get linkedAccounts(): readonly LinkedAccount[] {
    return [...this._linkedAccounts];
  }
  get hasPassword(): boolean {
    return this._passwordHash !== null;
  }
  get linkedProviders(): string[] {
    return this._linkedAccounts.map((acc) => acc.getProvider());
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get emailSource(): string | null {
    return this._emailSource;
  }

  /**
   * Get password hash (for persistence layer only)
   * @internal
   */
  getPasswordHash(): string | null {
    return this._passwordHash;
  }
}
