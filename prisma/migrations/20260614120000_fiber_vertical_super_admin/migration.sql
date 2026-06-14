-- CreateEnum
CREATE TYPE "OrganizationVertical" AS ENUM ('SOLAR', 'FIBER');

-- CreateEnum
CREATE TYPE "FiberInstallationType" AS ENUM ('FTTH', 'FTTB', 'FTTO');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "vertical" "OrganizationVertical" NOT NULL DEFAULT 'SOLAR';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "serviceContractId" TEXT,
ADD COLUMN "fiberInstallationType" "FiberInstallationType",
ADD COLUMN "ontSerial" TEXT,
ADD COLUMN "routerSerial" TEXT,
ADD COLUMN "fiberDropLengthMeters" DECIMAL(8,2),
ADD COLUMN "fiberInstallationNotes" TEXT;
