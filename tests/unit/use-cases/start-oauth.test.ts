import { StartOAuthUseCase } from '../../../src/application/use-cases/start-oauth.use-case';
import { IOAuthService } from '../../../src/application/interfaces/repositories.interface';

describe('StartOAuthUseCase', () => {
  let useCase: StartOAuthUseCase;
  let mockOAuthService: jest.Mocked<IOAuthService>;

  beforeEach(() => {
    mockOAuthService = {
      generateAuthUrl: jest.fn().mockResolvedValue({
        authUrl: 'https://provider.example/oauth/authorize?...',
        state: 'mock-state-32chars-xxxxxxxxxx',
      }),
      exchangeCodeForTokens: jest.fn(),
    };

    useCase = new StartOAuthUseCase(mockOAuthService);
  });

  describe('Happy Path', () => {
    it('should return authUrl and state for a valid provider', async () => {
      const result = await useCase.execute({ provider: 'google', tenantId: 'test-tenant' });

      expect(result.authUrl).toBeDefined();
      expect(result.state).toBeDefined();
      expect(mockOAuthService.generateAuthUrl).toHaveBeenCalledTimes(1);
    });

    it.each(['google', 'github', 'discord', 'twitch'])(
      'should support provider "%s"',
      async (provider) => {
        await expect(useCase.execute({ provider, tenantId: 'test-tenant' })).resolves.toBeDefined();
      }
    );

    it('should pass provider and tenantId to oauthService.generateAuthUrl', async () => {
      await useCase.execute({ provider: 'github', tenantId: 'my-tenant' });

      expect(mockOAuthService.generateAuthUrl).toHaveBeenCalledWith('github', 'my-tenant', undefined);
    });

    it('should normalize provider to lowercase before calling oauthService', async () => {
      await useCase.execute({ provider: 'Google', tenantId: 'test-tenant' });

      const [providerArg] = (mockOAuthService.generateAuthUrl as jest.Mock).mock.calls[0];
      expect(providerArg).toBe('google');
    });

    it('should return the authUrl produced by oauthService', async () => {
      mockOAuthService.generateAuthUrl.mockResolvedValue({
        authUrl: 'https://accounts.google.com/o/oauth2/auth?...',
        state: 'mock-state',
      });

      const result = await useCase.execute({ provider: 'google', tenantId: 'test-tenant' });

      expect(result.authUrl).toBe('https://accounts.google.com/o/oauth2/auth?...');
    });

    it('should return the state produced by oauthService', async () => {
      mockOAuthService.generateAuthUrl.mockResolvedValue({
        authUrl: 'https://accounts.google.com/o/oauth2/auth?...',
        state: 'service-generated-state',
      });

      const result = await useCase.execute({ provider: 'google', tenantId: 'test-tenant' });

      expect(result.state).toBe('service-generated-state');
    });

    it('should forward optional redirectUri to oauthService', async () => {
      const redirectUri = 'https://myapp.com/callback';
      await useCase.execute({ provider: 'google', tenantId: 'test-tenant', redirectUri });

      expect(mockOAuthService.generateAuthUrl).toHaveBeenCalledWith('google', 'test-tenant', redirectUri);
    });
  });

  describe('Error Cases', () => {
    it('should throw for an unsupported provider', async () => {
      await expect(useCase.execute({ provider: 'facebook', tenantId: 'test-tenant' })).rejects.toThrow(
        'Unsupported OAuth provider: facebook'
      );
      expect(mockOAuthService.generateAuthUrl).not.toHaveBeenCalled();
    });

    it('should throw for an empty provider string', async () => {
      await expect(useCase.execute({ provider: '', tenantId: 'test-tenant' })).rejects.toThrow();
      expect(mockOAuthService.generateAuthUrl).not.toHaveBeenCalled();
    });

    it('should throw for a provider with only spaces', async () => {
      await expect(useCase.execute({ provider: '   ', tenantId: 'test-tenant' })).rejects.toThrow();
    });
  });
});
