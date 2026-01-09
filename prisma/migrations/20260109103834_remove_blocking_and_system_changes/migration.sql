/*
  Warnings:

  - You are about to drop the `SystemChange` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemChangeRead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `blockReason` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `blockedAt` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `blockedById` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `isBlocked` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `unblockedAt` on the `Task` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SystemChangeRead_userId_changeId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SystemChange";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SystemChangeRead";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "statusId" TEXT,
    "priority" TEXT,
    "dueDate" DATETIME,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "estimatedHours" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" DATETIME,
    "reminderType" TEXT,
    "reminderValue" INTEGER,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "TaskStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "createdAt", "createdById", "description", "dueDate", "endTime", "estimatedHours", "id", "priority", "projectId", "reminderEnabled", "reminderTime", "reminderType", "reminderValue", "startTime", "statusId", "title", "updatedAt") SELECT "assigneeId", "createdAt", "createdById", "description", "dueDate", "endTime", "estimatedHours", "id", "priority", "projectId", "reminderEnabled", "reminderTime", "reminderType", "reminderValue", "startTime", "statusId", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
