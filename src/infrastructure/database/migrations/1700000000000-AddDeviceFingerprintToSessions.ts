import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add device_fingerprint to sessions table
 *
 * Adds device fingerprinting capability for enhanced session security.
 * The fingerprint is a hash of device characteristics (IP + User-Agent + browser features).
 *
 * Security Impact:
 * - Prevents session hijacking by validating device consistency
 * - Detects suspicious session reuse from different devices
 * - CVSS 6.0 - Session Fingerprinting (Issue #6)
 */
export class AddDeviceFingerprintToSessions1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'sessions',
      new TableColumn({
        name: 'device_fingerprint',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Hash of device characteristics for session validation',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('sessions', 'device_fingerprint');
  }
}
