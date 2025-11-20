import crypto from 'crypto';
import { Request } from 'express';

/**
 * Device Fingerprint Utility
 *
 * Génère un fingerprint unique basé sur les caractéristiques du device :
 * - IP address
 * - User-Agent
 *
 * Ce fingerprint est utilisé pour détecter les sessions hijackées
 * en validant que la session est toujours utilisée depuis le même device.
 *
 * Security: CVSS 6.0 - Session Hijacking Prevention
 */
export class DeviceFingerprintUtil {
  /**
   * Génère un fingerprint du device basé sur la requête
   *
   * @param req - Express request object
   * @returns SHA-256 hash du fingerprint (64 caractères hex)
   */
  static generate(req: Request): string {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Combiner les caractéristiques du device
    const fingerprintData = `${ip}|${userAgent}`;

    // Hasher pour obtenir un fingerprint unique et non-réversible
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
  }

  /**
   * Extrait l'IP du client en tenant compte des proxies
   *
   * @param req - Express request object
   * @returns IP address du client
   */
  private static getClientIp(req: Request): string {
    // Vérifier les headers de proxy (X-Forwarded-For, X-Real-IP)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      // X-Forwarded-For peut contenir plusieurs IPs (client, proxy1, proxy2)
      // La première est l'IP originale du client
      const ips = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor.split(',')[0];
      return ips.trim();
    }

    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }

    // Fallback sur req.ip (Express standard)
    return req.ip || 'unknown';
  }

  /**
   * Valide si un fingerprint correspond à la requête courante
   *
   * @param req - Express request object
   * @param storedFingerprint - Fingerprint stocké en DB
   * @returns true si le fingerprint correspond
   */
  static validate(req: Request, storedFingerprint: string): boolean {
    const currentFingerprint = this.generate(req);
    return currentFingerprint === storedFingerprint;
  }

  /**
   * Extrait les informations de session de la requête
   * pour stockage en DB
   *
   * @param req - Express request object
   * @returns Session metadata
   */
  static extractSessionMetadata(req: Request): {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
  } {
    return {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      deviceFingerprint: this.generate(req),
    };
  }
}
