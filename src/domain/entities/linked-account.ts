import { LinkedAccountId } from '../value-objects/linked-account-id';
import { UserId } from '../value-objects';
import { ValidationError } from '../errors/domain-error';

export type OAuthProvider = 'discord' | 'google' | 'github';

export interface LinkedAccountData {
  id?: LinkedAccountId;
  userId: UserId;
  provider: OAuthProvider;
  providerId: string;
  displayName: string;
  email: string;
  avatarUrl?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt?: Date;
  updatedAt?: Date;
}

export class LinkedAccount {
  private id: LinkedAccountId | undefined;
  private readonly userId: UserId;
  private readonly provider: OAuthProvider;
  private readonly providerId: string;
  private displayName: string;
  private email: string;
  private avatarUrl: string | undefined;
  private metadata: Record<string, unknown> | undefined;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(data: LinkedAccountData) {
    this.validateData(data);

    this.id = data.id;
    this.userId = data.userId;
    this.provider = data.provider;
    this.providerId = data.providerId;
    this.displayName = data.displayName;
    this.email = data.email;
    this.avatarUrl = data.avatarUrl;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  private validateData(data: LinkedAccountData): void {
    if (!data.userId) {
      throw new ValidationError('LinkedAccount must have a user ID');
    }

    if (!data.provider) {
      throw new ValidationError('LinkedAccount must have a provider');
    }

    if (!['discord', 'google', 'github'].includes(data.provider)) {
      throw new ValidationError('Invalid OAuth provider');
    }

    if (!data.providerId || data.providerId.trim().length === 0) {
      throw new ValidationError('LinkedAccount must have a provider ID');
    }

    if (!data.displayName || data.displayName.trim().length === 0) {
      throw new ValidationError('LinkedAccount must have a display name');
    }

    if (!data.email || data.email.trim().length === 0) {
      throw new ValidationError('LinkedAccount must have an email');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new ValidationError('LinkedAccount email must be valid');
    }
  }

  // Factory methods
  static create(data: Omit<LinkedAccountData, 'id' | 'createdAt' | 'updatedAt'>): LinkedAccount {
    return new LinkedAccount({
      ...data,
      id: LinkedAccountId.generate(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createFromData(data: LinkedAccountData): LinkedAccount {
    return new LinkedAccount(data);
  }

  // Getters
  getId(): LinkedAccountId | undefined {
    return this.id;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getProvider(): OAuthProvider {
    return this.provider;
  }

  getProviderId(): string {
    return this.providerId;
  }

  getDisplayName(): string {
    return this.displayName;
  }

  getEmail(): string {
    return this.email;
  }

  getAvatarUrl(): string | undefined {
    return this.avatarUrl;
  }

  getMetadata(): Record<string, unknown> | undefined {
    return this.metadata;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Business methods
  updateDisplayName(displayName: string): void {
    if (!displayName || displayName.trim().length === 0) {
      throw new ValidationError('Display name cannot be empty');
    }
    this.displayName = displayName.trim();
    this.touch();
  }

  updateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new ValidationError('Email cannot be empty');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Email must be valid');
    }

    this.email = email.trim().toLowerCase();
    this.touch();
  }

  updateAvatarUrl(avatarUrl?: string): void {
    this.avatarUrl = avatarUrl;
    this.touch();
  }

  updateMetadata(metadata?: Record<string, unknown>): void {
    this.metadata = metadata;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  // Helper methods
  isFromProvider(provider: OAuthProvider): boolean {
    return this.provider === provider;
  }

  hasProviderId(providerId: string): boolean {
    return this.providerId === providerId;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id?.getValue(),
      userId: this.userId.getValue(),
      provider: this.provider,
      providerId: this.providerId,
      displayName: this.displayName,
      email: this.email,
      avatarUrl: this.avatarUrl,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
