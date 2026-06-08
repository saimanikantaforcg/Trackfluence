import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_PORT: Joi.number().default(4000),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  CORS_ORIGIN: Joi.string().optional().allow(''),
  SHOPIFY_API_SECRET: Joi.string().optional().allow(''),
  NEXT_PUBLIC_API_URL: Joi.string().uri().optional().allow(''),
  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  // Email
  RESEND_API_KEY: Joi.string().optional().allow(''),
  EMAIL_FROM: Joi.string().optional().allow(''),
  APP_URL: Joi.string().uri().optional().allow(''),
  APP_BASE_URL: Joi.string().uri().optional().allow(''),
  // Salesforce OAuth
  SALESFORCE_CLIENT_ID: Joi.string().optional().allow(''),
  SALESFORCE_CLIENT_SECRET: Joi.string().optional().allow(''),
  SALESFORCE_REDIRECT_URI: Joi.string().uri().optional().allow(''),
  SALESFORCE_LOGIN_URL: Joi.string().uri().optional().allow('').default('https://login.salesforce.com'),
  // Stripe billing
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  STRIPE_PRICE_STARTER: Joi.string().optional().allow(''),
  STRIPE_PRICE_GROWTH: Joi.string().optional().allow(''),
  STRIPE_PRICE_ENTERPRISE: Joi.string().optional().allow(''),
  // PostHog analytics
  POSTHOG_API_KEY: Joi.string().optional().allow(''),
  POSTHOG_HOST: Joi.string().uri().optional().allow('').default('https://app.posthog.com'),
});
