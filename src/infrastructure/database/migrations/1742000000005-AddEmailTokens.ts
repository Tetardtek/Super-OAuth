import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailTokens1742000000005 implements MigrationInterface {
  name = 'AddEmailTokens1742000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`email_tokens\` (
        \`token\`                  VARCHAR(64)   NOT NULL COMMENT 'SHA-256 hex of raw token',
        \`user_id\`               VARCHAR(36)   NOT NULL,
        \`tenant_id\`             VARCHAR(36)   NOT NULL,
        \`type\`                  VARCHAR(20)   NOT NULL COMMENT 'verification or merge',
        \`provider\`              VARCHAR(50)   DEFAULT NULL COMMENT 'For merge: provider to link',
        \`provider_id\`           VARCHAR(255)  DEFAULT NULL COMMENT 'For merge: provider user ID',
        \`provider_display_name\` VARCHAR(255)  DEFAULT NULL,
        \`provider_email\`        VARCHAR(255)  DEFAULT NULL,
        \`provider_metadata\`     TEXT          DEFAULT NULL COMMENT 'JSON: OAuth tokens for merge',
        \`expires_at\`            DATETIME(3)   NOT NULL,
        \`used_at\`               DATETIME(3)   DEFAULT NULL,
        \`created_at\`            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`token\`),
        INDEX \`idx_email_tokens_user\` (\`user_id\`),
        INDEX \`idx_email_tokens_expires\` (\`expires_at\`),
        CONSTRAINT \`fk_email_tokens_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Reset all existing users emailVerified to false — clean slate
    await queryRunner.query(`
      UPDATE \`users\` SET \`email_verified\` = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`email_tokens\``);
  }
}
