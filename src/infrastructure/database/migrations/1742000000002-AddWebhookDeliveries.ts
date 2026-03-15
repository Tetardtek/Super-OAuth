import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhookDeliveries1742000000002 implements MigrationInterface {
  name = 'AddWebhookDeliveries1742000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`webhook_deliveries\` (
        \`id\`              VARCHAR(36)   NOT NULL,
        \`tenant_id\`       VARCHAR(50)   NOT NULL,
        \`event\`           VARCHAR(50)   NOT NULL,
        \`target_url\`      VARCHAR(500)  NOT NULL,
        \`payload\`         JSON          NOT NULL,
        \`status\`          VARCHAR(20)   NOT NULL DEFAULT 'pending',
        \`attempts\`        INT           NOT NULL DEFAULT 0,
        \`last_attempt_at\` TIMESTAMP     NULL,
        \`last_error\`      TEXT          NULL,
        \`created_at\`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_webhook_tenant_event\` (\`tenant_id\`, \`event\`),
        INDEX \`idx_webhook_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`webhook_deliveries\``);
  }
}
