import { PlatformTokenService } from '../../../src/infrastructure/services/platform-token.service';
import { TokenService } from '../../../src/infrastructure/services/token.service';

const ORIGINAL_ACCESS = process.env.JWT_ACCESS_SECRET;
const ORIGINAL_REFRESH = process.env.JWT_REFRESH_SECRET;

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
});
afterAll(() => {
  if (ORIGINAL_ACCESS !== undefined) process.env.JWT_ACCESS_SECRET = ORIGINAL_ACCESS;
  else delete process.env.JWT_ACCESS_SECRET;
  if (ORIGINAL_REFRESH !== undefined) process.env.JWT_REFRESH_SECRET = ORIGINAL_REFRESH;
  else delete process.env.JWT_REFRESH_SECRET;
});

describe('PlatformTokenService', () => {
  let service: PlatformTokenService;

  beforeEach(() => {
    service = new PlatformTokenService();
  });

  it('issues an access token that verifies with matching claims', () => {
    const token = service.generateAccessToken('u-1', 'client');
    const claims = service.verifyAccessToken(token);
    expect(claims).not.toBeNull();
    expect(claims?.platformUserId).toBe('u-1');
    expect(claims?.role).toBe('client');
    expect(claims?.jti).toBeTruthy();
  });

  it('issues a refresh token that verifies', () => {
    const token = service.generateRefreshToken();
    const decoded = service.verifyRefreshToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.jti).toBeTruthy();
  });

  it('rejects a tampered access token', () => {
    const token = service.generateAccessToken('u-1', 'client') + 'x';
    expect(service.verifyAccessToken(token)).toBeNull();
  });

  it('enforces audience isolation — tenant access token must not verify as platform', () => {
    const tenantService = new TokenService();
    const tenantToken = tenantService.generateAccessToken('u-1', 'origins');
    expect(service.verifyAccessToken(tenantToken)).toBeNull();
  });

  it('enforces audience isolation — a platform access token is not accepted as refresh', () => {
    const accessToken = service.generateAccessToken('u-1', 'client');
    expect(service.verifyRefreshToken(accessToken)).toBeNull();
  });
});
