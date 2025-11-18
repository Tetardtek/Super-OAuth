import { SessionId } from '../value-objects/session-id';
import { UserId } from '../value-objects/user-id';
import { ValidationError } from '../errors/domain-error';

export interface SessionData {
  id?: SessionId;
  userId: UserId;
  token: string;
  refreshToken?: string | undefined;
  expiresAt: Date;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  isActive?: boolean;
  lastActivity?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Session {
  private id: SessionId | undefined;
  private readonly userId: UserId;
  private token: string;
  private refreshToken: string | undefined;
  private expiresAt: Date;
  private ipAddress: string | undefined;
  private userAgent: string | undefined;
  private isActive: boolean;
  private lastActivity: Date;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(data: SessionData) {
    this.validateData(data);

    this.id = data.id;
    this.userId = data.userId;
    this.token = data.token;
    this.refreshToken = data.refreshToken;
    this.expiresAt = data.expiresAt;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.isActive = data.isActive ?? true;
    this.lastActivity = data.lastActivity || new Date();
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  private validateData(data: SessionData): void {
    if (!data.userId) {
      throw new ValidationError('Session must have a user ID');
    }

    if (!data.token || data.token.trim().length === 0) {
      throw new ValidationError('Session must have a token');
    }

    if (!data.expiresAt) {
      throw new ValidationError('Session must have an expiration date');
    }

    if (data.expiresAt <= new Date()) {
      throw new ValidationError('Session expiration date must be in the future');
    }
  }

  // Factory methods
  static create(
    data: Omit<SessionData, 'id' | 'createdAt' | 'updatedAt' | 'lastActivity' | 'isActive'>
  ): Session {
    return new Session({
      ...data,
      id: SessionId.generate(),
      isActive: true,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createFromData(data: SessionData): Session {
    return new Session(data);
  }

  // Getters
  getId(): SessionId | undefined {
    return this.id;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getToken(): string {
    return this.token;
  }

  getRefreshToken(): string | undefined {
    return this.refreshToken;
  }

  getExpiresAt(): Date {
    return this.expiresAt;
  }

  getIpAddress(): string | undefined {
    return this.ipAddress;
  }

  getUserAgent(): string | undefined {
    return this.userAgent;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getLastActivity(): Date {
    return this.lastActivity;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business methods
  updateToken(token: string): void {
    if (!token || token.trim().length === 0) {
      throw new ValidationError('Token cannot be empty');
    }
    this.token = token;
    this.touch();
  }

  updateRefreshToken(refreshToken?: string): void {
    this.refreshToken = refreshToken;
    this.touch();
  }

  extendExpiration(expiresAt: Date): void {
    if (expiresAt <= new Date()) {
      throw new ValidationError('New expiration date must be in the future');
    }
    this.expiresAt = expiresAt;
    this.touch();
  }

  updateActivity(ipAddress?: string, userAgent?: string): void {
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.lastActivity = new Date();
    this.touch();
  }

  deactivate(): void {
    this.isActive = false;
    this.touch();
  }

  reactivate(): void {
    if (this.isExpired()) {
      throw new ValidationError('Cannot reactivate expired session');
    }
    this.isActive = true;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  // Helper methods
  isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  getRemainingTime(): number {
    return Math.max(0, this.expiresAt.getTime() - new Date().getTime());
  }

  getRemainingTimeInMinutes(): number {
    return Math.floor(this.getRemainingTime() / (1000 * 60));
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id?.getValue(),
      userId: this.userId.getValue(),
      token: this.token,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt.toISOString(),
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      isActive: this.isActive,
      lastActivity: this.lastActivity.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
