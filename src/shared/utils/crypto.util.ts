import crypto from 'crypto';

/**
 * CryptoUtil - Utilitaires cryptographiques sécurisés
 *
 * Utilise les méthodes modernes de Node.js crypto :
 * - AES-256-GCM pour authenticated encryption
 * - createCipheriv/createDecipheriv (non déprécié)
 * - Proper IV handling et auth tags
 */
export class CryptoUtil {
  /**
   * Génère une chaîne aléatoire sécurisée
   */
  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Génère un UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash one-way (SHA-256 par défaut)
   */
  static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Génère une clé de chiffrement sécurisée (32 bytes = 256 bits)
   * Retourne 64 caractères hex
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Assure que la clé fait 32 bytes pour AES-256
   * Accepte :
   * - String hex de 64 caractères (32 bytes)
   * - String quelconque (dérivée avec scrypt)
   */
  private static ensureKeyLength(keyString: string): Buffer {
    // Si clé hex de 64 chars (32 bytes), la convertir directement
    if (keyString.length === 64 && /^[0-9a-fA-F]{64}$/.test(keyString)) {
      return Buffer.from(keyString, 'hex');
    }

    // Sinon, dériver une clé de 32 bytes depuis la string
    // Note: scryptSync est utilisé ici. En production, considérer
    // un salt persisté et stocké séparément
    const salt = crypto.createHash('sha256').update('superoauth-salt').digest();
    return crypto.scryptSync(keyString, salt, 32);
  }

  /**
   * Chiffre du texte avec AES-256-GCM (authenticated encryption)
   *
   * Format de sortie : iv:authTag:encrypted (hex)
   *
   * @param text Texte en clair
   * @param keyString Clé de chiffrement (32 bytes hex ou string à dériver)
   * @returns String chiffrée format "iv:authTag:encrypted"
   */
  static encrypt(text: string, keyString: string): string {
    const key = this.ensureKeyLength(keyString);
    const iv = crypto.randomBytes(16); // IV de 16 bytes pour AES

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted (tous en hex)
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted
    ].join(':');
  }

  /**
   * Déchiffre du texte chiffré avec AES-256-GCM
   *
   * @param encryptedText String format "iv:authTag:encrypted"
   * @param keyString Clé de chiffrement (même que pour encrypt)
   * @returns Texte en clair
   * @throws Error si format invalide ou tampering détecté
   */
  static decrypt(encryptedText: string, keyString: string): string {
    const key = this.ensureKeyLength(keyString);
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format. Expected format: iv:authTag:encrypted');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Génère un salt cryptographique
   */
  static generateSalt(rounds: number = 12): string {
    return crypto.randomBytes(rounds).toString('hex');
  }

  /**
   * Crée un HMAC pour signature
   */
  static createHmac(data: string, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  /**
   * Vérifie un HMAC de manière timing-safe
   */
  static verifyHmac(
    data: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): boolean {
    const expectedSignature = this.createHmac(data, secret, algorithm);

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
