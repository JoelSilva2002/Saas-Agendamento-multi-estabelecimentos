import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/configuration';
import { Public } from '../../auth/presentation/decorators/public.decorator';
import { ConfirmPaymentWebhookUseCase } from '../application/use-cases/confirm-payment-webhook.use-case';
import { PaymentWebhookRequestDto } from './dto/payment-webhook.request.dto';
import { InvalidWebhookSecretError } from '../domain/errors/payment-errors';

/**
 * Not nested under /tenants/:tenantId/establishments/:establishmentId — a real gateway
 * calls back a single fixed URL with no knowledge of our tenant routing, and correlates via
 * `externalReference` (set on the Payment row when the charge was created), not a path
 * param. Authenticated by a shared secret header instead of JWT — swap for HMAC signature
 * verification once a specific real gateway is chosen (see PAYMENT_GATEWAY_WEBHOOK_SECRET).
 */
@Controller('payments')
export class PaymentsWebhookController {
  constructor(
    private readonly confirmPaymentWebhook: ConfirmPaymentWebhookUseCase,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers('x-webhook-secret') providedSecret: string | undefined,
    @Body() dto: PaymentWebhookRequestDto,
  ) {
    const expectedSecret = this.configService.get('paymentGateway', { infer: true }).webhookSecret;
    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new InvalidWebhookSecretError();
    }

    const payment = await this.confirmPaymentWebhook.execute({
      externalReference: dto.externalReference,
      status: dto.status,
    });
    return { id: payment.id, status: payment.status };
  }
}
