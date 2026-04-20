import { PlatformPasswordResetService } from '../../../src/infrastructure/services/platform-password-reset.service';

jest.mock('../../../src/infrastructure/database/config/database.config', () => ({
  DatabaseConnection: {
    getDataSource: jest.fn(),
  },
}));

describe('PlatformPasswordResetService', () => {
  let service: PlatformPasswordResetService;
  let mockUserRepository: {
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let mockEmailTokenService: {
    createPasswordResetToken: jest.Mock;
    verifyToken: jest.Mock;
  };
  let mockSessionService: {
    revokeAllForUser: jest.Mock;
  };
  let mockPasswordService: {
    hash: jest.Mock;
    verify: jest.Mock;
  };

  beforeEach(() => {
    mockUserRepository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseConnection } = jest.requireMock(
      '../../../src/infrastructure/database/config/database.config'
    );
    (DatabaseConnection.getDataSource as jest.Mock).mockReturnValue({
      getRepository: () => mockUserRepository,
    });

    mockEmailTokenService = {
      createPasswordResetToken: jest.fn().mockResolvedValue({
        rawToken: 'raw-xyz',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
      verifyToken: jest.fn(),
    };
    mockSessionService = {
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    mockPasswordService = {
      hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
      verify: jest.fn(),
    };

    service = new PlatformPasswordResetService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEmailTokenService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSessionService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPasswordService as any
    );
  });

  describe('requestReset()', () => {
    it('returns issued=false when the email is unknown (no enumeration)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.requestReset('ghost@example.com');
      expect(result.issued).toBe(false);
      expect(result.rawToken).toBeUndefined();
      expect(mockEmailTokenService.createPasswordResetToken).not.toHaveBeenCalled();
    });

    it('issues a token when the email matches a platform user', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'u-1', email: 'a@b.c' });

      const result = await service.requestReset('a@b.c');
      expect(result.issued).toBe(true);
      expect(result.rawToken).toBe('raw-xyz');
      expect(mockEmailTokenService.createPasswordResetToken).toHaveBeenCalledWith({
        platformUserId: 'u-1',
      });
    });
  });

  describe('confirmReset()', () => {
    it('rejects passwords shorter than 12 chars with weak_password', async () => {
      const result = await service.confirmReset('raw', 'short');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('weak_password');
      expect(mockEmailTokenService.verifyToken).not.toHaveBeenCalled();
    });

    it('returns invalid_token when the token cannot be verified', async () => {
      mockEmailTokenService.verifyToken.mockResolvedValue(null);
      const result = await service.confirmReset('raw', 'ValidPassword123!');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid_token');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('updates the hash and revokes all sessions on success', async () => {
      mockEmailTokenService.verifyToken.mockResolvedValue({ platformUserId: 'u-1' });

      const result = await service.confirmReset('raw', 'ValidPassword123!');

      expect(result.success).toBe(true);
      expect(result.platformUserId).toBe('u-1');
      expect(mockPasswordService.hash).toHaveBeenCalledWith('ValidPassword123!');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'u-1' },
        { passwordHash: '$2b$12$hashed' }
      );
      expect(mockSessionService.revokeAllForUser).toHaveBeenCalledWith('u-1');
    });
  });
});
