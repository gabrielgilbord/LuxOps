/*
  Warnings:

  - A unique constraint covering the columns `[tokenHash]` on the table `OperatorInvite` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `OperatorInvite` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenHash` to the `OperatorInvite` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OperatorInvite" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "invitedByUserId" TEXT,
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatorInvite_tokenHash_key" ON "OperatorInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "OperatorInvite_organizationId_email_idx" ON "OperatorInvite"("organizationId", "email");

-- AddForeignKey
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
