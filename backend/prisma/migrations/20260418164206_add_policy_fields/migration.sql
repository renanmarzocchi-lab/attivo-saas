-- CreateEnum
CREATE TYPE "TipoEmissao" AS ENUM ('NOVO', 'RENOVACAO');

-- CreateEnum
CREATE TYPE "ComissaoPagaStatus" AS ENUM ('PAGA', 'PENDENTE');

-- AlterTable
ALTER TABLE "InsuranceRecord" ADD COLUMN     "comissaoPaga" "ComissaoPagaStatus" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "dataPagamentoComissao" TIMESTAMP(3),
ADD COLUMN     "numeroCi" TEXT,
ADD COLUMN     "percComissao" DECIMAL(6,4),
ADD COLUMN     "tipoEmissao" "TipoEmissao" NOT NULL DEFAULT 'NOVO';
