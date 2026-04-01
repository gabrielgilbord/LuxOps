CREATE TYPE "EquipmentCatalogCategory" AS ENUM ('PANEL', 'INVERTER', 'BATTERY');

CREATE TABLE "EquipmentCatalogEntry" (
    "id" TEXT NOT NULL,
    "category" "EquipmentCatalogCategory" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "brandKey" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentCatalogEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EquipmentCatalogEntry_category_brandKey_modelKey_key" ON "EquipmentCatalogEntry"("category", "brandKey", "modelKey");

CREATE INDEX "EquipmentCatalogEntry_category_brandKey_idx" ON "EquipmentCatalogEntry"("category", "brandKey");
