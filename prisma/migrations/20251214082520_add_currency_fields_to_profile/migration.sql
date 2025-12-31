-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "currencyDetectedAt" TIMESTAMP(3),
ADD COLUMN     "lastDetectedCountry" TEXT,
ADD COLUMN     "preferredCurrency" TEXT DEFAULT 'BDT';
