-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "unblockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SystemChange" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "SystemChange_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SystemChange" ADD CONSTRAINT "SystemChange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
