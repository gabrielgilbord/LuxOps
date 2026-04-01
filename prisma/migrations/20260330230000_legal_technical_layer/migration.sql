-- CreateEnum
CREATE TYPE "StructureMountingType" AS ENUM ('COPLANAR', 'INCLINACION', 'LASTRADA');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "cups" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "catastralReference" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "ownerTaxId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "structureBrand" TEXT;
ALTER TABLE "Project" ADD COLUMN "structureMounting" "StructureMountingType";
ALTER TABLE "Project" ADD COLUMN "stringConfiguration" TEXT;
ALTER TABLE "Project" ADD COLUMN "electricVocVolts" DECIMAL(10,2);
ALTER TABLE "Project" ADD COLUMN "electricIscAmps" DECIMAL(10,2);
ALTER TABLE "Project" ADD COLUMN "earthResistanceOhms" DECIMAL(10,3);
ALTER TABLE "Project" ADD COLUMN "thermalProtectionBrand" TEXT;
ALTER TABLE "Project" ADD COLUMN "thermalProtectionModel" TEXT;
ALTER TABLE "Project" ADD COLUMN "spdBrand" TEXT;
ALTER TABLE "Project" ADD COLUMN "spdModel" TEXT;
ALTER TABLE "Project" ADD COLUMN "panelAzimuthDegrees" DECIMAL(8,2);
ALTER TABLE "Project" ADD COLUMN "panelTiltDegrees" DECIMAL(8,2);
ALTER TABLE "Project" ADD COLUMN "installerProfessionalCard" TEXT;
ALTER TABLE "Project" ADD COLUMN "photoProtocolNameplates" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "photoProtocolDistributionBoard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "photoProtocolFixings" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "photoProtocolStructureEarthing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "clientTrainingAcknowledged" BOOLEAN NOT NULL DEFAULT false;
