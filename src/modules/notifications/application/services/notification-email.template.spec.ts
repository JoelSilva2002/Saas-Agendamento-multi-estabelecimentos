import { buildNotificationEmail } from './notification-email.template';

describe('buildNotificationEmail', () => {
  const baseCtx = {
    establishmentName: 'Studio Beleza',
    establishmentAddress: {
      street: 'Av. Paulista',
      number: '1000',
      complement: null,
      neighborhood: null,
      city: 'São Paulo',
      state: 'SP',
      zipCode: null,
      country: 'BR',
    },
    serviceName: 'Corte de cabelo',
    employeeName: 'João Barbeiro',
    message: 'Seu agendamento para 14/08/2026 às 16:00 foi confirmado.',
    manageUrl: 'http://localhost:3001/meus-agendamentos',
  };

  it('includes the message, service, professional, address and CTA link', () => {
    const { html, text } = buildNotificationEmail(baseCtx);

    expect(html).toContain('Seu agendamento para 14/08/2026 às 16:00 foi confirmado.');
    expect(html).toContain('Corte de cabelo');
    expect(html).toContain('João Barbeiro');
    expect(html).toContain('Studio Beleza');
    expect(html).toContain('Av. Paulista');
    expect(html).toContain('http://localhost:3001/meus-agendamentos');

    expect(text).toContain('Seu agendamento para 14/08/2026 às 16:00 foi confirmado.');
    expect(text).toContain('Corte de cabelo');
    expect(text).toContain('João Barbeiro');
    expect(text).toContain('http://localhost:3001/meus-agendamentos');
  });

  it('omits service/professional/address rows that are not available', () => {
    const { html } = buildNotificationEmail({
      ...baseCtx,
      serviceName: null,
      employeeName: null,
      establishmentAddress: { ...baseCtx.establishmentAddress, street: null, number: null, neighborhood: null, city: null, state: null },
    });

    expect(html).not.toContain('Corte de cabelo');
    expect(html).not.toContain('João Barbeiro');
    expect(html).not.toContain('Endereço');
  });

  it('escapes HTML in every interpolated field, so a malicious service/establishment name cannot inject markup', () => {
    const { html } = buildNotificationEmail({
      ...baseCtx,
      establishmentName: '<script>alert(1)</script>',
      serviceName: '<img src=x onerror=alert(1)>',
      message: 'Olá <b>cliente</b>',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('Olá <b>cliente</b>');
    expect(html).toContain('&lt;script&gt;');
  });
});
