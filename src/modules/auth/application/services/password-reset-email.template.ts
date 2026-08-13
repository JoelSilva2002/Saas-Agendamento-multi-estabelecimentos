export interface PasswordResetEmailContext {
  firstName: string;
  /** Absolute URL, already built server-side from configService.get('frontendUrl') — never
   * from user input. */
  resetUrl: string;
  expiresInMinutes: number;
}

/** Same escaping need as notification-email.template.ts: firstName is user-entered text and
 * must not be interpolated into HTML unescaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatExpiry(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  return `${minutes} minutos`;
}

/**
 * Renders the "esqueci minha senha" e-mail. Unlike notification-email.template.ts, this isn't
 * anchored to an establishment — a User account can belong to more than one, so the header
 * carries the platform brand instead of a tenant's name. Same self-contained inline-styled
 * table layout for e-mail client compatibility.
 */
export function buildPasswordResetEmail(ctx: PasswordResetEmailContext): { html: string; text: string } {
  const expiry = formatExpiry(ctx.expiresInMinutes);

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:#111827;padding:20px 24px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">OffVance Agendamentos</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 16px;color:#111827;font-size:16px;line-height:1.5;">Olá, ${escapeHtml(ctx.firstName)}.</p>
                <p style="margin:0 0 20px;color:#111827;font-size:16px;line-height:1.5;">Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha — o link vale por ${expiry}.</p>
                <a href="${ctx.resetUrl}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:10px 20px;border-radius:6px;">Redefinir senha</a>
                <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha continua a mesma.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Olá, ${ctx.firstName}.`,
    '',
    `Recebemos um pedido para redefinir a senha da sua conta. Acesse o link abaixo para escolher uma nova senha — ele vale por ${expiry}.`,
    '',
    ctx.resetUrl,
    '',
    'Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha continua a mesma.',
  ];

  return { html, text: text.join('\n') };
}
