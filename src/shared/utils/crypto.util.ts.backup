import crypto from 'crypto';

export class CryptoUtil {
  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateUUID(): string {
    return crypto.randomUUID();
  }

  static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  static encrypt(text: string, key: string, algorithm: string = 'aes-256-gcm'): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText: string, key: string, algorithm: string = 'aes-256-gcm'): string {
    const textParts = encryptedText.split(':');
    textParts.shift(); // Remove IV (not used in legacy crypto.createDecipher)
    const encrypted = textParts.join(':');
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static generateSalt(rounds: number = 12): string {
    return crypto.randomBytes(rounds).toString('hex');
  }

  static createHmac(data: string, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  static verifyHmac(
    data: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): boolean {
    const expectedSignature = this.createHmac(data, secret, algorithm);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
