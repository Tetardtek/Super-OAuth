// Dependency Injection Container
import {
  RegisterClassicUseCase,
  LoginClassicUseCase,
  RefreshTokenUseCase,
  LogoutUseCase,
  StartOAuthUseCase,
  CompleteOAuthUseCase,
} from '../../application/use-cases';

import {
  TokenService,
  SessionRepository,
  UserRepository,
  OAuthService,
  PasswordService,
} from '../services';

import {
  ITokenService,
  ISessionRepository,
  IUserRepository,
  IOAuthService,
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

    // Use Cases
    this.services.set(
      'RegisterClassicUseCase',
      new RegisterClassicUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService')
      )
    );

    this.services.set(
      'LoginClassicUseCase',
      new LoginClassicUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ISessionRepository>('SessionRepository')
      )
    );

    this.services.set(
      'RefreshTokenUseCase',
      new RefreshTokenUseCase(
        this.get<IUserRepository>('UserRepository'),
        this.get<ITokenService>('TokenService'),
        this.get<ISessionRepository>('SessionRepository')
      )
    );

    this.services.set(
      'LogoutUseCase',
      new LogoutUseCase(this.get<ISessionRepository>('SessionRepository'))
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
        this.get<IOAuthService>('OAuthService')
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
}
