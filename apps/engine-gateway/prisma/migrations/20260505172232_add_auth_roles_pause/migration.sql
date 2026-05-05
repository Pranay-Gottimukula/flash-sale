-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "name" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'CLIENT',
ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SaleEvent" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "webhookUrl" TEXT;
