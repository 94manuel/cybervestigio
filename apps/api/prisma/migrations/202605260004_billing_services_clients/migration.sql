CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingService" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "recommendedPrice" DECIMAL(12,2) NOT NULL,
    "priceNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingService_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Invoice"
ADD COLUMN "customerClientId" TEXT,
ADD COLUMN "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "agreementDiscountApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "agreementEntity" TEXT,
ADD COLUMN "agreementDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "Invoice"
SET "subtotal" = "amount"
WHERE "subtotal" = 0;

CREATE UNIQUE INDEX "Client_cedula_key" ON "Client"("cedula");
CREATE INDEX "Client_fullName_idx" ON "Client"("fullName");
CREATE INDEX "BillingService_sector_idx" ON "BillingService"("sector");
CREATE INDEX "BillingService_active_idx" ON "BillingService"("active");
CREATE INDEX "Invoice_customerClientId_idx" ON "Invoice"("customerClientId");

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_customerClientId_fkey"
FOREIGN KEY ("customerClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
