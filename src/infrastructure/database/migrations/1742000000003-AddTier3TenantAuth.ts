import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Tier 3 — Client auth, per-tenant providers, audit logs (ADR-008)
 *
 * Changes:
 *   tenants (new table):
 *     client_id UUID PK, client_secret_hash, client_secret_salt,
 *     jwt_secret_encrypted, jwt_secret_iv,
 *     webhook_url, allowed_origins (JSON), retention_days
 *
 *   tenant_providers (new table):
 *     id UUID PK, tenant_id FK, provider, client_id,
 *     client_secret_encrypted, client_secret_iv
 *     UNIQUE(tenant_id, provider)
 *
 *   audit_logs (new table):
 *     id UUID PK, tenant_id, user_id, event, ip, user_agent,
 *     metadata (JSON), created_at
 *     INDEX(tenant_id, created_at DESC), INDEX(tenant_id, user_id)
 *
 * Crypto model:
 *   client_secret → HMAC-SHA256 + salt (not bcrypt, too slow for middleware)
 *   provider/JWT secrets → AES-256-GCM at-rest (two cols: encrypted + iv)
 */
export class AddTier3TenantAuth1742000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── tenants ──────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenants\` (
        \`client_id\`               VARCHAR(36)   NOT NULL,
        \`name\`                    VARCHAR(100)  NOT NULL,
        \`client_secret_hash\`      VARCHAR(64)   NOT NULL COMMENT 'HMAC-SHA256 hex',
        \`client_secret_salt\`      VARCHAR(64)   NOT NULL,
        \`jwt_secret_encrypted\`    TEXT          NOT NULL COMMENT 'authTag:ciphertext hex',
        \`jwt_secret_iv\`           VARCHAR(32)   NOT NULL COMMENT 'IV hex (16 bytes = 32 chars)',
        \`webhook_url\`             VARCHAR(500)  DEFAULT NULL,
        \`allowed_origins\`         JSON          DEFAULT NULL,
        \`retention_days\`          INT           NOT NULL DEFAULT 90,
        \`is_active\`               TINYINT(1)    NOT NULL DEFAULT 1,
        \`created_at\`              DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\`              DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`client_id\`),
        UNIQUE KEY \`uq_tenants_name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── tenant_providers ─────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_providers\` (
        \`id\`                        VARCHAR(36)   NOT NULL,
        \`tenant_id\`                 VARCHAR(36)   NOT NULL,
        \`provider\`                  VARCHAR(50)   NOT NULL,
        \`client_id\`                 VARCHAR(255)  NOT NULL,
        \`client_secret_encrypted\`   TEXT          NOT NULL COMMENT 'authTag:ciphertext hex',
        \`client_secret_iv\`          VARCHAR(32)   NOT NULL COMMENT 'IV hex',
        \`created_at\`                DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\`                DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_tenant_provider\` (\`tenant_id\`, \`provider\`),
        CONSTRAINT \`fk_tenant_providers_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`client_id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── audit_logs ───────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\`          VARCHAR(36)   NOT NULL,
        \`tenant_id\`   VARCHAR(36)   NOT NULL,
        \`user_id\`     VARCHAR(36)   DEFAULT NULL,
        \`event\`       VARCHAR(50)   NOT NULL COMMENT 'login|register|link|unlink|merge|password_reset|token_refresh',
        \`ip\`          VARCHAR(45)   DEFAULT NULL,
        \`user_agent\`  VARCHAR(500)  DEFAULT NULL,
        \`metadata\`    JSON          DEFAULT NULL,
        \`created_at\`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_audit_tenant_date\` (\`tenant_id\`, \`created_at\` DESC),
        INDEX \`idx_audit_tenant_user\` (\`tenant_id\`, \`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`audit_logs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`tenant_providers\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`tenants\``);
  }
}
