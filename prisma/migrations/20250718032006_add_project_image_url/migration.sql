-- AlterTable
ALTER TABLE "Project" ADD COLUMN "adminPanelUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "apiUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "credentials" TEXT;
ALTER TABLE "Project" ADD COLUMN "databaseUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "productionUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "repositoryUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "serverUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "stagingUrl" TEXT;

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
