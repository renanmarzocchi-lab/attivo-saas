import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}`);
  return value;
}

function optional(name, fallback = undefined) {
  return process.env[name] ?? fallback;
}

export const env = {
  NODE_ENV:    optional('NODE_ENV', 'development'),
  PORT:        Number(optional('PORT', '3333')),

  // Banco
  DATABASE_URL: required('DATABASE_URL'),

  // Auth
  JWT_SECRET:            required('JWT_SECRET'),
  ACCESS_TOKEN_EXPIRES:  optional('ACCESS_TOKEN_EXPIRES', '8h'),
  REFRESH_TOKEN_DAYS:    Number(optional('REFRESH_TOKEN_DAYS', '30')),

  // CORS
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:3000'),

  // Redis (opcional — degrada controladamente se ausente)
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),

  // WhatsApp
  WHATSAPP_PROVIDER: optional('WHATSAPP_PROVIDER', 'stub'),

  // Storage
  STORAGE_PROVIDER:   optional('STORAGE_PROVIDER', 'local'),
  STORAGE_LOCAL_PATH: optional('STORAGE_LOCAL_PATH', './uploads'),
  STORAGE_MAX_SIZE_MB: Number(optional('STORAGE_MAX_SIZE_MB', '10')),

  // Email
  EMAIL_PROVIDER:    optional('EMAIL_PROVIDER', 'stub'),
  EMAIL_FROM:        optional('EMAIL_FROM', 'noreply@attivo.app'),
  EMAIL_SMTP_HOST:   optional('EMAIL_SMTP_HOST'),
  EMAIL_SMTP_PORT:   Number(optional('EMAIL_SMTP_PORT', '587')),
  EMAIL_SMTP_SECURE: optional('EMAIL_SMTP_SECURE', 'false') === 'true',
  EMAIL_SMTP_USER:   optional('EMAIL_SMTP_USER'),
  EMAIL_SMTP_PASS:   optional('EMAIL_SMTP_PASS'),

  // Sentry (opcional — desabilitado se ausente)
  SENTRY_DSN:     optional('SENTRY_DSN'),
  APP_VERSION:    optional('APP_VERSION', 'unknown'),

  // Logs
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),
};
