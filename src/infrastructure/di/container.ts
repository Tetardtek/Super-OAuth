// Dependency Injection Container
import {
  RegisterClassicUseCase,
  LoginClassicUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  StartOAuthUseCase,
  CompleteOAuthUseCase,
  ValidateTokenUseCase,
} from '../../application/use-cases';
import { LinkProviderUseCase } from '../../application/use-cases/link-provider.use-case';
import { MergeAccountsUseCase } from '../../application/use-cases/merge-accounts.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { ConfirmMergeUseCase } from '../../application/use-cases/confirm-merge.use-case';

import {
  TokenService,
  SessionRepository,
  UserRepository,
  OAuthService,
  PasswordService,
  TenantCryptoService,
  TenantRepository,
  TenantTokenService,
  AuditLogService,
} from '../services';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { EmailService } from '../email/email.service';
import { EmailTokenService } from '../services/email-token.service';
import { DatabaseConnection } from '../database/config/database.config';

import {
  ITokenService,
  ISessionRepository,
  IUserRepository,
  IOAuthService,
  ITokenBlacklist,
  ITenantTokenService,
  IAuditLogService,
  IEmailService,
  IEmailTokenService,
} from '../../application/interfaces/repositories.interface';

export class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, unknown> = new Map();

  private constructor() {
    this.registerServices();
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  private registerServices(): void {
    // Infrastructure Services
    this.services.set('TokenService', new TokenService());
    this.services.set('SessionRepository', new SessionRepository());
    this.services.set('UserRepository', new UserRepository());
    this.services.set('OAuthService', new OAuthService());
    this.services.set('PasswordService', new PasswordService());
    this.services.set('TokenBlacklistService', new TokenBlacklistService());

    // Email services
    this.services.set('EmailService', new EmailService());
    this.services.set('EmailTokenService', new EmailTokenService());

    // Tier 3 — Tenant-scoped services
    const tenantCrypto = new TenantCryptoService();
    this.services.set('TenantCryptoService', tenantCrypto);
    const tenantRepository = new TenantRepository(tenantCrypto);
    this.services.set('TenantRepository', tenantRepository);
    this.services.set('TenantTokenService', new TenantTokenService(tenantRepository));
    this.services.set('AuditLogService', new AuditLogService());

    // Use Cases
    this.services.set(
      'RegisterClassicUseCase',
      new RegisterClassicUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<IAuditLogService>('AuditLogService'),
        this.get<IEmailService>('EmailService'),
        this.get<IEmailTokenService>('EmailTokenService')
      )
    );

    this.services.set(
      'LoginClassicUseCase',
      new LoginClassicUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ISessionRepository>('SessionRepository'),
        this.get<ITenantTokenService>('TenantTokenService'),
        this.get<IAuditLogService>('AuditLogService')
      )
    );

    this.services.set(
      'RefreshTokenUseCase',
      new RefreshTokenUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ISessionRepository>('SessionRepository'),
        this.get<ITenantTokenService>('TenantTokenService'),
        this.get<IAuditLogService>('AuditLogService')
      )
    );

    this.services.set(
      'LogoutUseCase',
      new LogoutUseCase(
        this.get<ISessionRepository>('SessionRepository'),
        this.get<ITokenBlacklist>('TokenBlacklistService')
      )
    );

    this.services.set(
      'StartOAuthUseCase',
      new StartOAuthUseCase(this.get<IOAuthService>('OAuthService'))
    );

    this.services.set(
      'CompleteOAuthUseCase',
      new CompleteOAuthUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ISessionRepository>('SessionRepository'),
        this.get<IOAuthService>('OAuthService'),
        this.get<ITenantTokenService>('TenantTokenService'),
        this.get<IAuditLogService>('AuditLogService'),
        this.get<IEmailService>('EmailService'),
        this.get<IEmailTokenService>('EmailTokenService')
      )
    );

    this.services.set(
      'ValidateTokenUseCase',
      new ValidateTokenUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ITokenBlacklist>('TokenBlacklistService'),
        this.get<ITenantTokenService>('TenantTokenService')
      )
    );

    this.services.set(
      'LinkProviderUseCase',
      new LinkProviderUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<IAuditLogService>('AuditLogService')
      )
    );

    this.services.set(
      'MergeAccountsUseCase',
      new MergeAccountsUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ITokenBlacklist>('TokenBlacklistService'),
        DatabaseConnection.getDataSource(),
        this.get<ITenantTokenService>('TenantTokenService'),
        this.get<IAuditLogService>('AuditLogService')
      )
    );

    this.services.set(
      'VerifyEmailUseCase',
      new VerifyEmailUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ISessionRepository>('SessionRepository'),
        this.get<ITenantTokenService>('TenantTokenService'),
        this.get<IAuditLogService>('AuditLogService'),
        this.get<EmailTokenService>('EmailTokenService')
      )
    );

    this.services.set(
      'ConfirmMergeUseCase',
      new ConfirmMergeUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ISessionRepository>('SessionRepository'),
        this.get<ITenantTokenService>('TenantTokenService'),
        this.get<IAuditLogService>('AuditLogService'),
        this.get<EmailTokenService>('EmailTokenService')
      )
    );
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in DI container`);
    }
    return service as T;
  }

  // Convenience methods for getting use cases
  getRegisterClassicUseCase(): RegisterClassicUseCase {
    return this.get<RegisterClassicUseCase>('RegisterClassicUseCase');
  }

  getLoginClassicUseCase(): LoginClassicUseCase {
    return this.get<LoginClassicUseCase>('LoginClassicUseCase');
  }

  getRefreshTokenUseCase(): RefreshTokenUseCase {
    return this.get<RefreshTokenUseCase>('RefreshTokenUseCase');
  }

  getLogoutUseCase(): LogoutUseCase {
    return this.get<LogoutUseCase>('LogoutUseCase');
  }

  getStartOAuthUseCase(): StartOAuthUseCase {
    return this.get<StartOAuthUseCase>('StartOAuthUseCase');
  }

  getCompleteOAuthUseCase(): CompleteOAuthUseCase {
    return this.get<CompleteOAuthUseCase>('CompleteOAuthUseCase');
  }

  getValidateTokenUseCase(): ValidateTokenUseCase {
    return this.get<ValidateTokenUseCase>('ValidateTokenUseCase');
  }

  getLinkProviderUseCase(): LinkProviderUseCase {
    return this.get<LinkProviderUseCase>('LinkProviderUseCase');
  }

  getMergeAccountsUseCase(): MergeAccountsUseCase {
    return this.get<MergeAccountsUseCase>('MergeAccountsUseCase');
  }

  getVerifyEmailUseCase(): VerifyEmailUseCase {
    return this.get<VerifyEmailUseCase>('VerifyEmailUseCase');
  }

  getConfirmMergeUseCase(): ConfirmMergeUseCase {
    return this.get<ConfirmMergeUseCase>('ConfirmMergeUseCase');
  }
}
