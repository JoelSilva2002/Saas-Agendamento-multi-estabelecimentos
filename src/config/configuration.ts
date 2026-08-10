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
  notifications: {
    whatsapp: { webhookUrl?: string; apiToken?: string };
    email: { webhookUrl?: string; apiToken?: string };
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
  // Unset URLs mean the corresponding adapter runs in "log"/"sandbox" mode instead of
  // calling out to a real provider — see HttpWhatsAppNotifier/HttpEmailNotifier/
  // HttpPaymentGatewayAdapter. Structure is real end-to-end; the provider is swappable.
  notifications: {
    whatsapp: {
      webhookUrl: process.env.NOTIFICATIONS_WHATSAPP_WEBHOOK_URL,
      apiToken: process.env.NOTIFICATIONS_WHATSAPP_API_TOKEN,
    },
    email: {
      webhookUrl: process.env.NOTIFICATIONS_EMAIL_WEBHOOK_URL,
      apiToken: process.env.NOTIFICATIONS_EMAIL_API_TOKEN,
    },
  },
  paymentGateway: {
    apiUrl: process.env.PAYMENT_GATEWAY_API_URL,
    apiToken: process.env.PAYMENT_GATEWAY_API_TOKEN,
    webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
  },
});
