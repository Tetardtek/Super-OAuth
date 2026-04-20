import { LogoutPlatformUserUseCase } from '../../../../src/application/use-cases/platform/logout-platform-user.use-case';

describe('LogoutPlatformUserUseCase', () => {
  it('delegates to sessionService.revokeByRefreshToken and is idempotent', async () => {
    const mockSessionService = {
      revokeByRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useCase = new LogoutPlatformUserUseCase(mockSessionService as any);

    await useCase.execute({ refreshToken: 'raw-a' });
    await useCase.execute({ refreshToken: 'raw-a' });

    expect(mockSessionService.revokeByRefreshToken).toHaveBeenCalledTimes(2);
    expect(mockSessionService.revokeByRefreshToken).toHaveBeenCalledWith('raw-a');
  });
});
