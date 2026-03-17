import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { createAuthenticateTenant } from '../middleware/authenticate-tenant.middleware';
import { TenantCryptoService } from '../../infrastructure/services/tenant-crypto.service';
import { TenantRepository } from '../../infrastructure/services/tenant.repository';
import { TenantProviderRepository } from '../../infrastructure/services/tenant-provider.repository';
import { AuditLogService } from '../../infrastructure/services/audit-log.service';

const router = Router();

// Lazy-init services (DB may not be ready at import time)
let tenantCrypto: TenantCryptoService;
let tenantRepository: TenantRepository;
let tenantProviderRepository: TenantProviderRepository;
let auditLogService: AuditLogService;

function getServices() {
  if (!tenantCrypto) tenantCrypto = new TenantCryptoService();
  if (!tenantRepository) tenantRepository = new TenantRepository(tenantCrypto);
  if (!tenantProviderRepository) tenantProviderRepository = new TenantProviderRepository(tenantCrypto);
  if (!auditLogService) auditLogService = new AuditLogService();
  return { tenantRepository, tenantProviderRepository, auditLogService };
}

// ── POST /api/v1/admin/tenants — Create a tenant ───────────────────────────

router.post(
  '/tenants',
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantRepository } = getServices();
    const { name, webhookUrl, allowedOrigins, retentionDays } = req.body as {
      name?: string;
      webhookUrl?: string;
      allowedOrigins?: string[];
      retentionDays?: number;
    };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }

    const opts: { webhookUrl?: string; allowedOrigins?: string[]; retentionDays?: number } = {};
    if (webhookUrl !== undefined) opts.webhookUrl = webhookUrl;
    if (allowedOrigins !== undefined) opts.allowedOrigins = allowedOrigins;
    if (retentionDays !== undefined) opts.retentionDays = retentionDays;

    const { tenant, clientSecret } = await tenantRepository.create(name.trim(), opts);

    res.status(201).json({
      success: true,
      data: {
        ...tenant,
        clientSecret, // Shown once — store securely
      },
    });
  })
);

// ── POST /api/v1/admin/tenants/:id/providers — Upsert provider config ──────
// Protected by authenticateTenant

router.post(
  '/tenants/:id/providers',
  (req, res, next) => {
    const { tenantRepository } = getServices();
    return createAuthenticateTenant(tenantRepository)(req, res, next);
  },
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantProviderRepository } = getServices();
    const tenantId = req.tenantId!;
    const paramId = req.params.id;

    // Authenticated tenantId must match URL param
    if (tenantId !== paramId) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { provider, clientId: providerClientId, clientSecret } = req.body as {
      provider?: string;
      clientId?: string;
      clientSecret?: string;
    };

    if (!provider || !providerClientId || !clientSecret) {
      res.status(400).json({
        success: false,
        error: 'provider, clientId and clientSecret are required',
      });
      return;
    }

    const VALID_PROVIDERS = ['discord', 'google', 'github', 'twitch'];
    if (!VALID_PROVIDERS.includes(provider)) {
      res.status(400).json({
        success: false,
        error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}`,
      });
      return;
    }

    await tenantProviderRepository.upsert({
      tenantId,
      provider,
      clientId: providerClientId,
      clientSecretPlain: clientSecret,
    });

    res.status(200).json({ success: true, data: { tenantId, provider, clientId: providerClientId } });
  })
);

// ── GET /api/v1/admin/tenants/:id/providers — List providers (no secrets) ──

router.get(
  '/tenants/:id/providers',
  (req, res, next) => {
    const { tenantRepository } = getServices();
    return createAuthenticateTenant(tenantRepository)(req, res, next);
  },
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantProviderRepository } = getServices();
    const tenantId = req.tenantId!;

    if (tenantId !== req.params.id) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const providers = await tenantProviderRepository.listByTenant(tenantId);
    res.json({ success: true, data: providers });
  })
);

// ── DELETE /api/v1/admin/tenants/:id/providers/:provider ───────────────────

router.delete(
  '/tenants/:id/providers/:provider',
  (req, res, next) => {
    const { tenantRepository } = getServices();
    return createAuthenticateTenant(tenantRepository)(req, res, next);
  },
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantProviderRepository } = getServices();
    const tenantId = req.tenantId!;

    if (tenantId !== req.params.id) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    await tenantProviderRepository.deleteByTenantAndProvider(tenantId, req.params.provider);
    res.json({ success: true });
  })
);

// ── GET /api/v1/admin/tenants/:id/audit — Paginé, filtrable ────────────────

router.get(
  '/tenants/:id/audit',
  (req, res, next) => {
    const { tenantRepository } = getServices();
    return createAuthenticateTenant(tenantRepository)(req, res, next);
  },
  asyncHandler(async (req: Request, res: Response) => {
    const { auditLogService } = getServices();
    const tenantId = req.tenantId!;

    if (tenantId !== req.params.id) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const query = req.query as Record<string, string | undefined>;
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);

    const auditOpts: import('../../infrastructure/services/audit-log.service').AuditQueryOptions = { page, limit };
    if (query.event) auditOpts.event = query.event as import('../../infrastructure/database/entities/audit-log.entity').AuditEvent;
    if (query.userId) auditOpts.userId = query.userId;
    if (query.fromDate) auditOpts.fromDate = new Date(query.fromDate);
    if (query.toDate) auditOpts.toDate = new Date(query.toDate);

    const result = await auditLogService.query(tenantId, auditOpts);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  })
);

export { router as adminRoutes };
