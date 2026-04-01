-- AlterTable: Protocolo PRL previo a obra (timestamp + GPS en sync)
ALTER TABLE "Project" ADD COLUMN "prlLineLifeHarness" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "prlCollectiveProtection" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "prlRoofTransitOk" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "prlPpeInUse" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "prlAckLatitude" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN "prlAckLongitude" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN "prlAcknowledgedAt" TIMESTAMP(3);
