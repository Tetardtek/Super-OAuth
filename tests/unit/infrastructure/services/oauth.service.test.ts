import { OAuthService } from '../../../../src/infrastructure/services/oauth.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OAuthService', () => {
  let service: OAuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set minimal env vars for testing BEFORE instantiating service
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
    process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
    process.env.DISCORD_CLIENT_ID = 'test-discord-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-discord-secret';

    service = new OAuthService();
  });

  describe('getAuthUrl', () => {
    it('should generate valid Google OAuth URL', () => {
      // Arrange
      const provider = 'google';
      const state = 'test-state-123';

      // Act
      const url = service.getAuthUrl(provider, state);

      // Assert
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('state=test-state-123');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
      expect(url).toContain('redirect_uri=');
    });

    it('should generate valid GitHub OAuth URL', () => {
      // Arrange
      const provider = 'github';
      const state = 'github-state-456';

      // Act
      const url = service.getAuthUrl(provider, state);

      // Assert
      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-github-client-id');
      expect(url).toContain('state=github-state-456');
      expect(url).toContain('response_type=code');
    });

    it('should generate valid Discord OAuth URL', () => {
      // Arrange
      const provider = 'discord';
      const state = 'discord-state-789';

      // Act
      const url = service.getAuthUrl(provider, state);

      // Assert
      expect(url).toContain('https://discord.com/api/oauth2/authorize');
      expect(url).toContain('client_id=test-discord-client-id');
      expect(url).toContain('state=discord-state-789');
    });

    it('should include Google-specific parameters', () => {
      // Arrange
      const provider = 'google';
      const state = 'state-123';

      // Act
      const url = service.getAuthUrl(provider, state);

      // Assert
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should throw error for unsupported provider', () => {
      // Arrange
      const provider = 'unsupported-provider';
      const state = 'state-123';

      // Act & Assert
      expect(() => service.getAuthUrl(provider, state)).toThrow('Unsupported OAuth provider');
    });

    it('should URL-encode state parameter', () => {
      // Arrange
      const provider = 'google';
      const state = 'state with spaces & special=chars';

      // Act
      const url = service.getAuthUrl(provider, state);

      // Assert
      expect(url).toContain('state=state+with+spaces');
    });

    it('should throw error for non-whitelisted redirect URI', () => {
      // Arrange
      const provider = 'google';
      const state = 'state-123';
      const redirectUri = 'https://evil.com/callback';

      // Act & Assert
      expect(() => service.getAuthUrl(provider, state, redirectUri)).toThrow(
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
      const state = 'state-456';

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
      const state = 'state-789';

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
      const state = 'state-999';

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
    it('should support all providers (google, github, discord)', () => {
      // Arrange
      const providers = ['google', 'github', 'discord'];
      const state = 'test-state';

      // Act & Assert
      providers.forEach((provider) => {
        expect(() => service.getAuthUrl(provider, state)).not.toThrow();
      });
    });

    it('should generate different URLs for different providers', () => {
      // Arrange
      const state = 'same-state';

      // Act
      const googleUrl = service.getAuthUrl('google', state);
      const githubUrl = service.getAuthUrl('github', state);
      const discordUrl = service.getAuthUrl('discord', state);

      // Assert
      expect(googleUrl).not.toBe(githubUrl);
      expect(githubUrl).not.toBe(discordUrl);
      expect(googleUrl).not.toBe(discordUrl);

      expect(googleUrl).toContain('google');
      expect(githubUrl).toContain('github');
      expect(discordUrl).toContain('discord');
    });
  });
});
