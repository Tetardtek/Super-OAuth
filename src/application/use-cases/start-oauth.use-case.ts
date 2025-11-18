import { IOAuthService } from '../interfaces/repositories.interface';

export interface StartOAuthDto {
  provider: string;
  redirectUri?: string;
}

export interface OAuthUrlResponseDto {
  authUrl: string;
  state: string;
}

export class StartOAuthUseCase {
  constructor(private readonly oauthService: IOAuthService) {}

  async execute(dto: StartOAuthDto): Promise<OAuthUrlResponseDto> {
    // 1. Validate provider
    const supportedProviders = ['discord', 'twitch', 'google', 'github'];
    if (!supportedProviders.includes(dto.provider.toLowerCase())) {
      throw new Error(`Unsupported OAuth provider: ${dto.provider}`);
    }

    // 2. Generate state parameter for CSRF protection
    const state = this.generateState();

    // 3. Get authorization URL from OAuth service
    const authUrl = this.oauthService.getAuthUrl(dto.provider.toLowerCase(), state);

    return {
      authUrl,
      state,
    };
  }

  private generateState(): string {
    // Generate a cryptographically secure random state
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
