import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../../shared/utils/logger.util';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private transporter: Transporter;
  private readonly from: string;

  constructor() {
    this.from = process.env.SMTP_FROM || 'noreply@tetardtek.com';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // false = use STARTTLS upgrade
      requireTLS: true, // Force STARTTLS — Stalwart exposes PLAIN/LOGIN only after TLS
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          }
        : undefined,
      tls: {
        rejectUnauthorized: false, // Local Stalwart — self-signed OK
      },
    });
  }

  async sendVerificationEmail(to: string, token: string, tenantId: string): Promise<void> {
    const baseUrl = process.env.SUPEROAUTH_PUBLIC_URL || 'https://superoauth.tetardtek.com';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}&tenant=${tenantId}`;

    await this.send({
      to,
      subject: 'Vérifie ton adresse email — SuperOAuth',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #c8a44e;">SuperOAuth</h2>
          <p>Clique sur le lien ci-dessous pour vérifier ton adresse email :</p>
          <a href="${verifyUrl}"
             style="display: inline-block; padding: 12px 24px; background: #c8a44e; color: #0a0a0a;
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            Vérifier mon email
          </a>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Ce lien expire dans 24 heures.<br>
            Si tu n'as pas créé de compte, ignore cet email.
          </p>
        </div>
      `,
    });

    logger.info('Verification email sent', { to, tenantId });
  }

  async sendMergeEmail(to: string, token: string, provider: string, tenantId: string): Promise<void> {
    const baseUrl = process.env.SUPEROAUTH_PUBLIC_URL || 'https://superoauth.tetardtek.com';
    const mergeUrl = `${baseUrl}/confirm-merge?token=${token}&tenant=${tenantId}`;

    await this.send({
      to,
      subject: `Demande de fusion de compte — ${provider}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #c8a44e;">SuperOAuth</h2>
          <p>Quelqu'un tente d'ajouter <strong>${provider}</strong> à ton compte.</p>
          <p>Si c'est bien toi, clique ci-dessous pour confirmer la fusion :</p>
          <a href="${mergeUrl}"
             style="display: inline-block; padding: 12px 24px; background: #c8a44e; color: #0a0a0a;
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            Confirmer la fusion
          </a>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Ce lien expire dans 15 minutes.<br>
            Si ce n'est pas toi, ignore cet email — ton compte reste inchangé.
          </p>
        </div>
      `,
    });

    logger.info('Merge email sent', { to, provider, tenantId });
  }

  private async send(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      logger.error('Failed to send email', error instanceof Error ? error : undefined, { to: options.to });
      throw new Error('EMAIL_SEND_FAILED');
    }
  }
}
