-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERARIO');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "assignedUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'OPERARIO';

-- CreateTable
CREATE TABLE "OperatorInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "OperatorInvite_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OperatorInvite" ADD CONSTRAINT "OperatorInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
