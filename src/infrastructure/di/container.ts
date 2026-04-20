// Dependency Injection Container
import {
  RegisterClassicUseCase,
  LoginClassicUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  ValidateTokenUseCase,
} from '../../application/use-cases';
import { LinkProviderUseCase } from '../../application/use-cases/link-provider.use-case';
import { MergeAccountsUseCase } from '../../application/use-cases/merge-accounts.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { ConfirmMergeUseCase } from '../../application/use-cases/confirm-merge.use-case';
import {
  RegisterPlatformUserUseCase,
  VerifyPlatformEmailUseCase,
  LoginPlatformUserUseCase,
  RefreshPlatformSessionUseCase,
  LogoutPlatformUserUseCase,
  CreateTenantUseCase,
  ListOwnedTenantsUseCase,
  UpdateTenantUseCase,
  DeleteTenantUseCase,
  InviteTenantAdminUseCase,
  CancelTenantInvitationUseCase,
  AcceptTenantInvitationUseCase,
  RevokeTenantAdminUseCase,
  InitiateOwnershipTransferUseCase,
  AcceptOwnershipTransferUseCase,
  DeclineOwnershipTransferUseCase,
} from '../../application/use-cases/platform';
import { PlatformUserRepository } from '../database/repositories/platform-user.repository';
import { TenantAdminRepository } from '../database/repositories/tenant-admin.repository';
import { TenantInvitationRepository } from '../database/repositories/tenant-invitation.repository';
import { TenantTransferRepository } from '../database/repositories/tenant-transfer.repository';
import { PlatformEmailTokenService } from '../services/platform-email-token.service';
import { PlatformSessionService } from '../services/platform-session.service';
import { PlatformTokenService } from '../services/platform-token.service';
import { PlatformPasswordResetService } from '../services/platform-password-reset.service';
import { IPlatformUserRepository } from '../../domain/repositories/platform-user.repository.interface';

import {
  TokenService,
  SessionRepository,
  UserRepository,
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
    this.services.set('PasswordService', new PasswordService());
    this.services.set('TokenBlacklistService', new TokenBlacklistService());

    // Email services
    this.services.set('EmailService', new EmailService());
    this.services.set('EmailTokenService', new EmailTokenService());

    // Platform (SOA-002) — services + repositories
    this.services.set('PlatformUserRepository', new PlatformUserRepository());
    this.services.set('TenantAdminRepository', new TenantAdminRepository());
    this.services.set('TenantInvitationRepository', new TenantInvitationRepository());
    this.services.set('TenantTransferRepository', new TenantTransferRepository());
    this.services.set('PlatformEmailTokenService', new PlatformEmailTokenService());
    this.services.set('PlatformSessionService', new PlatformSessionService());
    this.services.set('PlatformTokenService', new PlatformTokenService());
    this.services.set(
      'PlatformPasswordResetService',
      new PlatformPasswordResetService(
        this.get<PlatformEmailTokenService>('PlatformEmailTokenService'),
        this.get<PlatformSessionService>('PlatformSessionService')
      )
    );

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

    // Platform Use Cases (SOA-002)
    this.services.set(
      'RegisterPlatformUserUseCase',
      new RegisterPlatformUserUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<PlatformEmailTokenService>('PlatformEmailTokenService')
      )
    );
    this.services.set(
      'VerifyPlatformEmailUseCase',
      new VerifyPlatformEmailUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<PlatformEmailTokenService>('PlatformEmailTokenService')
      )
    );
    this.services.set(
      'LoginPlatformUserUseCase',
      new LoginPlatformUserUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<PlatformTokenService>('PlatformTokenService'),
        this.get<PlatformSessionService>('PlatformSessionService')
      )
    );
    this.services.set(
      'RefreshPlatformSessionUseCase',
      new RefreshPlatformSessionUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<PlatformTokenService>('PlatformTokenService'),
        this.get<PlatformSessionService>('PlatformSessionService')
      )
    );
    this.services.set(
      'LogoutPlatformUserUseCase',
      new LogoutPlatformUserUseCase(this.get<PlatformSessionService>('PlatformSessionService'))
    );
    this.services.set(
      'CreateTenantUseCase',
      new CreateTenantUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<TenantCryptoService>('TenantCryptoService')
      )
    );
    this.services.set('ListOwnedTenantsUseCase', new ListOwnedTenantsUseCase());
    this.services.set('UpdateTenantUseCase', new UpdateTenantUseCase());
    this.services.set('DeleteTenantUseCase', new DeleteTenantUseCase());

    this.services.set(
      'InviteTenantAdminUseCase',
      new InviteTenantAdminUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<TenantInvitationRepository>('TenantInvitationRepository'),
        this.get<TenantAdminRepository>('TenantAdminRepository'),
        this.get<TenantRepository>('TenantRepository'),
        this.get<EmailService>('EmailService')
      )
    );

    this.services.set(
      'CancelTenantInvitationUseCase',
      new CancelTenantInvitationUseCase(
        this.get<TenantInvitationRepository>('TenantInvitationRepository')
      )
    );

    this.services.set(
      'AcceptTenantInvitationUseCase',
      new AcceptTenantInvitationUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<TenantInvitationRepository>('TenantInvitationRepository'),
        this.get<TenantAdminRepository>('TenantAdminRepository'),
        this.get<PlatformTokenService>('PlatformTokenService'),
        this.get<PlatformSessionService>('PlatformSessionService')
      )
    );

    this.services.set(
      'RevokeTenantAdminUseCase',
      new RevokeTenantAdminUseCase(
        this.get<TenantAdminRepository>('TenantAdminRepository')
      )
    );

    this.services.set(
      'InitiateOwnershipTransferUseCase',
      new InitiateOwnershipTransferUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<TenantTransferRepository>('TenantTransferRepository'),
        this.get<TenantAdminRepository>('TenantAdminRepository'),
        this.get<TenantRepository>('TenantRepository'),
        this.get<EmailService>('EmailService')
      )
    );

    this.services.set(
      'AcceptOwnershipTransferUseCase',
      new AcceptOwnershipTransferUseCase(
        this.get<IPlatformUserRepository>('PlatformUserRepository'),
        this.get<TenantTransferRepository>('TenantTransferRepository'),
        this.get<PlatformTokenService>('PlatformTokenService'),
        this.get<PlatformSessionService>('PlatformSessionService')
      )
    );

    this.services.set(
      'DeclineOwnershipTransferUseCase',
      new DeclineOwnershipTransferUseCase(
        this.get<TenantTransferRepository>('TenantTransferRepository')
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

  // Platform (SOA-002)
  getRegisterPlatformUserUseCase(): RegisterPlatformUserUseCase {
    return this.get<RegisterPlatformUserUseCase>('RegisterPlatformUserUseCase');
  }

  getVerifyPlatformEmailUseCase(): VerifyPlatformEmailUseCase {
    return this.get<VerifyPlatformEmailUseCase>('VerifyPlatformEmailUseCase');
  }

  getLoginPlatformUserUseCase(): LoginPlatformUserUseCase {
    return this.get<LoginPlatformUserUseCase>('LoginPlatformUserUseCase');
  }

  getRefreshPlatformSessionUseCase(): RefreshPlatformSessionUseCase {
    return this.get<RefreshPlatformSessionUseCase>('RefreshPlatformSessionUseCase');
  }

  getLogoutPlatformUserUseCase(): LogoutPlatformUserUseCase {
    return this.get<LogoutPlatformUserUseCase>('LogoutPlatformUserUseCase');
  }

  getCreateTenantUseCase(): CreateTenantUseCase {
    return this.get<CreateTenantUseCase>('CreateTenantUseCase');
  }

  getListOwnedTenantsUseCase(): ListOwnedTenantsUseCase {
    return this.get<ListOwnedTenantsUseCase>('ListOwnedTenantsUseCase');
  }

  getUpdateTenantUseCase(): UpdateTenantUseCase {
    return this.get<UpdateTenantUseCase>('UpdateTenantUseCase');
  }

  getDeleteTenantUseCase(): DeleteTenantUseCase {
    return this.get<DeleteTenantUseCase>('DeleteTenantUseCase');
  }

  getInviteTenantAdminUseCase(): InviteTenantAdminUseCase {
    return this.get<InviteTenantAdminUseCase>('InviteTenantAdminUseCase');
  }

  getCancelTenantInvitationUseCase(): CancelTenantInvitationUseCase {
    return this.get<CancelTenantInvitationUseCase>('CancelTenantInvitationUseCase');
  }

  getAcceptTenantInvitationUseCase(): AcceptTenantInvitationUseCase {
    return this.get<AcceptTenantInvitationUseCase>('AcceptTenantInvitationUseCase');
  }

  getRevokeTenantAdminUseCase(): RevokeTenantAdminUseCase {
    return this.get<RevokeTenantAdminUseCase>('RevokeTenantAdminUseCase');
  }

  getInitiateOwnershipTransferUseCase(): InitiateOwnershipTransferUseCase {
    return this.get<InitiateOwnershipTransferUseCase>('InitiateOwnershipTransferUseCase');
  }

  getAcceptOwnershipTransferUseCase(): AcceptOwnershipTransferUseCase {
    return this.get<AcceptOwnershipTransferUseCase>('AcceptOwnershipTransferUseCase');
  }

  getDeclineOwnershipTransferUseCase(): DeclineOwnershipTransferUseCase {
    return this.get<DeclineOwnershipTransferUseCase>('DeclineOwnershipTransferUseCase');
  }
}
