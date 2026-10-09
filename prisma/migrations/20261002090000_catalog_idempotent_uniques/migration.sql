-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_tenantId_code_key" ON "MenuItem"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ModifierGroup_tenantId_name_key" ON "ModifierGroup"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ModifierOption_modifierGroupId_name_key" ON "ModifierOption"("modifierGroupId", "name");
