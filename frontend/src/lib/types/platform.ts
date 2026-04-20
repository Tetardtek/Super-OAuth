export type PlatformRole = 'suadmin' | 'client';

export interface PlatformUser {
	id: string;
	email: string;
	role: PlatformRole;
	emailVerified: boolean;
}

export interface PlatformTenant {
	clientId: string;
	name: string;
	webhookUrl: string | null;
	allowedOrigins: string[] | null;
	redirectUris: string[] | null;
	retentionDays: number;
	createdAt: string;
}

export type TenantRole = 'owner' | 'admin';

/** Tenant row returned by GET /tenants — includes the caller's role. */
export interface AccessibleTenant extends PlatformTenant {
	role: TenantRole;
}

export type OAuthProvider = 'discord' | 'github' | 'google' | 'twitch';

export interface TenantProviderConfig {
	provider: OAuthProvider;
	clientId: string;
}

export interface TenantAdmin {
	platformUserId: string;
	email: string;
	role: TenantRole;
	invitedBy: string | null;
	joinedAt: string;
}

export interface TenantInvitation {
	id: string;
	email: string;
	role: 'admin';
	invitedBy: string;
	expiresAt: string;
	createdAt: string;
}

export interface PlatformAuthResponse {
	accessToken: string;
	refreshToken: string;
	platformUser: PlatformUser;
}

export interface AcceptInvitationResponse extends PlatformAuthResponse {
	tenant: { clientId: string; role: 'admin' };
}

export interface AcceptOwnershipResponse extends PlatformAuthResponse {
	tenant: { clientId: string; role: 'owner' };
}
