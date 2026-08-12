import { Logger } from '@nestjs/common';
import { ResendEmailNotifier } from './resend-email-notifier';

describe('ResendEmailNotifier', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function build(overrides: { apiKey?: string; fromAddress?: string }) {
    const configService = {
      get: jest.fn().mockReturnValue({
        email: {
          apiKey: overrides.apiKey,
          fromAddress: overrides.fromAddress ?? 'AgendaSaaS <onboarding@resend.dev>',
        },
      }),
    };
    return new ResendEmailNotifier(configService as never);
  }

  it('logs instead of calling the API when RESEND_API_KEY is not configured', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    global.fetch = jest.fn();
    const notifier = build({});

    await notifier.send('client@test.local', 'Assunto', { html: '<p>oi</p>', text: 'oi' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it('POSTs to the Resend API with the configured from address and bearer token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as never;
    const notifier = build({ apiKey: 're_test_123', fromAddress: 'AgendaSaaS <no-reply@agendasaas.com>' });

    await notifier.send('client@test.local', 'Assunto', { html: '<p>oi</p>', text: 'oi' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_123',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({
      from: 'AgendaSaaS <no-reply@agendasaas.com>',
      to: ['client@test.local'],
      subject: 'Assunto',
      html: '<p>oi</p>',
      text: 'oi',
    });
  });

  it('throws with the response status and body when Resend rejects the request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('{"message":"invalid from address"}'),
    }) as never;
    const notifier = build({ apiKey: 're_test_123' });

    await expect(
      notifier.send('client@test.local', 'Assunto', { html: '<p>oi</p>', text: 'oi' }),
    ).rejects.toThrow(/422.*invalid from address/);
  });
});
