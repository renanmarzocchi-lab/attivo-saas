-- AlterTable
ALTER TABLE "Affiliate" ADD COLUMN "address" TEXT;
ALTER TABLE "Affiliate" ADD COLUMN "addressNumber" TEXT;
ALTER TABLE "Affiliate" ADD COLUMN "addressComplement" TEXT;
ALTER TABLE "Affiliate" ADD COLUMN "neighborhood" TEXT;
ALTER TABLE "Affiliate" ADD COLUMN "zipCode" TEXT;
ALTER TABLE "Affiliate" ADD COLUMN "profileComplete" BOOLEAN NOT NULL DEFAULT false;
