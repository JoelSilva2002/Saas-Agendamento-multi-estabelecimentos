import { buildPasswordResetEmail } from './password-reset-email.template';

describe('buildPasswordResetEmail', () => {
  const baseCtx = {
    firstName: 'Ana',
    resetUrl: 'http://localhost:3001/redefinir-senha?token=abc123',
    expiresInMinutes: 60,
  };

  it('includes the greeting, reset link and expiry window', () => {
    const { html, text } = buildPasswordResetEmail(baseCtx);

    expect(html).toContain('Ana');
    expect(html).toContain('http://localhost:3001/redefinir-senha?token=abc123');
    expect(html).toContain('1 hora');

    expect(text).toContain('Ana');
    expect(text).toContain('http://localhost:3001/redefinir-senha?token=abc123');
    expect(text).toContain('1 hora');
  });

  it('renders a plural expiry window for non-60-minute values', () => {
    const { html } = buildPasswordResetEmail({ ...baseCtx, expiresInMinutes: 30 });
    expect(html).toContain('30 minutos');
  });

  it('renders a plural hour window for multi-hour values', () => {
    const { html } = buildPasswordResetEmail({ ...baseCtx, expiresInMinutes: 120 });
    expect(html).toContain('2 horas');
  });

  it('escapes HTML in the first name, so a malicious profile name cannot inject markup', () => {
    const { html } = buildPasswordResetEmail({ ...baseCtx, firstName: '<script>alert(1)</script>' });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
