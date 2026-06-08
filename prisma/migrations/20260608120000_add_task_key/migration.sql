-- AlterTable
ALTER TABLE "Task" ADD COLUMN "key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_key_key" ON "Task"("key");
