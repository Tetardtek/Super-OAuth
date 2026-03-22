import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: PKCE Authorization Server support
 *
 * Changes:
 *   tenants:
 *     + redirect_uris JSON — allowed redirect URIs for this tenant (OAuth 2.0 client)
 *
 *   authorization_codes (new table):
 *     Stores SuperOAuth-issued authorization codes for the PKCE flow.
 *     Short-lived (5 min), use-once, with PKCE verifier for S256 validation.
 */
export class AddPkceAuthorizationServer1742000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── redirect_uris on tenants ─────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE \`tenants\`
        ADD COLUMN \`redirect_uris\` JSON DEFAULT NULL
          COMMENT 'Allowed redirect URIs for OAuth 2.0 authorization flow'
          AFTER \`allowed_origins\`
    `);

    // ── authorization_codes ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`authorization_codes\` (
        \`code\`                  VARCHAR(64)   NOT NULL COMMENT 'SHA-256 hex of raw code',
        \`tenant_id\`             VARCHAR(36)   NOT NULL,
        \`user_id\`               VARCHAR(36)   NOT NULL,
        \`provider\`              VARCHAR(50)   NOT NULL,
        \`redirect_uri\`          VARCHAR(500)  NOT NULL COMMENT 'Must match on token exchange',
        \`code_challenge\`        VARCHAR(128)  NOT NULL COMMENT 'S256 challenge from client',
        \`code_challenge_method\` VARCHAR(10)   NOT NULL DEFAULT 'S256',
        \`scope\`                 VARCHAR(255)  DEFAULT NULL,
        \`expires_at\`            DATETIME(3)   NOT NULL,
        \`used_at\`               DATETIME(3)   DEFAULT NULL COMMENT 'Set on first use — prevents replay',
        \`created_at\`            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`code\`),
        INDEX \`idx_authcode_tenant\` (\`tenant_id\`),
        INDEX \`idx_authcode_expires\` (\`expires_at\`),
        CONSTRAINT \`fk_authcode_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`client_id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`authorization_codes\``);
    await queryRunner.query(`ALTER TABLE \`tenants\` DROP COLUMN \`redirect_uris\``);
  }
}
