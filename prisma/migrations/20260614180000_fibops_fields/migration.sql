-- AlterTable
ALTER TABLE "Project" ADD COLUMN "fiberOperator" TEXT,
ADD COLUMN "clientPhone" TEXT,
ADD COLUMN "installFloorDoor" TEXT,
ADD COLUMN "fiberOrderReference" TEXT,
ADD COLUMN "fiberCtoReference" TEXT,
ADD COLUMN "fiberOpticalPowerDbm" DECIMAL(6,2),
ADD COLUMN "fiberVlanId" TEXT;
