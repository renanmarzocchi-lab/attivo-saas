import 'dotenv/config';

// Sobrescreve envs para testes
process.env.NODE_ENV        = 'test';
process.env.DATABASE_URL    = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
process.env.REDIS_URL       = process.env.TEST_REDIS_URL    ?? 'redis://localhost:6379';
process.env.JWT_SECRET      = 'test-secret-jwt-para-testes';
process.env.WHATSAPP_PROVIDER = 'stub';
process.env.STORAGE_PROVIDER  = 'local';
process.env.LOG_LEVEL         = 'silent'; // silencia logs nos testes
