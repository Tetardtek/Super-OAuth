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

  async sendPlatformVerificationEmail(to: string, token: string): Promise<void> {
    const baseUrl = process.env.SUPEROAUTH_PUBLIC_URL || 'https://superoauth.tetardtek.com';
    const verifyUrl = `${baseUrl}/platform/verify-email/${token}`;

    await this.send({
      to,
      subject: 'Vérifie ton adresse email — SuperOAuth',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #c8a44e;">SuperOAuth</h2>
          <p>Bienvenue sur SuperOAuth. Clique sur le lien ci-dessous pour vérifier ton adresse email :</p>
          <a href="${verifyUrl}"
             style="display: inline-block; padding: 12px 24px; background: #c8a44e; color: #0a0a0a;
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            Vérifier mon email
          </a>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Ce lien expire dans 24 heures.<br>
            Si tu n'as pas créé de compte SuperOAuth, ignore cet email.
          </p>
        </div>
      `,
    });

    logger.info('Platform verification email sent', { to });
  }

  async sendPlatformPasswordResetEmail(to: string, token: string): Promise<void> {
    const baseUrl = process.env.SUPEROAUTH_PUBLIC_URL || 'https://superoauth.tetardtek.com';
    const resetUrl = `${baseUrl}/platform/reset-password?token=${token}`;

    await this.send({
      to,
      subject: 'Réinitialisation de ton mot de passe — SuperOAuth',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #c8a44e;">SuperOAuth</h2>
          <p>Une demande de réinitialisation de mot de passe a été reçue pour ton compte.</p>
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background: #c8a44e; color: #0a0a0a;
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Ce lien expire dans 1 heure.<br>
            Si ce n'est pas toi, ignore cet email — ton mot de passe reste inchangé.
          </p>
          <p style="color: #bbb; font-size: 12px; margin-top: 32px; border-top: 1px solid #333; padding-top: 12px;">
            Token brut (usage avancé) : <code style="font-family: monospace; font-size: 11px; word-break: break-all;">${token}</code>
          </p>
        </div>
      `,
    });

    logger.info('Platform password reset email sent', { to });
  }

  async sendOwnershipTransferEmail(
    targetEmail: string,
    token: string,
    tenantName: string,
    ownerEmail: string
  ): Promise<void> {
    const baseUrl = process.env.SUPEROAUTH_PUBLIC_URL || 'https://superoauth.tetardtek.com';
    const acceptUrl = `${baseUrl}/platform/accept-ownership?token=${token}`;

    await this.send({
      to: targetEmail,
      subject: `Transfert de propriété — ${tenantName} sur SuperOAuth`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #c8a44e;">SuperOAuth</h2>
          <p><strong>${ownerEmail}</strong> te propose de devenir le nouveau propriétaire du tenant <strong>${tenantName}</strong>.</p>
          <p>En acceptant, tu récupères le contrôle complet : billing, invitations, suppression. L'ancien propriétaire bascule en rôle administrateur.</p>
          <a href="${acceptUrl}"
             style="display: inline-block; padding: 12px 24px; background: #c8a44e; color: #0a0a0a;
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            Examiner le transfert
          </a>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Ce lien expire dans 7 jours.<br>
            Tu devras confirmer avec ton mot de passe.<br>
            Si tu ne t'attendais pas à ce transfert, ignore cet email ou décline.
          </p>
          <p style="color: #bbb; font-size: 12px; margin-top: 32px; border-top: 1px solid #333; padding-top: 12px;">
            Token brut (usage avancé) : <code style="font-family: monospace; font-size: 11px; word-break: break-all;">${token}</code>
          </p>
        </div>
      `,
    });

    logger.info('Ownership transfer email sent', { targetEmail, tenantName });
  }

  async sendOwnershipTransferNoticeEmail(
    ownerEmail: string,
    targetEmail: string,
    tenantName: string
  ): Promise<void> {
    await this.send({
      to: ownerEmail,
      subject: `Transfert de propriété initié — ${tenantName}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #c8a44e;">SuperOAuth</h2>
          <p>Tu as initié un transfert de propriété du tenant <strong>${tenantName}</strong> vers <strong>${targetEmail}</strong>.</p>
          <p>Le transfert sera effectif dès que ${targetEmail} l'aura accepté avec son mot de passe.</p>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Tu restes propriétaire tant que le transfert n'est pas accepté.<br>
            Le lien expire dans 7 jours. Tu peux annuler via le dashboard à tout moment.<br>
            Si tu n'es pas à l'origine de cette demande, annule immédiatement et change ton mot de passe.
          </p>
        </div>
      `,
    });

    logger.info('Ownership transfer notice sent to owner', { ownerEmail, targetEmail, tenantName });
  }

  async sendAdminInvitationEmail(
    to: string,
    token: string,
    tenantName: string,
    inviterEmail: string
  ): Promise<void> {
    const baseUrl = process.env.SUPEROAUTH_PUBLIC_URL || 'https://superoauth.tetardtek.com';
    const acceptUrl = `${baseUrl}/platform/accept-invitation?token=${token}`;

    await this.send({
      to,
      subject: `Invitation admin — ${tenantName} sur SuperOAuth`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #c8a44e;">SuperOAuth</h2>
          <p><strong>${inviterEmail}</strong> t'invite comme administrateur du tenant <strong>${tenantName}</strong>.</p>
          <p>Clique sur le lien ci-dessous pour accepter l'invitation :</p>
          <a href="${acceptUrl}"
             style="display: inline-block; padding: 12px 24px; background: #c8a44e; color: #0a0a0a;
                    text-decoration: none; border-radius: 6px; font-weight: 600;">
            Accepter l'invitation
          </a>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Ce lien expire dans 7 jours.<br>
            Si tu ne connais pas ${inviterEmail}, ignore cet email.
          </p>
        </div>
      `,
    });

    logger.info('Admin invitation email sent', { to, tenantName });
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
