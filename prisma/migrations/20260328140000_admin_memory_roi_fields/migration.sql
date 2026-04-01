-- AlterTable
ALTER TABLE "Project" ADD COLUMN "estimatedRevenue" DECIMAL(12,2);
ALTER TABLE "Project" ADD COLUMN "rebtCompanyNumber" TEXT;
ALTER TABLE "Project" ADD COLUMN "dossierReference" TEXT;
ALTER TABLE "Project" ADD COLUMN "technicalMemory" TEXT;
ALTER TABLE "Project" ADD COLUMN "reviewedByOfficeTech" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "assetPanelBrand" TEXT;
ALTER TABLE "Project" ADD COLUMN "assetPanelModel" TEXT;
ALTER TABLE "Project" ADD COLUMN "assetPanelSerial" TEXT;
ALTER TABLE "Project" ADD COLUMN "assetInverterBrand" TEXT;
ALTER TABLE "Project" ADD COLUMN "assetInverterModel" TEXT;
ALTER TABLE "Project" ADD COLUMN "assetBatteryBrand" TEXT;
ALTER TABLE "Project" ADD COLUMN "assetBatteryModel" TEXT;
ALTER TABLE "Project" ADD COLUMN "peakPowerKwp" DECIMAL(10,2);
ALTER TABLE "Project" ADD COLUMN "inverterPowerKwn" DECIMAL(10,2);
ALTER TABLE "Project" ADD COLUMN "storageCapacityKwh" DECIMAL(10,2);
