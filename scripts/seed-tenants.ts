/**
 * Seed default tenants — run once after Tier 3 migration.
 *
 * Creates the 'origins' tenant (and optionally others) in the tenants table
 * with proper encrypted JWT secrets and hashed client secrets.
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
    name: 'origins',
    allowedOrigins: ['https://origins.tetardtek.com'],
    redirectUris: ['https://origins.tetardtek.com/callback'],
  },
  {
    name: 'tetardpg',
    allowedOrigins: ['https://tetardpg.tetardtek.com', 'http://localhost:5173'],
    redirectUris: ['https://tetardpg.tetardtek.com/auth/callback', 'http://localhost:5173/auth/callback'],
  },
  {
    name: 'clickerz',
    allowedOrigins: ['https://clickerz.tetardtek.com', 'http://localhost:3000'],
    redirectUris: ['https://clickerz.tetardtek.com/callback', 'http://localhost:3000/callback'],
  },
];

async function main() {
  console.log('🌱 Seeding tenants...\n');

  await DatabaseConnection.initialize();

  const crypto = new TenantCryptoService();
  const tenantRepo = new TenantRepository(crypto);

  for (const tenant of TENANTS_TO_SEED) {
    // Check if tenant already exists by querying with the name as clientId
    const existing = await tenantRepo.findByClientId(tenant.name);

    if (existing) {
      console.log(`  ✓ ${tenant.name} — already exists (client_id: ${existing.clientId})`);
      continue;
    }

    // TenantRepository.create() generates a random UUID as clientId.
    // But our system uses tenant NAME as the tenantId everywhere (e.g. 'origins').
    // We need to insert directly with clientId = tenant.name.
    const { default: nodeCrypto } = await import('crypto');
    const clientSecretPlain = nodeCrypto.randomBytes(32).toString('hex');
    const salt = crypto.generateSalt();
    const hash = crypto.hashClientSecret(clientSecretPlain, salt);

    // For the first tenant ('origins'), use the existing global JWT secret
    // to avoid invalidating all existing tokens signed with the fallback.
    // New tenants get a fresh random secret.
    const jwtSecretPlain = tenant.name === 'origins' && process.env.JWT_ACCESS_SECRET
      ? process.env.JWT_ACCESS_SECRET
      : nodeCrypto.randomBytes(32).toString('hex');
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
