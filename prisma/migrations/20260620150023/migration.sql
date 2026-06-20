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
    "deletedAt" DATETIME,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" DATETIME,
    "reminderType" TEXT,
    "reminderValue" INTEGER,
    "changes" TEXT,
    "key" TEXT,
    "changesSentAt" DATETIME,
    "changesSlackTs" TEXT,
    "changesSlackChannelId" TEXT,
    "shareToken" TEXT,
    "changesScheduledSendAt" DATETIME,
    "githubBranchName" TEXT,
    "githubPrUrl" TEXT,
    "githubWorkflowError" TEXT,
    CONSTRAINT "Task_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "TaskStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "changes", "changesScheduledSendAt", "changesSentAt", "changesSlackChannelId", "changesSlackTs", "createdAt", "createdById", "deletedAt", "description", "dueDate", "endTime", "estimatedHours", "githubBranchName", "githubPrUrl", "githubWorkflowError", "id", "key", "priority", "projectId", "reminderEnabled", "reminderTime", "reminderType", "reminderValue", "shareToken", "startTime", "statusId", "title", "updatedAt") SELECT "assigneeId", "changes", "changesScheduledSendAt", "changesSentAt", "changesSlackChannelId", "changesSlackTs", "createdAt", "createdById", "deletedAt", "description", "dueDate", "endTime", "estimatedHours", "githubBranchName", "githubPrUrl", "githubWorkflowError", "id", "key", "priority", "projectId", "reminderEnabled", "reminderTime", "reminderType", "reminderValue", "shareToken", "startTime", "statusId", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_key_key" ON "Task"("key");
CREATE UNIQUE INDEX "Task_shareToken_key" ON "Task"("shareToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
