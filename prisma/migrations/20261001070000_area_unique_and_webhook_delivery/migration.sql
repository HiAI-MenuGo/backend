-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookConfigId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "isSuccess" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookConfigId_createdAt_idx" ON "WebhookDelivery"("webhookConfigId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Area_tenantId_branchId_name_key" ON "Area"("tenantId", "branchId", "name");

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookConfigId_fkey" FOREIGN KEY ("webhookConfigId") REFERENCES "WebhookConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
