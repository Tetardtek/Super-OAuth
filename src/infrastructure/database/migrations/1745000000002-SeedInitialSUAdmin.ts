import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

/**
 * Migration: Seed initial SUAdmin (SOA-002 P1 — M2)
 *
 * Inserts the founder (Tetardtek) as the sole platform_users row with role='suadmin'.
 * Aligns with SOA-002 flow B (Q2 validated 2026-04-20) :
 *   - `password_hash` = NULL (no initial password stored anywhere)
 *   - First login triggers password reset flow via email
 *   - `email_verified` = true (self-seeded, no external verification needed)
 *
 * This migration is idempotent — skips insertion if a SUAdmin already exists.
 * Down migration removes only the seeded SUAdmin (not all suadmins, in case more
 * were added manually later).
 */
export class SeedInitialSUAdmin1745000000002 implements MigrationInterface {
  name = 'SeedInitialSUAdmin1745000000002';

  private readonly SUADMIN_EMAIL = 'kvnn64@gmail.com';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = (await queryRunner.query(
      `SELECT id FROM \`platform_users\` WHERE email = ? LIMIT 1`,
      [this.SUADMIN_EMAIL],
    )) as Array<{ id: string }>;

    if (existing.length > 0) {
      return;
    }

    const id = randomUUID();

    await queryRunner.query(
      `
      INSERT INTO \`platform_users\` (
        \`id\`, \`email\`, \`password_hash\`, \`role\`, \`email_verified\`, \`created_at\`, \`updated_at\`
      ) VALUES (?, ?, NULL, 'suadmin', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      `,
      [id, this.SUADMIN_EMAIL],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`platform_users\` WHERE email = ? AND role = 'suadmin'`,
      [this.SUADMIN_EMAIL],
    );
  }
}
