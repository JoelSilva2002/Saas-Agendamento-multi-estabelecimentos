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
});
