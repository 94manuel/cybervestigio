CREATE TYPE "ExternalUserStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT', 'ABANDONED');
CREATE TYPE "ServiceOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('NEQUI', 'DAVIPLATA', 'PSE', 'TRANSFERENCIA', 'TARJETA', 'EFECTIVO');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
CREATE TYPE "ExpedienteStatus" AS ENUM ('ABIERTO', 'EN_PROCESO', 'CERRADO');
CREATE TYPE "ReceiptStatus" AS ENUM ('POR_PAGAR', 'PAGADO', 'VENCIDO', 'ANULADO');

CREATE TABLE "ExternalUser" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "ExternalUserStatus" NOT NULL DEFAULT 'PENDING',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorCodeHash" TEXT,
    "twoFactorExpiresAt" TIMESTAMP(3),
    "passwordResetCodeHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "drivePrefix" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceTitle" TEXT NOT NULL,
    "serviceDescription" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCartItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "paymentNotes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceTitle" TEXT NOT NULL,
    "serviceDescription" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expediente" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdByAdminId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ExpedienteStatus" NOT NULL DEFAULT 'ABIERTO',
    "minioPrefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Expediente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expedienteId" TEXT,
    "orderId" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'POR_PAGAR',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalUser_email_key" ON "ExternalUser"("email");
CREATE UNIQUE INDEX "ExternalUser_clientId_key" ON "ExternalUser"("clientId");
CREATE INDEX "ExternalUser_status_idx" ON "ExternalUser"("status");
CREATE INDEX "ExternalUser_createdAt_idx" ON "ExternalUser"("createdAt");

CREATE INDEX "ServiceCart_userId_status_idx" ON "ServiceCart"("userId", "status");
CREATE INDEX "ServiceCart_createdAt_idx" ON "ServiceCart"("createdAt");

CREATE INDEX "ServiceCartItem_cartId_idx" ON "ServiceCartItem"("cartId");
CREATE INDEX "ServiceCartItem_serviceId_idx" ON "ServiceCartItem"("serviceId");

CREATE UNIQUE INDEX "ServiceOrder_orderNumber_key" ON "ServiceOrder"("orderNumber");
CREATE INDEX "ServiceOrder_userId_status_idx" ON "ServiceOrder"("userId", "status");
CREATE INDEX "ServiceOrder_paymentStatus_idx" ON "ServiceOrder"("paymentStatus");
CREATE INDEX "ServiceOrder_createdAt_idx" ON "ServiceOrder"("createdAt");

CREATE INDEX "ServiceOrderItem_orderId_idx" ON "ServiceOrderItem"("orderId");
CREATE INDEX "ServiceOrderItem_serviceId_idx" ON "ServiceOrderItem"("serviceId");

CREATE UNIQUE INDEX "Expediente_code_key" ON "Expediente"("code");
CREATE UNIQUE INDEX "Expediente_orderId_key" ON "Expediente"("orderId");
CREATE INDEX "Expediente_userId_status_idx" ON "Expediente"("userId", "status");
CREATE INDEX "Expediente_createdAt_idx" ON "Expediente"("createdAt");

CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");
CREATE INDEX "Receipt_userId_status_idx" ON "Receipt"("userId", "status");
CREATE INDEX "Receipt_expedienteId_idx" ON "Receipt"("expedienteId");
CREATE INDEX "Receipt_orderId_idx" ON "Receipt"("orderId");
CREATE INDEX "Receipt_dueDate_idx" ON "Receipt"("dueDate");

ALTER TABLE "ExternalUser"
ADD CONSTRAINT "ExternalUser_createdByAdminId_fkey"
FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExternalUser"
ADD CONSTRAINT "ExternalUser_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceCart"
ADD CONSTRAINT "ServiceCart_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "ExternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceCartItem"
ADD CONSTRAINT "ServiceCartItem_cartId_fkey"
FOREIGN KEY ("cartId") REFERENCES "ServiceCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceCartItem"
ADD CONSTRAINT "ServiceCartItem_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceOrder"
ADD CONSTRAINT "ServiceOrder_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "ExternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceOrderItem"
ADD CONSTRAINT "ServiceOrderItem_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceOrderItem"
ADD CONSTRAINT "ServiceOrderItem_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expediente"
ADD CONSTRAINT "Expediente_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "ExternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expediente"
ADD CONSTRAINT "Expediente_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expediente"
ADD CONSTRAINT "Expediente_createdByAdminId_fkey"
FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Receipt"
ADD CONSTRAINT "Receipt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "ExternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Receipt"
ADD CONSTRAINT "Receipt_expedienteId_fkey"
FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Receipt"
ADD CONSTRAINT "Receipt_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Receipt"
ADD CONSTRAINT "Receipt_createdByAdminId_fkey"
FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
