-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "logoPath" TEXT;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "storagePath" TEXT;

-- AlterTable
ALTER TABLE "ProjectSignature" ADD COLUMN     "storagePath" TEXT;
