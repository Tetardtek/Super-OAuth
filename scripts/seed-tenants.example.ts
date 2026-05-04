/**
 * Seed default tenants — example template.
 *
 * Copy this file to `seed-tenants.ts` and customize the TENANTS_TO_SEED array
 * with your own tenant names, origins and redirect URIs.
 *
 * `seed-tenants.ts` is gitignored so your local list stays out of version control.
 *
 * Usage:
 *   NODE_ENV=production node --env-file=.env -r ts-node/register scripts/seed-tenants.ts
 *   # or after build:
 *   NODE_ENV=production node --env-file=.env dist/scripts/seed-tenants.js
 *
 * Idempotent: skips tenants that already exist.
 */

import 'reflect-metadata';
import { DatabaseConnection } from '../src/infrastructure/database/config/database.config';
import { TenantCryptoService } from '../src/infrastructure/services/tenant-crypto.service';
import { TenantRepository } from '../src/infrastructure/services/tenant.repository';

const TENANTS_TO_SEED = [
  {
    name: 'demo-app',
    allowedOrigins: ['https://demo-app.example.com'],
    redirectUris: ['https://demo-app.example.com/callback'],
  },
  {
    name: 'local-dev',
    allowedOrigins: ['http://localhost:5173'],
    redirectUris: ['http://localhost:5173/callback'],
  },
];

async function main() {
  console.log('🌱 Seeding tenants...\n');

  await DatabaseConnection.initialize();

  const crypto = new TenantCryptoService();
  const tenantRepo = new TenantRepository(crypto);

  for (const tenant of TENANTS_TO_SEED) {
    const existing = await tenantRepo.findByClientId(tenant.name);

    if (existing) {
      console.log(`  ✓ ${tenant.name} — already exists (client_id: ${existing.clientId})`);
      continue;
    }

    const { default: nodeCrypto } = await import('crypto');
    const clientSecretPlain = nodeCrypto.randomBytes(32).toString('hex');
    const salt = crypto.generateSalt();
    const hash = crypto.hashClientSecret(clientSecretPlain, salt);

    const jwtSecretPlain = nodeCrypto.randomBytes(32).toString('hex');
    const { encrypted: jwtSecretEncrypted, iv: jwtSecretIv } = crypto.encryptValue(jwtSecretPlain);

    const ds = DatabaseConnection.getDataSource();
    await ds.query(
      `INSERT INTO tenants (client_id, name, client_secret_hash, client_secret_salt, jwt_secret_encrypted, jwt_secret_iv, allowed_origins, redirect_uris, is_active, retention_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, 90)`,
      [
        tenant.name,
        tenant.name,
        hash,
        salt,
        jwtSecretEncrypted,
        jwtSecretIv,
        JSON.stringify(tenant.allowedOrigins),
        JSON.stringify(tenant.redirectUris ?? []),
      ]
    );

    console.log(`  ✅ ${tenant.name} — created (client_id: ${tenant.name})`);
    console.log(`     client_secret generated and stored (not displayed).`);
  }

  console.log('\n✅ Seed complete.');
  await DatabaseConnection.getDataSource().destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
