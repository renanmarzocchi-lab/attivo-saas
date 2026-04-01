-- Script executado na primeira inicialização do PostgreSQL
-- Garante extensões necessárias para o Prisma
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
