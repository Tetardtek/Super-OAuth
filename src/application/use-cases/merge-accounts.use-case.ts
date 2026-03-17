/**
 * MergeAccountsUseCase — merge two user accounts (target absorbed into current)
 *
 * Security gates applied:
 *   [SG7]  TypeORM transaction (queryRunner) — full rollback on any failure
 *   [SG8]  All tokens of the target account are blacklisted BEFORE delete
 *   [SG9]  Self-merge forbidden — currentUserId === targetUserId → 400
 *   [SG10] Indirect: PROVIDER_CONFLICT path handled in link flow, not here
 */

import { DataSource } from 'typeorm';
import {
  IUserRepository,
  ITokenBlacklist,
  ITokenService,
  ITenantTokenService,
  IAuditLogService,
} from '../interfaces/repositories.interface';
import { logger } from '../../shared/utils/logger.util';
import { LinkedAccountEntity } from '../../infrastructure/database/entities/linked-account.entity';
import { SessionEntity } from '../../infrastructure/database/entities/session.entity';
import { UserEntity } from '../../infrastructure/database/entities/user.entity';

export interface MergeAccountsInput {
  /** userId of the authenticated caller (account to keep) */
  currentUserId: string;
  /** valid access token of the account to merge and delete */
  targetToken: string;
  tenantId: string;
}

export interface MergeAccountsOutput {
  merged: true;
  /** list of providers now linked to currentUserId after merge */
  linkedProviders: string[];
}

export class MergeAccountsUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly tokenBlacklist: ITokenBlacklist,
    private readonly dataSource: DataSource,
    private readonly tenantTokenService: ITenantTokenService,
    private readonly auditLog: IAuditLogService
  ) {}

  async execute(input: MergeAccountsInput): Promise<MergeAccountsOutput> {
    const { currentUserId, targetToken, tenantId } = input;

    // 1. Verify targetToken with tenant secret to extract targetUserId [SG7 préambule]
    // tenantId is provided in input — no chicken-and-egg issue here
    const targetPayload = await this.tenantTokenService.verifyAccessToken(targetToken, tenantId);
    if (!targetPayload) {
      throw new Error('INVALID_TARGET_TOKEN');
    }
    const targetUserId = targetPayload.userId;

    // [SG9] Self-merge forbidden
    if (currentUserId === targetUserId) {
      throw new Error('SELF_MERGE_FORBIDDEN');
    }

    // 2. Retrieve both users and validate
    const [currentUser, targetUser] = await Promise.all([
      this.userRepository.findById(currentUserId),
      this.userRepository.findById(targetUserId),
    ]);

    if (!currentUser || !currentUser.isActive) {
      throw new Error('CURRENT_USER_NOT_FOUND');
    }
    if (!targetUser || !targetUser.isActive) {
      throw new Error('TARGET_USER_NOT_FOUND');
    }

    // 3. Cross-tenant merge forbidden
    if (currentUser.tenantId !== tenantId || targetUser.tenantId !== tenantId) {
      throw new Error('CROSS_TENANT_MERGE_FORBIDDEN');
    }

    logger.info('MergeAccountsUseCase: starting merge', {
      currentUserId,
      targetUserId,
      tenantId,
    });

    // 4. Transaction [SG7]
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // a. Transfer linked accounts from target → current (skip providers already present)
      const currentProviders = new Set(currentUser.linkedProviders);

      const targetLinkedAccounts = await queryRunner.manager.find(LinkedAccountEntity, {
        where: { userId: targetUserId },
      });

      for (const account of targetLinkedAccounts) {
        if (!currentProviders.has(account.provider)) {
          // Transfer: update user_id to currentUserId
          await queryRunner.query(
            'UPDATE linked_accounts SET user_id = ? WHERE id = ?',
            [currentUserId, account.id]
          );
          logger.info('MergeAccountsUseCase: transferred linked account', {
            provider: account.provider,
            from: targetUserId,
            to: currentUserId,
          });
        }
        // Providers already linked to current are left in place;
        // the delete cascade below will remove the orphaned target records.
      }

      // b. Copy email from target if current has no email and target has a verified one
      if (!currentUser.email && targetUser.email) {
        await queryRunner.query(
          'UPDATE users SET email = ?, email_verified = ?, email_source = ? WHERE id = ?',
          [
            targetUser.email.toString(),
            targetUser.emailVerified ? 1 : 0,
            targetUser.emailSource,
            currentUserId,
          ]
        );
        logger.info('MergeAccountsUseCase: copied email from target to current', {
          currentUserId,
          email: targetUser.email.toString(),
        });
      }

      // c. Blacklist all active tokens of the target account [SG8]
      const targetSessions = await queryRunner.manager.find(SessionEntity, {
        where: { userId: targetUserId },
      });

      for (const session of targetSessions) {
        const decoded = this.tokenService.decodeAccessToken(session.token);
        if (decoded) {
          const ttlSeconds = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
          await this.tokenBlacklist.revoke(decoded.jti, ttlSeconds);
        }
      }

      // Also blacklist the targetToken itself (may differ from stored sessions if new)
      const decodedTargetToken = this.tokenService.decodeAccessToken(targetToken);
      if (decodedTargetToken) {
        const ttlSeconds = Math.max(
          0,
          decodedTargetToken.exp - Math.floor(Date.now() / 1000)
        );
        await this.tokenBlacklist.revoke(decodedTargetToken.jti, ttlSeconds);
      }

      // d. Delete target user (cascade removes sessions + orphaned linked_accounts)
      await queryRunner.manager.delete(UserEntity, { id: targetUserId });

      await queryRunner.commitTransaction();

      logger.info('MergeAccountsUseCase: merge committed', {
        currentUserId,
        targetUserId,
        transferredProviders: targetLinkedAccounts
          .filter((a) => !currentProviders.has(a.provider))
          .map((a) => a.provider),
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(
        'MergeAccountsUseCase: transaction rolled back',
        error instanceof Error ? error : undefined,
        { currentUserId, targetUserId }
      );
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Return updated provider list (re-fetch current user)
    const updatedUser = await this.userRepository.findById(currentUserId);
    const linkedProviders = updatedUser?.linkedProviders ?? [];

    // Audit log — fire-and-forget
    this.auditLog
      .log({ tenantId, userId: currentUserId, event: 'merge', metadata: { targetUserId } })
      .catch(() => {});

    return { merged: true, linkedProviders };
  }
}
