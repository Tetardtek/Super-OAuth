import { IOAuthService } from '../interfaces/repositories.interface';

export interface StartOAuthDto {
  provider: string;
  tenantId: string;
  redirectUri?: string;
}

export interface OAuthUrlResponseDto {
  authUrl: string;
  state: string;
}

export class StartOAuthUseCase {
  constructor(private readonly oauthService: IOAuthService) {}

  async execute(dto: StartOAuthDto): Promise<OAuthUrlResponseDto> {
    const supportedProviders = ['discord', 'twitch', 'google', 'github'];
    if (!supportedProviders.includes(dto.provider.toLowerCase())) {
      throw new Error(`Unsupported OAuth provider: ${dto.provider}`);
    }

    return this.oauthService.generateAuthUrl(
      dto.provider.toLowerCase(),
      dto.tenantId,
      dto.redirectUri
    );
  }
}
