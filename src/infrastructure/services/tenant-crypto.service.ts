import crypto from 'crypto';

/**
 * TenantCryptoService — Tier 3
 *
 * Centralise toute la cryptographie liée aux tenants :
 *   - HMAC-SHA256 pour client_secret (vérification rapide, pas bcrypt)
 *   - AES-256-GCM pour les valeurs à déchiffrer (provider secrets, JWT secrets)
 *
 * Clé master : TENANT_ENCRYPTION_KEY (.env) — obligatoire, throw au démarrage si absente.
 * Format colonnes séparées : { encrypted: string (hex), iv: string (hex) }
 */
export class TenantCryptoService {
  private readonly masterKey: Buffer;

  constructor() {
    const keyHex = process.env.TENANT_ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error(
        'TENANT_ENCRYPTION_KEY is required. Generate with: openssl rand -hex 32'
      );
    }
    if (keyHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error(
        'TENANT_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)'
      );
    }
    this.masterKey = Buffer.from(keyHex, 'hex');
  }

  /**
   * HMAC-SHA256 du client_secret avec un sel par tenant.
   * Pas bcrypt — trop lent pour middleware.
   */
  hashClientSecret(secret: string, salt: string): string {
    return crypto
      .createHmac('sha256', salt)
      .update(secret)
      .digest('hex');
  }

  /**
   * Vérifie un client_secret de manière timing-safe.
   */
  verifyClientSecret(secret: string, salt: string, hash: string): boolean {
    const expected = this.hashClientSecret(secret, salt);
    if (expected.length !== hash.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(hash, 'hex')
    );
  }

  /**
   * Chiffre une valeur avec AES-256-GCM.
   * Retourne deux colonnes séparées pour le stockage.
   */
  encryptValue(plain: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let ciphertext = cipher.update(plain, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // stocke authTag:ciphertext dans la colonne "encrypted"
    return {
      encrypted: `${authTag.toString('hex')}:${ciphertext}`,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Déchiffre une valeur stockée en colonnes séparées (encrypted, iv).
   */
  decryptValue(encrypted: string, iv: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format: expected authTag:ciphertext');
    }
    const [authTagHex, ciphertext] = parts;
    const ivBuf = Buffer.from(iv, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, ivBuf);
    decipher.setAuthTag(authTag);

    let plain = decipher.update(ciphertext, 'hex', 'utf8');
    plain += decipher.final('utf8');
    return plain;
  }

  /**
   * Génère un sel cryptographique pour un tenant (client_secret_salt).
   */
  generateSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

