import { TokenService } from '../../../src/infrastructure/services/token.service';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    // Set test environment variables
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_EXPIRATION = '15m';
    process.env.JWT_REFRESH_EXPIRATION = '7d';
    
    tokenService = new TokenService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_ACCESS_EXPIRATION;
    delete process.env.JWT_REFRESH_EXPIRATION;
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const userId = 'test-user-id';
      const token = tokenService.generateAccessToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different users', () => {
      const token1 = tokenService.generateAccessToken('user1');
      const token2 = tokenService.generateAccessToken('user2');

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = tokenService.generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different refresh tokens on each call', () => {
      const token1 = tokenService.generateRefreshToken();
      const token2 = tokenService.generateRefreshToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const userId = 'test-user-id';
      const token = tokenService.generateAccessToken(userId);

      const result = tokenService.verifyAccessToken(token);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      const result = tokenService.verifyAccessToken(invalidToken);

      expect(result).toBeNull();
    });

    it('should return null for empty token', () => {
      const result = tokenService.verifyAccessToken('');

      expect(result).toBeNull();
    });
  });

  describe('getTokenExpiration', () => {
    it('should return correct expiration times', () => {
      const expiration = tokenService.getTokenExpiration();

      expect(expiration.accessToken).toBe(15 * 60 * 1000); // 15 minutes in ms
      expect(expiration.refreshToken).toBe(7 * 24 * 60 * 60 * 1000); // 7 days in ms
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid expiration format', () => {
      process.env.JWT_ACCESS_EXPIRATION = 'invalid';
      
      expect(() => {
        new TokenService().getTokenExpiration();
      }).toThrow('Invalid expiration format: invalid');
    });

    it('should throw error in production without proper secrets', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_ACCESS_SECRET;

      expect(() => {
        new TokenService();
      }).toThrow('JWT secrets must be properly configured in production');

      process.env.NODE_ENV = originalEnv;
    });
  });
});
