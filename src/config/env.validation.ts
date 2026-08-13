import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),

  REFRESH_TOKEN_EXPIRES_IN_DAYS: Joi.number().default(30),

  PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: Joi.number().default(60),
  PASSWORD_RESET_COOLDOWN_MINUTES: Joi.number().default(2),

  SEED_PLATFORM_ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .optional(),
  SEED_PLATFORM_ADMIN_PASSWORD: Joi.string().optional(),

  FRONTEND_URL: Joi.string().uri().optional(),

  // Optional — unset means ResendEmailNotifier falls back to log mode.
  RESEND_API_KEY: Joi.string().optional(),
  NOTIFICATIONS_EMAIL_FROM: Joi.string().optional(),

  PAYMENT_GATEWAY_API_URL: Joi.string().uri().optional(),
  PAYMENT_GATEWAY_API_TOKEN: Joi.string().optional(),
  // Required once a real gateway URL is configured, since the webhook endpoint is public
  // and this secret is the only thing authenticating callbacks.
  PAYMENT_GATEWAY_WEBHOOK_SECRET: Joi.string().when('PAYMENT_GATEWAY_API_URL', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // All optional, zero-config defaults — see configuration.ts. MEDIA_STORAGE_ROOT defaults to
  // ./uploads under the process cwd; MEDIA_PUBLIC_BASE_URL defaults to this API's own origin.
  MEDIA_STORAGE_ROOT: Joi.string().optional(),
  MEDIA_PUBLIC_BASE_URL: Joi.string().uri().optional(),
  MEDIA_MAX_UPLOAD_BYTES: Joi.number().default(5242880),
  MEDIA_MAX_GALLERY_PHOTOS: Joi.number().default(12),
});
