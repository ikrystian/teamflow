-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "readme" TEXT,
    "status" TEXT NOT NULL DEFAULT 'In Progress',
    "imageUrl" TEXT,
    "repositoryUrl" TEXT,
    "databaseUrl" TEXT,
    "serverUrl" TEXT,
    "apiUrl" TEXT,
    "adminPanelUrl" TEXT,
    "stagingUrl" TEXT,
    "productionUrl" TEXT,
    "credentials" TEXT,
    "shareToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "icon" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "slackChannelId" TEXT,
    "clientId" TEXT,
    CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("adminPanelUrl", "apiUrl", "archived", "color", "createdAt", "createdById", "credentials", "databaseUrl", "description", "icon", "id", "imageUrl", "name", "productionUrl", "readme", "repositoryUrl", "serverUrl", "shareToken", "slackChannelId", "stagingUrl", "status", "updatedAt") SELECT "adminPanelUrl", "apiUrl", "archived", "color", "createdAt", "createdById", "credentials", "databaseUrl", "description", "icon", "id", "imageUrl", "name", "productionUrl", "readme", "repositoryUrl", "serverUrl", "shareToken", "slackChannelId", "stagingUrl", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_shareToken_key" ON "Project"("shareToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

