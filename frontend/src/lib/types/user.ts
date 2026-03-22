export interface User {
	id: number;
	email: string;
	nickname: string;
	avatarUrl?: string;
	emailVerified: boolean;
	createdAt: string;
	lastLoginAt?: string;
	linkedAccounts?: LinkedAccount[];
}

export interface LinkedAccount {
	provider: string;
	providerUserId: string;
	providerEmail?: string;
	linkedAt: string;
}

export interface Tenant {
	id: string;
	name: string;
	slug: string;
	redirectUris: string[];
	allowedOrigins: string[];
	providers: string[];
	plan: 'starter' | 'studio' | 'pro' | 'enterprise';
	isActive: boolean;
	createdAt: string;
}
