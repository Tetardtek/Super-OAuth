/**
 * WebhookService — send tenant webhooks with retry + persist deliveries
 *
 * Tenant webhook URLs are configured via env vars (Tier 2 — Tier 3 moves to DB):
 *   WEBHOOK_URL_<TENANT_ID_UPPERCASE>=https://...
 *
 * Retry policy: 3 attempts, exponential backoff (1s → 2s → 4s)
 */

import crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import {
  WebhookDeliveryEntity,
  WebhookEvent,
  WebhookStatus,
} from '../database/entities/webhook-delivery.entity';
import { logger } from '../../shared/utils/logger.util';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

export interface WebhookPayload {
  event: WebhookEvent;
  tenantId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export class WebhookService {
  private readonly repo: Repository<WebhookDeliveryEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(WebhookDeliveryEntity);
  }

  /**
   * Dispatch a webhook for a tenant event.
   * Fire-and-forget — errors are logged, not thrown.
   */
  dispatch(tenantId: string, event: WebhookEvent, data: Record<string, unknown>): void {
    const url = this.getWebhookUrl(tenantId);
    if (!url) return; // tenant has no webhook configured — silent skip

    const payload: WebhookPayload = {
      event,
      tenantId,
      timestamp: new Date().toISOString(),
      data,
    };

    // Run async without blocking the caller
    void this.sendWithRetry(tenantId, event, url, payload);
  }

  private getWebhookUrl(tenantId: string): string | null {
    const key = `WEBHOOK_URL_${tenantId.toUpperCase()}`;
    return process.env[key] ?? null;
  }

  private async sendWithRetry(
    tenantId: string,
    event: WebhookEvent,
    url: string,
    payload: WebhookPayload
  ): Promise<void> {
    const delivery = this.repo.create({
      id: crypto.randomUUID(),
      tenantId,
      event,
      targetUrl: url,
      payload: payload as unknown as Record<string, unknown>,
      status: 'pending' as WebhookStatus,
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
    });

    await this.repo.save(delivery);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      delivery.attempts = attempt;
      delivery.lastAttemptAt = new Date();

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });

        if (response.ok) {
          delivery.status = 'delivered';
          await this.repo.save(delivery);
          logger.info('✅ Webhook delivered', { tenantId, event, attempt, url });
          return;
        }

        delivery.lastError = `HTTP ${response.status.toString()}`;
        logger.warn('⚠️ Webhook non-2xx', { tenantId, event, attempt, status: response.status, url });
      } catch (err) {
        delivery.lastError = err instanceof Error ? err.message : String(err);
        logger.warn('⚠️ Webhook send error', { tenantId, event, attempt, error: delivery.lastError, url });
      }

      await this.repo.save(delivery);

      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }

    delivery.status = 'failed';
    await this.repo.save(delivery);
    logger.error('❌ Webhook failed after max attempts', undefined, { tenantId, event, url });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Lazy singleton — DataSource must be initialized before first dispatch call
let _instance: WebhookService | null = null;

export function getWebhookService(): WebhookService {
  if (!_instance) {
    const { DatabaseConnection } = require('../database/config/database.config') as {
      DatabaseConnection: { getDataSource: () => import('typeorm').DataSource };
    };
    _instance = new WebhookService(DatabaseConnection.getDataSource());
  }
  return _instance;
}
