import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create platform-level auth tables (SOA-002 P1 — M6)
 *
 * Dedicated tables for platform_users authentication lifecycle (distinct from
 * tenant users' auth). Services (password, email verify, session, reset) are
 * extracted as shared layer — these tables are the platform-side persistence.
 *
 * Tables :
 *   - `platform_sessions`      : JWT refresh session tracking (audience='platform')
 *   - `platform_email_tokens`  : email verification + password reset tokens
 *
 * Sessions are distinct from tenant `sessions` table (different JWT audience claim
 * enforces isolation at middleware level — invariant #10 in SOA-002 tests).
 */
export class CreatePlatformAuthTables1745000000006 implements MigrationInterface {
  name = 'CreatePlatformAuthTables1745000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── platform_sessions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`platform_sessions\` (
        \`id\`                VARCHAR(36)  NOT NULL COMMENT 'UUID v4',
        \`platform_user_id\`  VARCHAR(36)  NOT NULL,
        \`refresh_token_hash\` VARCHAR(64) NOT NULL COMMENT 'SHA-256 hex of refresh token',
        \`user_agent\`        VARCHAR(500) DEFAULT NULL,
        \`ip_address\`        VARCHAR(45)  DEFAULT NULL COMMENT 'IPv4 or IPv6',
        \`device_fingerprint\` VARCHAR(64) DEFAULT NULL COMMENT 'SHA-256 hex of device fingerprint',
        \`expires_at\`        DATETIME(3)  NOT NULL,
        \`revoked_at\`        DATETIME(3)  DEFAULT NULL,
        \`last_used_at\`      DATETIME(3)  DEFAULT NULL,
        \`created_at\`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_platform_sessions_token\` (\`refresh_token_hash\`),
        INDEX \`idx_platform_sessions_user\` (\`platform_user_id\`),
        INDEX \`idx_platform_sessions_expires\` (\`expires_at\`),
        CONSTRAINT \`fk_platform_sessions_user\`
          FOREIGN KEY (\`platform_user_id\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Platform-level refresh token sessions (JWT audience=platform)'
    `);

    // ── platform_email_tokens ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`platform_email_tokens\` (
        \`token\`             VARCHAR(64)  NOT NULL COMMENT 'SHA-256 hex of raw token',
        \`platform_user_id\`  VARCHAR(36)  NOT NULL,
        \`type\`              ENUM('verification','password_reset') NOT NULL,
        \`expires_at\`        DATETIME(3)  NOT NULL,
        \`used_at\`           DATETIME(3)  DEFAULT NULL,
        \`created_at\`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`token\`),
        INDEX \`idx_platform_email_tokens_user\` (\`platform_user_id\`),
        INDEX \`idx_platform_email_tokens_expires\` (\`expires_at\`),
        INDEX \`idx_platform_email_tokens_type_user\` (\`type\`, \`platform_user_id\`),
        CONSTRAINT \`fk_platform_email_tokens_user\`
          FOREIGN KEY (\`platform_user_id\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Platform email tokens (verification + password_reset) — single-use via used_at'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`platform_email_tokens\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`platform_sessions\``);
  }
}
