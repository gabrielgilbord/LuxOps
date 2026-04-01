/*
  Warnings:

  - You are about to drop the column `address` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `clientName` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `installerId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `ProjectPhoto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskChecklist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `cliente` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direccion` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operarioInitials` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operarioNombre` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('PRESUPUESTO', 'PENDIENTE_MATERIAL', 'EN_INSTALACION', 'FINALIZADO', 'SUBVENCION_TRAMITADA');

-- CreateEnum
CREATE TYPE "TipoFoto" AS ENUM ('ANTES', 'DURANTE', 'DESPUES');

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_installerId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectPhoto" DROP CONSTRAINT "ProjectPhoto_projectId_fkey";

-- DropForeignKey
ALTER TABLE "TaskChecklist" DROP CONSTRAINT "TaskChecklist_checkedById_fkey";

-- DropForeignKey
ALTER TABLE "TaskChecklist" DROP CONSTRAINT "TaskChecklist_projectId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "address",
DROP COLUMN "clientName",
DROP COLUMN "installerId",
DROP COLUMN "name",
DROP COLUMN "status",
ADD COLUMN     "cliente" TEXT NOT NULL,
ADD COLUMN     "direccion" TEXT NOT NULL,
ADD COLUMN     "estado" "EstadoProyecto" NOT NULL DEFAULT 'PRESUPUESTO',
ADD COLUMN     "operarioInitials" TEXT NOT NULL,
ADD COLUMN     "operarioNombre" TEXT NOT NULL,
ADD COLUMN     "progreso" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "ProjectPhoto";

-- DropTable
DROP TABLE "TaskChecklist";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "PhotoType";

-- DropEnum
DROP TYPE "ProjectStatus";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" "TipoFoto" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
