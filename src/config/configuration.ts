import path from 'path';

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
  passwordReset: {
    expiresInMinutes: number;
    /** Minimum time between two reset requests for the same user — a second request inside
     * this window is a silent no-op instead of sending another e-mail/creating another token. */
    cooldownMinutes: number;
  };
  /** Base URL of the client-facing frontend — used to build links inside outbound
   * notifications (e.g. "ver meus agendamentos"). Never used for CORS or redirects. */
  frontendUrl: string;
  notifications: {
    email: { apiKey?: string; fromAddress: string };
  };
  paymentGateway: {
    apiUrl?: string;
    apiToken?: string;
    webhookSecret?: string;
  };
  media: {
    /** Root directory the local-disk FileStoragePort adapter reads/writes under. Swapping in
     * an S3/R2 adapter later makes this irrelevant without touching any consumer. */
    storageRoot: string;
    /** Absolute origin the browser uses to load stored files. Defaults to this API's own
     * origin because the local adapter serves them from GET /media/*. Point at a CDN/bucket
     * URL when an S3/R2 adapter is dropped in. */
    publicBaseUrl: string;
    maxUploadBytes: number;
    maxGalleryPhotos: number;
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
  passwordReset: {
    expiresInMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES ?? '60', 10),
    cooldownMinutes: parseInt(process.env.PASSWORD_RESET_COOLDOWN_MINUTES ?? '2', 10),
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  // No RESEND_API_KEY means the adapter runs in "log" mode instead of calling out to a real
  // provider — see ResendEmailNotifier/HttpPaymentGatewayAdapter. Structure is real end-to-end;
  // the provider is swappable.
  notifications: {
    email: {
      apiKey: process.env.RESEND_API_KEY,
      // resend.dev is Resend's shared sending domain — works out of the box with no DNS
      // setup, meant exactly for this "haven't verified our own domain yet" situation.
      fromAddress: process.env.NOTIFICATIONS_EMAIL_FROM ?? 'OffVance Agendamentos <onboarding@resend.dev>',
    },
  },
  paymentGateway: {
    apiUrl: process.env.PAYMENT_GATEWAY_API_URL,
    apiToken: process.env.PAYMENT_GATEWAY_API_TOKEN,
    webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
  },
  media: {
    storageRoot: process.env.MEDIA_STORAGE_ROOT ?? path.join(process.cwd(), 'uploads'),
    publicBaseUrl:
      process.env.MEDIA_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`,
    maxUploadBytes: parseInt(process.env.MEDIA_MAX_UPLOAD_BYTES ?? '5242880', 10),
    maxGalleryPhotos: parseInt(process.env.MEDIA_MAX_GALLERY_PHOTOS ?? '12', 10),
  },
});
