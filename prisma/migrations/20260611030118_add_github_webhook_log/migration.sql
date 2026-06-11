-- CreateTable
CREATE TABLE "GithubWebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT,
    "action" TEXT,
    "payload" TEXT NOT NULL,
    "headers" TEXT,
    "signature" TEXT,
    "response" TEXT,
    "statusCode" INTEGER NOT NULL DEFAULT 200,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT
);
