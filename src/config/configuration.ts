export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
  };
  refreshToken: {
    expiresInDays: number;
  };
  /** Base URL of the client-facing frontend — used to build links inside outbound
   * notifications (e.g. "ver meus agendamentos"). Never used for CORS or redirects. */
  frontendUrl: string;
  notifications: {
    whatsapp: { webhookUrl?: string; apiToken?: string };
    email: { apiKey?: string; fromAddress: string };
  };
  paymentGateway: {
    apiUrl?: string;
    apiToken?: string;
    webhookSecret?: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  },
  refreshToken: {
    expiresInDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? '30', 10),
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  // Unset credentials mean the corresponding adapter runs in "log"/"sandbox" mode instead of
  // calling out to a real provider — see HttpWhatsAppNotifier/ResendEmailNotifier/
  // HttpPaymentGatewayAdapter. Structure is real end-to-end; the provider is swappable.
  notifications: {
    whatsapp: {
      webhookUrl: process.env.NOTIFICATIONS_WHATSAPP_WEBHOOK_URL,
      apiToken: process.env.NOTIFICATIONS_WHATSAPP_API_TOKEN,
    },
    email: {
      apiKey: process.env.RESEND_API_KEY,
      // resend.dev is Resend's shared sending domain — works out of the box with no DNS
      // setup, meant exactly for this "haven't verified our own domain yet" situation.
      fromAddress: process.env.NOTIFICATIONS_EMAIL_FROM ?? 'AgendaSaaS <onboarding@resend.dev>',
    },
  },
  paymentGateway: {
    apiUrl: process.env.PAYMENT_GATEWAY_API_URL,
    apiToken: process.env.PAYMENT_GATEWAY_API_TOKEN,
    webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
  },
});
