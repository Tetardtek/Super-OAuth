import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add multi-tenant foundation (Tier 1 — ADR-008)
 *
 * Changes:
 *   users:
 *     - ADD tenant_id VARCHAR(50) NOT NULL DEFAULT 'origins'
 *     - ADD email_source VARCHAR(50) DEFAULT NULL
 *     - DROP UNIQUE(email) → ADD UNIQUE(tenant_id, email)
 *     - DROP UNIQUE(nickname) → ADD UNIQUE(tenant_id, nickname)
 *   linked_accounts:
 *     - ADD tenant_id VARCHAR(50) NOT NULL DEFAULT 'origins'
 *     - DROP UNIQUE(provider, provider_id) → ADD UNIQUE(tenant_id, provider, provider_id)
 *
 * Safe for zero-downtime: DEFAULT 'origins' preserves all existing rows.
 * Down migration restores Tier 0 schema (single-tenant).
 */
export class AddMultiTenantFoundation1742000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── users ──────────────────────────────────────────────────────────────────

    // 1. Add tenant_id column
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN IF NOT EXISTS \`tenant_id\` VARCHAR(50) NOT NULL DEFAULT 'origins'
    `);

    // 2. Add email_source column
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN IF NOT EXISTS \`email_source\` VARCHAR(50) DEFAULT NULL
    `);

    // 3. Drop old unique index on email (name varies by TypeORM version — query info_schema)
    const [emailIdx] = await queryRunner.query(`
      SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'email'
        AND NON_UNIQUE = 0
        AND INDEX_NAME != 'PRIMARY'
        AND INDEX_NAME NOT LIKE 'idx_users_tenant%'
      LIMIT 1
    `) as Array<{ INDEX_NAME: string }>;

    if (emailIdx?.INDEX_NAME) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`${emailIdx.INDEX_NAME}\``);
    }

    // 4. Drop old unique index on nickname
    const [nicknameIdx] = await queryRunner.query(`
      SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'nickname'
        AND NON_UNIQUE = 0
        AND INDEX_NAME != 'PRIMARY'
        AND INDEX_NAME NOT LIKE 'idx_users_tenant%'
      LIMIT 1
    `) as Array<{ INDEX_NAME: string }>;

    if (nicknameIdx?.INDEX_NAME) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`${nicknameIdx.INDEX_NAME}\``);
    }

    // 5. Add new composite unique indexes (idempotent — DROP IF EXISTS first)
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD UNIQUE INDEX IF NOT EXISTS \`idx_users_tenant_email\` (\`tenant_id\`, \`email\`),
      ADD UNIQUE INDEX IF NOT EXISTS \`idx_users_tenant_nickname\` (\`tenant_id\`, \`nickname\`),
      ADD INDEX IF NOT EXISTS \`idx_users_created_at\` (\`created_at\`)
    `).catch(() => {
      // Fallback for MySQL versions that don't support IF NOT EXISTS on ADD INDEX
    });

    // Re-attempt without IF NOT EXISTS guard for older MySQL
    await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'idx_users_tenant_email'
    `).then(async ([row]: Array<{ cnt: string }>) => {
      if (parseInt(row.cnt) === 0) {
        await queryRunner.query(
          `ALTER TABLE \`users\` ADD UNIQUE INDEX \`idx_users_tenant_email\` (\`tenant_id\`, \`email\`)`
        );
      }
    });

    await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'idx_users_tenant_nickname'
    `).then(async ([row]: Array<{ cnt: string }>) => {
      if (parseInt(row.cnt) === 0) {
        await queryRunner.query(
          `ALTER TABLE \`users\` ADD UNIQUE INDEX \`idx_users_tenant_nickname\` (\`tenant_id\`, \`nickname\`)`
        );
      }
    });

    // ── linked_accounts ────────────────────────────────────────────────────────

    // 6. Add tenant_id to linked_accounts
    await queryRunner.query(`
      ALTER TABLE \`linked_accounts\`
      ADD COLUMN IF NOT EXISTS \`tenant_id\` VARCHAR(50) NOT NULL DEFAULT 'origins'
    `);

    // 7. Drop old unique index on (provider, provider_id)
    const [laIdx] = await queryRunner.query(`
      SELECT s.INDEX_NAME FROM information_schema.STATISTICS s
      INNER JOIN (
        SELECT INDEX_NAME, COUNT(*) as col_count
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'linked_accounts'
          AND NON_UNIQUE = 0
          AND INDEX_NAME != 'PRIMARY'
          AND INDEX_NAME NOT LIKE 'idx_linked_accounts_tenant%'
        GROUP BY INDEX_NAME
        HAVING COUNT(*) = 2
      ) multi ON s.INDEX_NAME = multi.INDEX_NAME
      WHERE s.TABLE_SCHEMA = DATABASE()
        AND s.TABLE_NAME = 'linked_accounts'
        AND s.COLUMN_NAME IN ('provider', 'provider_id')
      LIMIT 1
    `) as Array<{ INDEX_NAME: string }>;

    if (laIdx?.INDEX_NAME) {
      await queryRunner.query(`ALTER TABLE \`linked_accounts\` DROP INDEX \`${laIdx.INDEX_NAME}\``);
    }

    // 8. Add new UNIQUE(tenant_id, provider, provider_id)
    await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'linked_accounts'
        AND INDEX_NAME = 'idx_linked_accounts_tenant_provider_id'
    `).then(async ([row]: Array<{ cnt: string }>) => {
      if (parseInt(row.cnt) === 0) {
        await queryRunner.query(`
          ALTER TABLE \`linked_accounts\`
          ADD UNIQUE INDEX \`idx_linked_accounts_tenant_provider_id\`
          (\`tenant_id\`, \`provider\`, \`provider_id\`)
        `);
      }
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Restore Tier 0 schema ──────────────────────────────────────────────────

    // linked_accounts: restore old unique index, drop tenant_id
    await queryRunner.query(`
      ALTER TABLE \`linked_accounts\`
      DROP INDEX IF EXISTS \`idx_linked_accounts_tenant_provider_id\`
    `).catch(() => {});

    await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'linked_accounts'
        AND INDEX_NAME = 'UQ_linked_provider'
    `).then(async ([row]: Array<{ cnt: string }>) => {
      if (parseInt(row.cnt) === 0) {
        await queryRunner.query(`
          ALTER TABLE \`linked_accounts\`
          ADD UNIQUE INDEX \`UQ_linked_provider\` (\`provider\`, \`provider_id\`)
        `);
      }
    });

    await queryRunner.query(`ALTER TABLE \`linked_accounts\` DROP COLUMN IF EXISTS \`tenant_id\``);

    // users: restore old unique indexes, drop tenant_id + email_source
    await queryRunner.query(`DROP INDEX IF EXISTS \`idx_users_tenant_email\` ON \`users\``).catch(() => {});
    await queryRunner.query(`DROP INDEX IF EXISTS \`idx_users_tenant_nickname\` ON \`users\``).catch(() => {});

    await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'UQ_users_email'
    `).then(async ([row]: Array<{ cnt: string }>) => {
      if (parseInt(row.cnt) === 0) {
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`UQ_users_email\` (\`email\`)`);
      }
    });

    await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND INDEX_NAME = 'UQ_users_nickname'
    `).then(async ([row]: Array<{ cnt: string }>) => {
      if (parseInt(row.cnt) === 0) {
        await queryRunner.query(
          `ALTER TABLE \`users\` ADD UNIQUE INDEX \`UQ_users_nickname\` (\`nickname\`)`
        );
      }
    });

    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`email_source\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN IF EXISTS \`tenant_id\``);
  }
}
