ALTER TABLE "Invoice"
ADD COLUMN "lineItems" JSONB NOT NULL DEFAULT '[]'::jsonb;
