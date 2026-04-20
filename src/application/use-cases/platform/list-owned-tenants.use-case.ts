import { DataSource } from 'typeorm';
import { DatabaseConnection } from '../../../infrastructure/database/config/database.config';

export interface OwnedTenantRecord {
  clientId: string;
  name: string;
  role: 'owner' | 'admin';
  isActive: boolean;
  retentionDays: number;
  createdAt: Date;
  webhookUrl: string | null;
  allowedOrigins: string[] | null;
  redirectUris: string[] | null;
}

/**
 * Lists every tenant the platform user has access to — as owner OR admin
 * (SOA-002 P5 UX fix : the dashboard is the entry point for any member
 * of the tenant, not only the owner). The role is carried on each row so
 * the client can render role-based UI without a second round-trip.
 *
 * Kept under the 'ListOwnedTenantsUseCase' name for DI backward compat —
 * 'owned' is a slight misnomer now. Consider renaming to
 * 'ListAccessibleTenantsUseCase' in a follow-up commit.
 */
export class ListOwnedTenantsUseCase {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = DatabaseConnection.getInstance();
  }

  async execute(platformUserId: string): Promise<OwnedTenantRecord[]> {
    const rows = (await this.dataSource.query(
      `SELECT
         t.client_id AS clientId,
         t.name AS name,
         ta.role AS role,
         t.is_active AS isActive,
         t.retention_days AS retentionDays,
         t.created_at AS createdAt,
         t.webhook_url AS webhookUrl,
         t.allowed_origins AS allowedOrigins,
         t.redirect_uris AS redirectUris
       FROM tenant_admins ta
       INNER JOIN tenants t ON t.client_id = ta.tenant_id
       WHERE ta.platform_user_id = ?
       ORDER BY t.created_at DESC`,
      [platformUserId],
    )) as Array<{
      clientId: string;
      name: string;
      role: 'owner' | 'admin';
      isActive: number | boolean;
      retentionDays: number;
      createdAt: Date;
      webhookUrl: string | null;
      allowedOrigins: string | null;
      redirectUris: string | null;
    }>;

    return rows.map((r) => ({
      clientId: r.clientId,
      name: r.name,
      role: r.role,
      isActive: Boolean(r.isActive),
      retentionDays: r.retentionDays,
      createdAt: r.createdAt,
      webhookUrl: r.webhookUrl ?? null,
      allowedOrigins: this.parseJsonArray(r.allowedOrigins),
      redirectUris: this.parseJsonArray(r.redirectUris),
    }));
  }

  private parseJsonArray(raw: string | null): string[] | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
