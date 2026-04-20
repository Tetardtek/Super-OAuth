import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create tenant_admins table (SOA-002 P1 — M3)
 *
 * Many-to-many junction : platform_users ↔ tenants with role ('owner' or 'admin').
 * Invariant (enforced at app layer + tested in invariant test suite) :
 *   EXACTLY 1 role='owner' row per tenant_id.
 *
 * Key design decisions (SOA-002) :
 *   - PK composite (platform_user_id, tenant_id) : a platform_user cannot be listed
 *     twice on the same tenant (either owner XOR admin, not both).
 *   - `invited_by` NULLABLE : NULL for seeded owners (no invitation), FK to the admin
 *     who sent the invitation otherwise.
 *   - FK ON DELETE CASCADE on platform_users : if a platform_user is deleted, their
 *     tenant_admins rows go with them (cascade cleanup).
 *   - FK ON DELETE RESTRICT on tenants : cannot delete a tenant that still has admins
 *     (tenant must be emptied first — part of delete-tenant flow).
 *
 * Data migration : seed one tenant_admins row (role='owner') per existing tenant,
 * pointing to the SUAdmin as owner of each tenant (current de-facto state).
 *
 * Safe for zero-downtime: additive only. Down migration drops the table.
 */
export class CreateTenantAdmins1745000000003 implements MigrationInterface {
  name = 'CreateTenantAdmins1745000000003';

  private readonly SUADMIN_EMAIL = 'kvnn64@gmail.com';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tenant_admins\` (
        \`platform_user_id\`  VARCHAR(36)  NOT NULL,
        \`tenant_id\`         VARCHAR(50)  NOT NULL,
        \`role\`              ENUM('owner','admin') NOT NULL,
        \`invited_by\`        VARCHAR(36)  DEFAULT NULL COMMENT 'platform_user_id of inviter, NULL for seeded owners',
        \`joined_at\`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`platform_user_id\`, \`tenant_id\`),
        INDEX \`idx_tenant_admins_tenant_role\` (\`tenant_id\`, \`role\`),
        INDEX \`idx_tenant_admins_invited_by\` (\`invited_by\`),
        CONSTRAINT \`fk_tenant_admins_user\`
          FOREIGN KEY (\`platform_user_id\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_tenant_admins_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`client_id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`fk_tenant_admins_invited_by\`
          FOREIGN KEY (\`invited_by\`) REFERENCES \`platform_users\` (\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Tenant staff roster (owner/admin) — links platform_users to tenants'
    `);

    // Data migration : seed SUAdmin as owner of each existing tenant (current de-facto state)
    const [suadmin] = (await queryRunner.query(
      `SELECT id FROM \`platform_users\` WHERE email = ? AND role = 'suadmin' LIMIT 1`,
      [this.SUADMIN_EMAIL],
    )) as Array<{ id: string }>;

    if (!suadmin) {
      throw new Error(
        `CreateTenantAdmins1745000000003: SUAdmin (${this.SUADMIN_EMAIL}) not found in platform_users. ` +
          `Run SeedInitialSUAdmin1745000000002 first.`,
      );
    }

    const tenants = (await queryRunner.query(
      `SELECT client_id FROM \`tenants\` WHERE is_active = 1`,
    )) as Array<{ client_id: string }>;

    for (const tenant of tenants) {
      await queryRunner.query(
        `
        INSERT IGNORE INTO \`tenant_admins\`
          (\`platform_user_id\`, \`tenant_id\`, \`role\`, \`invited_by\`, \`joined_at\`)
        VALUES (?, ?, 'owner', NULL, CURRENT_TIMESTAMP(3))
        `,
        [suadmin.id, tenant.client_id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`tenant_admins\``);
  }
}
