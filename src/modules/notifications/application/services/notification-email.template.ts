import { EstablishmentAddress } from '../../../establishments/domain/entities/establishment.entity';

export interface NotificationEmailContext {
  establishmentName: string;
  establishmentAddress: EstablishmentAddress;
  serviceName: string | null;
  employeeName: string | null;
  /** The plain-text message already built by NotificationDispatcherService.buildMessage() —
   * reused verbatim as the email's headline so there is exactly one place that decides what
   * each notification type says. */
  message: string;
  /** Absolute URL to the client's own bookings page. */
  manageUrl: string;
}

/** Every value here can contain arbitrary tenant-entered text (establishment/service names) —
 * must be escaped before landing in HTML, or a malicious "service name" becomes a stored XSS
 * payload delivered straight to a client's inbox. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAddressOneLine(address: EstablishmentAddress): string | null {
  const line = [address.street, address.number].filter(Boolean).join(', ');
  const area = [address.neighborhood, address.city, address.state].filter(Boolean).join(' - ');
  const full = [line, area].filter(Boolean).join(' — ');
  return full || null;
}

/**
 * Renders a self-contained (inline-styled — required for email client compatibility) HTML
 * e-mail plus a plain-text fallback. Deliberately not per-type sub-templates: every
 * notification type shares the same shape (headline + appointment details + CTA), and the
 * headline itself already carries the type-specific wording via `message`.
 */
export function buildNotificationEmail(ctx: NotificationEmailContext): { html: string; text: string } {
  const addressLine = formatAddressOneLine(ctx.establishmentAddress);

  const detailRows: Array<[string, string]> = [];
  if (ctx.serviceName) {
    detailRows.push(['Serviço', ctx.serviceName]);
  }
  if (ctx.employeeName) {
    detailRows.push(['Profissional', ctx.employeeName]);
  }
  detailRows.push(['Estabelecimento', ctx.establishmentName]);
  if (addressLine) {
    detailRows.push(['Endereço', addressLine]);
  }

  const detailRowsHtml = detailRows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:4px 0;color:#111827;font-size:14px;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#111827;padding:20px 24px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">${escapeHtml(ctx.establishmentName)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 20px;color:#111827;font-size:16px;line-height:1.5;">${escapeHtml(ctx.message)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  ${detailRowsHtml}
                </table>
                <a href="${ctx.manageUrl}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:10px 20px;border-radius:6px;">Ver meus agendamentos</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #e5e7eb;">
                <p style="margin:0;color:#9ca3af;font-size:12px;">Você recebeu este e-mail porque tem um agendamento em ${escapeHtml(ctx.establishmentName)}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    ctx.message,
    '',
    ...detailRows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Ver meus agendamentos: ${ctx.manageUrl}`,
  ];

  return { html, text: textLines.join('\n') };
}
