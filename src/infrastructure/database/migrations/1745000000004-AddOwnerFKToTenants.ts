import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add owner_platform_user_id FK to tenants (SOA-002 P1 — M4)
 *
 * Denormalized owner reference on `tenants` table for fast billing queries.
 * Invariant : `tenants.owner_platform_user_id` must match the single
 * `tenant_admins` row where role='owner' for this tenant (enforced at app layer).
 *
 * 3-step migration for zero-downtime :
 *   1. ADD COLUMN nullable
 *   2. POPULATE from tenant_admins (role='owner')
 *   3. ALTER COLUMN to NOT NULL + add FK constraint
 *
 * Depends on : M3 (CreateTenantAdmins) must have seeded owner rows.
 */
export class AddOwnerFKToTenants1745000000004 implements MigrationInterface {
  name = 'AddOwnerFKToTenants1745000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add column nullable
    await queryRunner.query(`
      ALTER TABLE \`tenants\`
      ADD COLUMN \`owner_platform_user_id\` VARCHAR(36) DEFAULT NULL
      COMMENT 'Denormalized owner — must match tenant_admins row with role=owner'
    `);

    // 2. Populate from tenant_admins (role='owner')
    await queryRunner.query(`
      UPDATE \`tenants\` t
      INNER JOIN \`tenant_admins\` ta
        ON ta.tenant_id = t.client_id AND ta.role = 'owner'
      SET t.owner_platform_user_id = ta.platform_user_id
    `);

    // 3. Verify : no tenant should be left without an owner
    const [check] = (await queryRunner.query(`
      SELECT COUNT(*) AS orphans FROM \`tenants\`
      WHERE owner_platform_user_id IS NULL AND is_active = 1
    `)) as Array<{ orphans: number }>;

    if (check && Number(check.orphans) > 0) {
      throw new Error(
        `AddOwnerFKToTenants1745000000004: ${check.orphans} active tenants have no owner in tenant_admins. ` +
          `Verify M3 seeding before retrying.`,
      );
    }

    // 4. Alter to NOT NULL
    await queryRunner.query(`
      ALTER TABLE \`tenants\`
      MODIFY COLUMN \`owner_platform_user_id\` VARCHAR(36) NOT NULL
    `);

    // 5. Add FK constraint
    await queryRunner.query(`
      ALTER TABLE \`tenants\`
      ADD CONSTRAINT \`fk_tenants_owner\`
        FOREIGN KEY (\`owner_platform_user_id\`) REFERENCES \`platform_users\` (\`id\`)
        ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // 6. Index for billing queries
    await queryRunner.query(`
      CREATE INDEX \`idx_tenants_owner\` ON \`tenants\` (\`owner_platform_user_id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_tenants_owner\` ON \`tenants\``).catch(() => {});
    await queryRunner.query(
      `ALTER TABLE \`tenants\` DROP FOREIGN KEY \`fk_tenants_owner\``,
    ).catch(() => {});
    await queryRunner.query(
      `ALTER TABLE \`tenants\` DROP COLUMN \`owner_platform_user_id\``,
    ).catch(() => {});
  }
}
