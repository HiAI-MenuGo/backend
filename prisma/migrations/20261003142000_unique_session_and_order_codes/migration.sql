-- CreateIndex
CREATE UNIQUE INDEX "OrderSession_branchId_sessionCode_key" ON "OrderSession"("branchId", "sessionCode");

-- CreateIndex
CREATE UNIQUE INDEX "Order_branchId_orderCode_key" ON "Order"("branchId", "orderCode");
