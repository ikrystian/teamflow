#!/usr/bin/env node
/**
 * MongoDB unique indexes treat documents with a missing (or null) field as
 * having the value null, so a plain unique index on an optional field
 * (Task.key, Task.shareToken, Project.shareToken) rejects the second document
 * that lacks the field.
 *
 * Prisma cannot declare partial indexes in the schema, so those fields carry
 * no @unique attribute and this script creates the indexes instead, with a
 * partialFilterExpression that only indexes string values — uniqueness is
 * still enforced for real keys/tokens, while any number of documents may
 * omit the field or hold null.
 *
 * Run it once per database (idempotent), e.g. after setting up a new
 * environment: node scripts/fix-mongo-indexes.js
 */

require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const PARTIAL_UNIQUE_INDEXES = [
  { collection: 'Task', field: 'key', name: 'Task_key_key' },
  { collection: 'Task', field: 'shareToken', name: 'Task_shareToken_key' },
  { collection: 'Project', field: 'shareToken', name: 'Project_shareToken_key' },
]

async function main() {
  for (const { collection, field, name } of PARTIAL_UNIQUE_INDEXES) {
    try {
      await prisma.$runCommandRaw({ dropIndexes: collection, index: name })
    } catch (error) {
      // IndexNotFound is fine — we create it below either way.
      if (!/index not found/i.test(String(error.message))) throw error
    }

    await prisma.$runCommandRaw({
      createIndexes: collection,
      indexes: [
        {
          key: { [field]: 1 },
          name,
          unique: true,
          partialFilterExpression: { [field]: { $type: 'string' } },
        },
      ],
    })

    console.log(`[fix-mongo-indexes] ${collection}.${field} -> partial unique index "${name}"`)
  }
}

main()
  .catch((error) => {
    console.error('[fix-mongo-indexes] FAILED:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
