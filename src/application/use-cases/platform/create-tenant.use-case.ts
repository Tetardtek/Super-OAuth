import crypto from 'crypto';
import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { DatabaseConnection } from '../../../infrastructure/database/config/database.config';
import { TenantEntity } from '../../../infrastructure/database/entities/tenant.entity';
import { TenantAdminEntity } from '../../../infrastructure/database/entities/tenant-admin.entity';
import { TenantCryptoService } from '../../../infrastructure/services/tenant-crypto.service';

export interface CreateTenantInput {
  platformUserId: string;
  name: string;
  webhookUrl?: string;
  allowedOrigins?: string[];
  redirectUris?: string[];
  retentionDays?: number;
}

export type CreateTenantOutcome =
  | {
      status: 'created';
      tenant: {
        clientId: string;
        name: string;
        webhookUrl: string | null;
        allowedOrigins: string[] | null;
        redirectUris: string[] | null;
        retentionDays: number;
        createdAt: Date;
      };
      clientSecret: string;
    }
  | { status: 'email_not_verified' }
  | { status: 'user_not_found' }
  | { status: 'name_taken' };

/**
 * Creates a tenant owned by the calling platform user.
 *
 * Invariants (SOA-002) :
 * - The owner must have emailVerified=true — enforced here before any DB write.
 * - The tenant row and the tenant_admins(owner) row are inserted atomically in
 *   a single transaction. owner_platform_user_id is denormalized on tenants
 *   for fast owner lookups.
 *
 * Returns the client_secret in plain text ONCE at creation — never stored.
 * The caller must surface it to the user and prevent any further access.
 */
export class CreateTenantUseCase {
  constructor(
    private readonly userRepository: IPlatformUserRepository,
    private readonly cryptoService: TenantCryptoService
  ) {}

  async execute(input: CreateTenantInput): Promise<CreateTenantOutcome> {
    const user = await this.userRepository.findById(input.platformUserId);
    if (!user) return { status: 'user_not_found' };
    if (!user.emailVerified) return { status: 'email_not_verified' };

    const dataSource = DatabaseConnection.getInstance();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const existing = await queryRunner.manager.findOne(TenantEntity, {
        where: { name: input.name },
      });
      if (existing) {
        await queryRunner.release();
        return { status: 'name_taken' };
      }

      await queryRunner.startTransaction();

      const clientId = crypto.randomUUID();
      const clientSecretPlain = crypto.randomBytes(32).toString('hex');
      const salt = this.cryptoService.generateSalt();
      const hash = this.cryptoService.hashClientSecret(clientSecretPlain, salt);
      const jwtSecretPlain = crypto.randomBytes(32).toString('hex');
      const { encrypted: jwtSecretEncrypted, iv: jwtSecretIv } =
        this.cryptoService.encryptValue(jwtSecretPlain);

      const tenant = queryRunner.manager.create(TenantEntity, {
        clientId,
        name: input.name,
        clientSecretHash: hash,
        clientSecretSalt: salt,
        jwtSecretEncrypted,
        jwtSecretIv,
        webhookUrl: input.webhookUrl ?? null,
        allowedOrigins: input.allowedOrigins ?? null,
        redirectUris: input.redirectUris ?? null,
        retentionDays: input.retentionDays ?? 90,
        isActive: true,
        ownerPlatformUserId: user.id,
      });
      await queryRunner.manager.save(TenantEntity, tenant);

      const admin = queryRunner.manager.create(TenantAdminEntity, {
        platformUserId: user.id,
        tenantId: clientId,
        role: 'owner',
        invitedBy: null,
      });
      await queryRunner.manager.save(TenantAdminEntity, admin);

      await queryRunner.commitTransaction();

      return {
        status: 'created',
        tenant: {
          clientId: tenant.clientId,
          name: tenant.name,
          webhookUrl: tenant.webhookUrl ?? null,
          allowedOrigins: tenant.allowedOrigins ?? null,
          redirectUris: tenant.redirectUris ?? null,
          retentionDays: tenant.retentionDays,
          createdAt: tenant.createdAt,
        },
        clientSecret: clientSecretPlain,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }
}
