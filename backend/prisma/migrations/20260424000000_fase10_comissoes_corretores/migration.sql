-- Fase 10: Comissões de Corretores e Sistema de Retiradas

-- Novos enums
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');
CREATE TYPE "CommissionOwnerType" AS ENUM ('AFFILIATE', 'BROKER');

-- Adicionar campos ao User (comissão e PIX para corretores)
ALTER TABLE "User" ADD COLUMN "commissionRate" DECIMAL(6,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE "User" ADD COLUMN "pixKey" TEXT;

-- Tabela BrokerCommission
CREATE TABLE "BrokerCommission" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "insuranceId"     TEXT NOT NULL,
    "amount"          DECIMAL(12,2) NOT NULL,
    "rate"            DECIMAL(6,4) NOT NULL,
    "status"          "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "competenceMonth" TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerCommission_pkey" PRIMARY KEY ("id")
);

-- Índices BrokerCommission
CREATE UNIQUE INDEX "BrokerCommission_insuranceId_key" ON "BrokerCommission"("insuranceId");
CREATE INDEX "BrokerCommission_userId_idx" ON "BrokerCommission"("userId");
CREATE INDEX "BrokerCommission_status_idx" ON "BrokerCommission"("status");

-- FK BrokerCommission
ALTER TABLE "BrokerCommission" ADD CONSTRAINT "BrokerCommission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BrokerCommission" ADD CONSTRAINT "BrokerCommission_insuranceId_fkey"
    FOREIGN KEY ("insuranceId") REFERENCES "InsuranceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tabela WithdrawalRequest
CREATE TABLE "WithdrawalRequest" (
    "id"                    TEXT NOT NULL,
    "ownerType"             "CommissionOwnerType" NOT NULL,
    "requestedByUserId"     TEXT NOT NULL,
    "affiliateCommissionId" TEXT,
    "brokerCommissionId"    TEXT,
    "amount"                DECIMAL(12,2) NOT NULL,
    "pixKey"                TEXT,
    "status"                "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "notes"                 TEXT,
    "requestedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt"            TIMESTAMP(3),
    "resolvedByUserId"      TEXT,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- Índices e uniques WithdrawalRequest
CREATE UNIQUE INDEX "WithdrawalRequest_affiliateCommissionId_key" ON "WithdrawalRequest"("affiliateCommissionId");
CREATE UNIQUE INDEX "WithdrawalRequest_brokerCommissionId_key" ON "WithdrawalRequest"("brokerCommissionId");
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");
CREATE INDEX "WithdrawalRequest_requestedByUserId_idx" ON "WithdrawalRequest"("requestedByUserId");

-- FK WithdrawalRequest
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_affiliateCommissionId_fkey"
    FOREIGN KEY ("affiliateCommissionId") REFERENCES "AffiliateCommission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_brokerCommissionId_fkey"
    FOREIGN KEY ("brokerCommissionId") REFERENCES "BrokerCommission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
