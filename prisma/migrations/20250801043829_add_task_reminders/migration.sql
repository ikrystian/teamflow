-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderTime" TIMESTAMP(3),
ADD COLUMN     "reminderType" TEXT,
ADD COLUMN     "reminderValue" INTEGER;
