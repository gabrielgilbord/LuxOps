-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "fechaCIE" TIMESTAMP(3),
ADD COLUMN     "moduleEfficiencyPercent" DECIMAL(5,2),
ADD COLUMN     "nBoletin" TEXT,
ADD COLUMN     "presupuestoFinal" DECIMAL(12,2);
