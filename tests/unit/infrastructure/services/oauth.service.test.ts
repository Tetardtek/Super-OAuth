import { OAuthService } from '../../../../src/infrastructure/services/oauth.service';
import { IStateStorage } from '../../../../src/infrastructure/redis';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OAuthService', () => {
  let service: OAuthService;
  let mockStateStorage: jest.Mocked<IStateStorage>;

  beforeEach(() => {
    jest.clearAllMocks();

    // In-memory mock — no Redis connection required in unit tests
    mockStateStorage = {
      save: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
      cleanupExpired: jest.fn().mockResolvedValue(0),
    } as jest.Mocked<IStateStorage>;

    // Set minimal env vars for testing BEFORE instantiating service
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
    process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
    process.env.DISCORD_CLIENT_ID = 'test-discord-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-discord-secret';

    service = new OAuthService(mockStateStorage);
  });

  describe('generateAuthUrl', () => {
    it('should generate valid Google OAuth URL', async () => {
      // Arrange
      const provider = 'google';

      // Act
      const result = await service.generateAuthUrl(provider, 'test-tenant');

      // Assert
      expect(result.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result.authUrl).toContain('client_id=test-google-client-id');
      expect(result.authUrl).toContain('state=');
      expect(result.authUrl).toContain('response_type=code');
      expect(result.authUrl).toContain('scope=');
      expect(result.authUrl).toContain('redirect_uri=');
      expect(result.state).toBeTruthy();
    });

    it('should generate valid GitHub OAuth URL', async () => {
      // Arrange
      const provider = 'github';

      // Act
      const result = await service.generateAuthUrl(provider, 'test-tenant');

      // Assert
      expect(result.authUrl).toContain('https://github.com/login/oauth/authorize');
      expect(result.authUrl).toContain('client_id=test-github-client-id');
      expect(result.authUrl).toContain('state=');
      expect(result.authUrl).toContain('response_type=code');
      expect(result.state).toBeTruthy();
    });

    it('should generate valid Discord OAuth URL', async () => {
      // Arrange
      const provider = 'discord';

      // Act
      const result = await service.generateAuthUrl(provider, 'test-tenant');

      // Assert
      expect(result.authUrl).toContain('https://discord.com/api/oauth2/authorize');
      expect(result.authUrl).toContain('client_id=test-discord-client-id');
      expect(result.authUrl).toContain('state=');
      expect(result.state).toBeTruthy();
    });

    it('should include Google-specific parameters', async () => {
      // Arrange
      const provider = 'google';

      // Act
      const result = await service.generateAuthUrl(provider, 'test-tenant');

      // Assert
      expect(result.authUrl).toContain('access_type=offline');
      expect(result.authUrl).toContain('prompt=consent');
    });

    it('should throw error for unsupported provider', async () => {
      // Arrange
      const provider = 'unsupported-provider';

      // Act & Assert
      await expect(service.generateAuthUrl(provider, 'test-tenant')).rejects.toThrow('Unsupported OAuth provider');
    });

    it('should generate a unique state on each call', async () => {
      // Arrange
      const provider = 'google';

      // Act
      const r1 = await service.generateAuthUrl(provider, 'test-tenant');
      const r2 = await service.generateAuthUrl(provider, 'test-tenant');

      // Assert — state is generated internally, must be unique per call
      expect(r1.state).toBeTruthy();
      expect(r2.state).toBeTruthy();
      expect(r1.state).not.toBe(r2.state);
    });

    it('should throw error for non-whitelisted redirect URI', async () => {
      // Arrange
      const provider = 'google';
      const redirectUri = 'https://evil.com/callback';

      // Act & Assert
      await expect(service.generateAuthUrl(provider, 'test-tenant', redirectUri)).rejects.toThrow(
        'redirect_uri non autorisé'
      );
    });
  });

  describe('exchangeCodeForTokens - Google', () => {
    it('should exchange Google auth code for tokens and user info', async () => {
      // Arrange
      const provider = 'google';
      const code = 'google-auth-code-123';
      const state = 'state-123';

      // Mock token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'google-access-token',
          refresh_token: 'google-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      // Mock user info fetch
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'google-user-123',
          email: 'user@gmail.com',
          name: 'Test User',
        },
      });

      // Act
      const result = await service.exchangeCodeForTokens(provider, code, state);

      // Assert
      expect(result.accessToken).toBe('google-access-token');
      expect(result.refreshToken).toBe('google-refresh-token');
      expect(result.userInfo.id).toBe('google-user-123');
      expect(result.userInfo.email).toBe('user@gmail.com');
      expect(result.userInfo.nickname).toBe('Test User');
    });

    it('should handle Google response without refresh token', async () => {
      // Arrange
      const provider = 'google';
      const code = 'code-123';
      const state = 'state-123';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'access-only',
          token_type: 'Bearer',
          // No refresh_token
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'User',
        },
      });

      // Act
      const result = await service.exchangeCodeForTokens(provider, code, state);

      // Assert
      expect(result.accessToken).toBe('access-only');
      expect(result.refreshToken).toBeUndefined();
    });
  });

  describe('exchangeCodeForTokens - GitHub', () => {
    it('should exchange GitHub auth code for tokens and user info', async () => {
      // Arrange
      const provider = 'github';
      const code = 'github-code-456';
      const state = 'state-123';

      // Mock token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'github-access-token',
          token_type: 'bearer',
          scope: 'user:email',
        },
      });

      // Mock user info fetch
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'github-user-456',
          email: 'user@github.com',
          login: 'githubuser',
          name: 'GitHub User',
        },
      });

      // Act
      const result = await service.exchangeCodeForTokens(provider, code, state);

      // Assert
      expect(result.accessToken).toBe('github-access-token');
      expect(result.userInfo.id).toBe('github-user-456');
      expect(result.userInfo.email).toBe('user@github.com');
      expect(result.userInfo.nickname).toBeTruthy();
    });

    it('should handle GitHub user without email', async () => {
      // Arrange
      const provider = 'github';
      const code = 'code-789';
      const state = 'state-123';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'access-token',
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'github-user-no-email',
          login: 'usernoemail',
          name: 'User NoEmail',
          // No email
        },
      });

      // Act
      const result = await service.exchangeCodeForTokens(provider, code, state);

      // Assert
      expect(result.userInfo.id).toBe('github-user-no-email');
      expect(result.userInfo.email).toBeUndefined();
      expect(result.userInfo.nickname).toBeTruthy();
    });
  });

  describe('exchangeCodeForTokens - Discord', () => {
    it('should exchange Discord auth code for tokens and user info', async () => {
      // Arrange
      const provider = 'discord';
      const code = 'discord-code-999';
      const state = 'state-123';

      // Mock token exchange
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'discord-access-token',
          refresh_token: 'discord-refresh-token',
          token_type: 'Bearer',
          expires_in: 604800,
        },
      });

      // Mock user info fetch
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'discord-user-999',
          email: 'user@discord.com',
          username: 'discorduser',
          discriminator: '1234',
        },
      });

      // Act
      const result = await service.exchangeCodeForTokens(provider, code, state);

      // Assert
      expect(result.accessToken).toBe('discord-access-token');
      expect(result.refreshToken).toBe('discord-refresh-token');
      expect(result.userInfo.id).toBe('discord-user-999');
      expect(result.userInfo.email).toBe('user@discord.com');
      expect(result.userInfo.nickname).toContain('discorduser');
    });
  });

  describe('Error Cases', () => {
    it('should throw error for unsupported provider during exchange', async () => {
      // Arrange
      const provider = 'invalid-provider';
      const code = 'code-123';
      const state = 'state-123';

      // Act & Assert
      await expect(service.exchangeCodeForTokens(provider, code, state)).rejects.toThrow(
        'Unsupported OAuth provider'
      );
    });

    it('should throw error if token exchange fails', async () => {
      // Arrange
      const provider = 'google';
      const code = 'invalid-code';
      const state = 'state-123';

      mockedAxios.post.mockRejectedValueOnce(new Error('Invalid authorization code'));

      // Act & Assert
      await expect(service.exchangeCodeForTokens(provider, code, state)).rejects.toThrow(
        'Invalid authorization code'
      );
    });

    it('should throw error if user info fetch fails', async () => {
      // Arrange
      const provider = 'google';
      const code = 'code-123';
      const state = 'state-123';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'access-token',
        },
      });

      mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch user info'));

      // Act & Assert
      await expect(service.exchangeCodeForTokens(provider, code, state)).rejects.toThrow(
        'Failed to fetch user info'
      );
    });

    it('should handle OAuth provider error response', async () => {
      // Arrange
      const provider = 'google';
      const code = 'error-code';
      const state = 'state-123';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          error: 'invalid_grant',
          error_description: 'Code has expired',
        },
      });

      // Act & Assert
      // Note: Implementation might need to handle this case explicitly
      // For now, we test that it at least doesn't crash
      await expect(service.exchangeCodeForTokens(provider, code, state)).rejects.toThrow();
    });
  });

  describe('Integration - Multiple Providers', () => {
    it('should support all providers (google, github, discord)', async () => {
      // Arrange
      const providers = ['google', 'github', 'discord'];

      // Act & Assert
      for (const provider of providers) {
        await expect(service.generateAuthUrl(provider, 'test-tenant')).resolves.toBeDefined();
      }
    });

    it('should generate different URLs for different providers', async () => {
      // Act
      const googleResult = await service.generateAuthUrl('google', 'test-tenant');
      const githubResult = await service.generateAuthUrl('github', 'test-tenant');
      const discordResult = await service.generateAuthUrl('discord', 'test-tenant');

      // Assert
      expect(googleResult.authUrl).not.toBe(githubResult.authUrl);
      expect(githubResult.authUrl).not.toBe(discordResult.authUrl);
      expect(googleResult.authUrl).not.toBe(discordResult.authUrl);

      expect(googleResult.authUrl).toContain('google');
      expect(githubResult.authUrl).toContain('github');
      expect(discordResult.authUrl).toContain('discord');
    });
  });
});
