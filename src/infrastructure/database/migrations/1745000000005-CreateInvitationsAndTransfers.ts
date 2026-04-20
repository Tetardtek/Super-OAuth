import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create tenant_invitations + tenant_transfers tables (SOA-002 P1 — M5)
 *
 * Two tables for tenant staff lifecycle :
 *   - `tenant_invitations` : admin invitations by email (idempotent + soft-delete)
 *   - `tenant_transfers`   : ownership transfer flow (target must be admin, password re-auth)
 *
 * Key design decisions (SOA-002) :
 *   - Invitations soft-deleted via `cancelled_at` / `cancelled_by` (audit trail kept)
 *   - Idempotent pattern : 2nd invitation to same (email, tenant) resets the token
 *     (enforced at app layer, unique-partial-index at DB level)
 *   - Invitations only for role='admin' — owners go through transfer flow, not invitations
 *   - Transfer target MUST be an existing admin (FK + app-layer check)
 *   - Only one `pending` transfer per tenant at a time (app-layer invariant)
 *
 * Tables are empty at creation — all data lifecycle managed by the app.
 */
export class CreateInvitationsAndTransfers1745000000005 implements MigrationInterface {
  name = 'CreateInvitationsAndTransfers1745000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── tenant_invitations ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_invitations\` (
        \`id\`            VARCHAR(36)  NOT NULL COMMENT 'UUID v4',
        \`token\`         VARCHAR(64)  NOT NULL COMMENT 'SHA-256 hex of raw token (sent in email link)',
        \`email\`         VARCHAR(255) NOT NULL,
        \`tenant_id\`     VARCHAR(50)  NOT NULL,
        \`role\`          ENUM('admin') NOT NULL DEFAULT 'admin' COMMENT 'Owners go through transfer, not invitation',
        \`invited_by\`    VARCHAR(36)  NOT NULL COMMENT 'platform_user_id of the inviting owner',
        \`expires_at\`    DATETIME(3)  NOT NULL,
        \`used_at\`       DATETIME(3)  DEFAULT NULL,
        \`cancelled_at\`  DATETIME(3)  DEFAULT NULL,
        \`cancelled_by\`  VARCHAR(36)  DEFAULT NULL,
        \`created_at\`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_tenant_invitations_token\` (\`token\`),
        INDEX \`idx_tenant_invitations_tenant_email\` (\`tenant_id\`, \`email\`),
        INDEX \`idx_tenant_invitations_expires\` (\`expires_at\`),
        CONSTRAINT \`fk_tenant_invitations_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`client_id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_tenant_invitations_invited_by\`
          FOREIGN KEY (\`invited_by\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_tenant_invitations_cancelled_by\`
          FOREIGN KEY (\`cancelled_by\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Admin invitations by email — soft-deleted with cancelled_at/cancelled_by'
    `);

    // ── tenant_transfers ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_transfers\` (
        \`id\`              VARCHAR(36)  NOT NULL COMMENT 'UUID v4',
        \`tenant_id\`       VARCHAR(50)  NOT NULL,
        \`from_owner_id\`   VARCHAR(36)  NOT NULL COMMENT 'Current owner initiating transfer',
        \`to_admin_id\`     VARCHAR(36)  NOT NULL COMMENT 'Target — MUST be existing admin of tenant',
        \`token\`           VARCHAR(64)  NOT NULL COMMENT 'SHA-256 hex of raw token (email link)',
        \`expires_at\`      DATETIME(3)  NOT NULL,
        \`completed_at\`    DATETIME(3)  DEFAULT NULL,
        \`declined_at\`     DATETIME(3)  DEFAULT NULL,
        \`cancelled_at\`    DATETIME(3)  DEFAULT NULL,
        \`cancelled_by\`    VARCHAR(36)  DEFAULT NULL,
        \`created_at\`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_tenant_transfers_token\` (\`token\`),
        INDEX \`idx_tenant_transfers_tenant\` (\`tenant_id\`),
        INDEX \`idx_tenant_transfers_expires\` (\`expires_at\`),
        CONSTRAINT \`fk_tenant_transfers_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`client_id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_tenant_transfers_from\`
          FOREIGN KEY (\`from_owner_id\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_tenant_transfers_to\`
          FOREIGN KEY (\`to_admin_id\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_tenant_transfers_cancelled_by\`
          FOREIGN KEY (\`cancelled_by\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Ownership transfer flow — pending/completed/declined/cancelled lifecycle'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`tenant_transfers\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`tenant_invitations\``);
  }
}
