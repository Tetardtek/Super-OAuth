import { StartOAuthUseCase } from '../../../src/application/use-cases/start-oauth.use-case';
import { IOAuthService } from '../../../src/application/interfaces/repositories.interface';

describe('StartOAuthUseCase', () => {
  let useCase: StartOAuthUseCase;
  let mockOAuthService: jest.Mocked<IOAuthService>;

  beforeEach(() => {
    mockOAuthService = {
      getAuthUrl: jest.fn().mockReturnValue('https://provider.example/oauth/authorize?...'),
      exchangeCodeForTokens: jest.fn(),
    };

    useCase = new StartOAuthUseCase(mockOAuthService);
  });

  describe('Happy Path', () => {
    it('should return authUrl and state for a valid provider', async () => {
      const result = await useCase.execute({ provider: 'google' });

      expect(result.authUrl).toBeDefined();
      expect(result.state).toBeDefined();
      expect(mockOAuthService.getAuthUrl).toHaveBeenCalledTimes(1);
    });

    it.each(['google', 'github', 'discord', 'twitch'])(
      'should support provider "%s"',
      async (provider) => {
        await expect(useCase.execute({ provider })).resolves.toBeDefined();
      }
    );

    it('should pass the generated state to oauthService.getAuthUrl', async () => {
      const result = await useCase.execute({ provider: 'github' });

      const [, stateArg] = mockOAuthService.getAuthUrl.mock.calls[0];
      expect(stateArg).toBe(result.state);
    });

    it('should normalize provider to lowercase before calling oauthService', async () => {
      await useCase.execute({ provider: 'Google' });

      const [providerArg] = mockOAuthService.getAuthUrl.mock.calls[0];
      expect(providerArg).toBe('google');
    });

    it('should return the authUrl produced by oauthService', async () => {
      mockOAuthService.getAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?...');

      const result = await useCase.execute({ provider: 'google' });

      expect(result.authUrl).toBe('https://accounts.google.com/o/oauth2/auth?...');
    });
  });

  describe('State generation', () => {
    it('should generate a 32-character alphanumeric state', async () => {
      const result = await useCase.execute({ provider: 'discord' });

      expect(result.state).toHaveLength(32);
      expect(result.state).toMatch(/^[A-Za-z0-9]{32}$/);
    });

    it('should generate a unique state on each call', async () => {
      const [r1, r2, r3] = await Promise.all([
        useCase.execute({ provider: 'github' }),
        useCase.execute({ provider: 'github' }),
        useCase.execute({ provider: 'github' }),
      ]);

      // Collision sur 32 chars alphanumériques est astronomiquement improbable
      expect(r1.state).not.toBe(r2.state);
      expect(r2.state).not.toBe(r3.state);
    });
  });

  describe('Error Cases', () => {
    it('should throw for an unsupported provider', async () => {
      await expect(useCase.execute({ provider: 'facebook' })).rejects.toThrow(
        'Unsupported OAuth provider: facebook'
      );
      expect(mockOAuthService.getAuthUrl).not.toHaveBeenCalled();
    });

    it('should throw for an empty provider string', async () => {
      await expect(useCase.execute({ provider: '' })).rejects.toThrow();
      expect(mockOAuthService.getAuthUrl).not.toHaveBeenCalled();
    });

    it('should throw for a provider with only spaces', async () => {
      await expect(useCase.execute({ provider: '   ' })).rejects.toThrow();
    });
  });
});
