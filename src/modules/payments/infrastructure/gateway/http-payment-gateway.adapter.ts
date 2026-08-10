import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/configuration';
import {
  CreateChargeParams,
  CreateChargeResult,
  PaymentGatewayPort,
} from '../../domain/payment-gateway.port';
import { PaymentGatewayError } from '../../domain/errors/payment-errors';

/**
 * Generic webhook-style adapter, same shape as the notification channels: POSTs the charge
 * request as JSON with a bearer token to a configurable URL. Without
 * `PAYMENT_GATEWAY_API_URL` configured (no real Pix/Cartão provider yet), falls back to
 * "sandbox" mode — creates a fake externalReference and returns `pending`; confirmation in
 * that mode happens through the same manual `PATCH payments/:id/mark-paid` staff endpoint
 * used for in-store payments, not through this adapter.
 */
@Injectable()
export class HttpPaymentGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(HttpPaymentGatewayAdapter.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async createCharge(params: CreateChargeParams): Promise<CreateChargeResult> {
    const { apiUrl, apiToken } = this.configService.get('paymentGateway', { infer: true });

    if (!apiUrl) {
      const externalReference = `sandbox_${randomUUID()}`;
      this.logger.log(
        `[PaymentGateway:sandbox-mode] method=${params.method} amountCents=${params.amountCents} reference=${params.reference} -> ${externalReference}`,
      );
      return { externalReference, status: 'pending' };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new PaymentGatewayError(`gateway respondeu ${response.status}`);
    }

    const body = (await response.json()) as CreateChargeResult;
    return body;
  }
}
