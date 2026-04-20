import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create platform_users table (SOA-002 P1 — M1)
 *
 * Platform-level user table : distinct from tenant-level `users` table.
 * Contains SuperOAuth SaaS customers (client owners) and the sole SUAdmin (Tetardtek).
 *
 * Key design decisions (SOA-002) :
 *   - `password_hash` NULLABLE : allows "no initial password" pattern — seed users
 *     must go through password reset flow to set their password. Aligns with
 *     "force_password_reset via email" onboarding (no secrets in MYSECRETS).
 *   - `role` ENUM('suadmin','client') flat : expansion later via value addition.
 *   - `email` UNIQUE globally : platform-level identity, no tenant scoping.
 *
 * Safe for zero-downtime: additive only, no existing table modified.
 * Down migration drops the table entirely.
 */
export class CreatePlatformUsers1745000000001 implements MigrationInterface {
  name = 'CreatePlatformUsers1745000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`platform_users\` (
        \`id\`              VARCHAR(36)  NOT NULL COMMENT 'UUID v4',
        \`email\`           VARCHAR(255) NOT NULL,
        \`password_hash\`   VARCHAR(60)  DEFAULT NULL COMMENT 'bcrypt hash, NULL = must set via reset flow',
        \`role\`            ENUM('suadmin','client') NOT NULL DEFAULT 'client',
        \`email_verified\`  TINYINT(1)   NOT NULL DEFAULT 0,
        \`last_login_at\`   DATETIME(3)  DEFAULT NULL,
        \`created_at\`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_platform_users_email\` (\`email\`),
        INDEX \`idx_platform_users_role\` (\`role\`),
        INDEX \`idx_platform_users_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Platform-level users (SUAdmin + client owners) — distinct from tenant users'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`platform_users\``);
  }
}
