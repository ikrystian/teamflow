#!/usr/bin/env node
/**
 * Prisma on MongoDB leaves optional fields *unset* in the document when they
 * are omitted at create time, and `where: { field: null }` does NOT match
 * missing fields — only fields that exist with a null value. Task listings
 * filter on `deletedAt: null` (soft delete) and `projectId: null` (tasks
 * without a project), so tasks whose documents lack those fields silently
 * disappear from every board and list.
 *
 * This script backfills an explicit null into every optional field that is
 * missing, across all collections, so null-equality filters behave the same
 * as they did on SQL. The partial unique indexes on key/shareToken only index
 * string values (see fix-mongo-indexes.js), so explicit nulls there are safe.
 *
 * Keep the field lists in sync with the optional (`Type?`) fields in
 * prisma/schema.prisma. Run once per database (idempotent) — it is chained
 * into `npm run db:push`.
 */

require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Every optional (nullable) field per collection, mirroring schema.prisma.
const NULLABLE_FIELDS = {
  User: ['name', 'password', 'avatarUrl', 'phone', 'location', 'bio', 'jobTitle', 'company', 'website'],
  Project: [
    'description', 'readme', 'imageUrl', 'repositoryUrl', 'databaseUrl', 'serverUrl',
    'apiUrl', 'adminPanelUrl', 'stagingUrl', 'productionUrl', 'credentials',
    'shareToken', 'icon', 'slackChannelId', 'clientId', 'githubRepo',
  ],
  Task: [
    'description', 'statusId', 'priority', 'dueDate', 'startTime', 'endTime',
    'estimatedHours', 'deletedAt', 'projectId', 'assigneeId', 'createdById',
    'reminderTime', 'reminderType', 'reminderValue', 'reminderSentAt', 'changes', 'key',
    'changesSentAt', 'changesSlackTs', 'changesSlackChannelId', 'shareToken',
    'changesScheduledSendAt', 'autoMoveToDoneAt', 'githubBranchName',
    'githubPrUrl', 'githubWorkflowError',
  ],
  Todo: ['timeSpent'],
  TimeEntry: ['description'],
  ProjectDocument: ['description', 'category'],
  TaskAttachment: ['description', 'category'],
  PushSubscription: ['userAgent'],
  ChatRoom: ['name', 'projectId'],
  UserChatRoom: ['lastReadAt'],
  GithubWebhookLog: ['event', 'action', 'headers', 'signature', 'response', 'ipAddress'],
}

async function main() {
  for (const [collection, fields] of Object.entries(NULLABLE_FIELDS)) {
    for (const field of fields) {
      const result = await prisma.$runCommandRaw({
        update: collection,
        updates: [
          {
            q: { [field]: { $exists: false } },
            u: { $set: { [field]: null } },
            multi: true,
          },
        ],
      })
      if (result.nModified > 0) {
        console.log(`[fix-mongo-nulls] ${collection}.${field} -> backfilled null on ${result.nModified} document(s)`)
      }
    }
  }
  console.log('[fix-mongo-nulls] done')
}

main()
  .catch((error) => {
    console.error('[fix-mongo-nulls] FAILED:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
