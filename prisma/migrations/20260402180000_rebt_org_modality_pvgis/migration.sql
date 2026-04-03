-- CreateEnum
CREATE TYPE "SelfConsumptionModality" AS ENUM ('SIN_EXCEDENTES', 'CON_EXCEDENTES_ACOGIDO_COMPENSACION', 'CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION');

-- AlterEnum
ALTER TYPE "TipoFoto" ADD VALUE 'ANEXO_PVGIS';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "rebtCompanyNumber" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "selfConsumptionModality" "SelfConsumptionModality";

UPDATE "Project" SET "selfConsumptionModality" = CASE
  WHEN LOWER(COALESCE("selfConsumptionMode", '')) LIKE '%sin excedente%' THEN 'SIN_EXCEDENTES'::"SelfConsumptionModality"
  WHEN LOWER(COALESCE("selfConsumptionMode", '')) LIKE '%no acogido%' THEN 'CON_EXCEDENTES_NO_ACOGIDO_COMPENSACION'::"SelfConsumptionModality"
  WHEN TRIM(COALESCE("selfConsumptionMode", '')) <> '' THEN 'CON_EXCEDENTES_ACOGIDO_COMPENSACION'::"SelfConsumptionModality"
  ELSE NULL
END
WHERE "selfConsumptionMode" IS NOT NULL;

ALTER TABLE "Project" DROP COLUMN "selfConsumptionMode";
