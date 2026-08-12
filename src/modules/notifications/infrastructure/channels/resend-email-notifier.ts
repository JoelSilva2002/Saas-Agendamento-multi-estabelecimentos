import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/configuration';
import { EmailContent, EmailNotifierPort } from '../../domain/email-notifier.port';

/**
 * Sends transactional e-mail through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 * No SDK dependency — a single POST, same "raw fetch" style as HttpWhatsAppNotifier.
 *
 * Without RESEND_API_KEY configured (local/dev/test, or simply "no account yet"), logs the
 * e-mail instead of sending it — the rest of the system (persistence, idempotency, retry)
 * behaves identically either way.
 */
@Injectable()
export class ResendEmailNotifier implements EmailNotifierPort {
  private readonly logger = new Logger(ResendEmailNotifier.name);
  private static readonly API_URL = 'https://api.resend.com/emails';

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async send(to: string, subject: string, content: EmailContent): Promise<void> {
    const { apiKey, fromAddress } = this.configService.get('notifications', { infer: true }).email;

    if (!apiKey) {
      this.logger.log(`[Email:log-mode] to=${to} subject="${subject}"\n${content.text}`);
      return;
    }

    const response = await fetch(ResendEmailNotifier.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html: content.html,
        text: content.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Resend respondeu ${response.status}${detail ? `: ${detail}` : ''}`);
    }
  }
}
