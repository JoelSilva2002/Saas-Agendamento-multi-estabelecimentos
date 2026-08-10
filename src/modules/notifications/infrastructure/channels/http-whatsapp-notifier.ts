import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/configuration';
import { WhatsAppNotifierPort } from '../../domain/whatsapp-notifier.port';

/**
 * Generic webhook-style adapter: POSTs `{ to, message }` as JSON with a bearer token to a
 * configurable URL — the shape most WhatsApp Business API providers (or a thin proxy in
 * front of one) accept. When `NOTIFICATIONS_WHATSAPP_WEBHOOK_URL` isn't set (local/dev/test,
 * or simply "no WhatsApp account yet"), it logs the message instead of sending it — the rest
 * of the system (persistence, idempotency, triggers) behaves identically either way.
 */
@Injectable()
export class HttpWhatsAppNotifier implements WhatsAppNotifierPort {
  private readonly logger = new Logger(HttpWhatsAppNotifier.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async send(to: string, message: string): Promise<void> {
    const { webhookUrl, apiToken } = this.configService.get('notifications', {
      infer: true,
    }).whatsapp;

    if (!webhookUrl) {
      this.logger.log(`[WhatsApp:log-mode] to=${to} message="${message}"`);
      return;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp webhook respondeu ${response.status}`);
    }
  }
}
