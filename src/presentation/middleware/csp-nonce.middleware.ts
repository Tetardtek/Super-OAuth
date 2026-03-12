import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSP Nonce Middleware
 *
 * Génère un nonce cryptographiquement sécurisé pour chaque requête
 * afin de remplacer 'unsafe-inline' dans la Content Security Policy.
 *
 * Le nonce permet d'autoriser uniquement les scripts/styles inline
 * qui incluent l'attribut nonce="<valeur>" correspondant.
 *
 * Usage dans les templates HTML :
 * <script nonce="<%= nonce %>">...</script>
 * <style nonce="<%= nonce %>">...</style>
 */

declare module 'express-serve-static-core' {
  interface Locals {
    nonce?: string;
  }
}

/**
 * Middleware qui génère un nonce unique par requête
 * et l'injecte dans res.locals pour les templates
 */
export const generateNonce = (_req: Request, res: Response, next: NextFunction): void => {
  // Générer un nonce cryptographiquement sécurisé (128 bits = 16 bytes)
  const nonce = crypto.randomBytes(16).toString('base64');

  // Stocker dans res.locals pour accès dans les templates
  res.locals.nonce = nonce;

  next();
};
