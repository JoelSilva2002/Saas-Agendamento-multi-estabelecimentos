import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/configuration';
import { EmailNotifierPort } from '../../domain/email-notifier.port';

/**
 * Same generic-webhook-with-log-fallback pattern as HttpWhatsAppNotifier — POSTs
 * `{ to, subject, body }` to a configurable transactional-email HTTP API (Resend/SendGrid-
 * shaped: bearer token, JSON body), or logs when unconfigured.
 */
@Injectable()
export class HttpEmailNotifier implements EmailNotifierPort {
  private readonly logger = new Logger(HttpEmailNotifier.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    const { webhookUrl, apiToken } = this.configService.get('notifications', { infer: true }).email;

    if (!webhookUrl) {
      this.logger.log(`[Email:log-mode] to=${to} subject="${subject}" body="${body}"`);
      return;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      },
      body: JSON.stringify({ to, subject, body }),
    });

    if (!response.ok) {
      throw new Error(`Email webhook respondeu ${response.status}`);
    }
  }
}
