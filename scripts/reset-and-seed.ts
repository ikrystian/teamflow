import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetAndSeed() {
  try {
    console.log('🗑️ Clearing existing data...')

    // Delete all data in correct order to respect foreign key constraints
    await prisma.todo.deleteMany()
    await prisma.comment.deleteMany()
    await prisma.subtask.deleteMany()
    await prisma.timeEntry.deleteMany()
    await prisma.taskImage.deleteMany()
    await prisma.task.deleteMany()
    await prisma.projectDocument.deleteMany()
    await prisma.project.deleteMany()
    await prisma.taskStatus.deleteMany()
    await prisma.systemChange.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()

    // Skip VerificationToken as it may cause issues with some PostgreSQL configurations
    try {
      await prisma.verificationToken.deleteMany()
    } catch (error) {
      console.log('⚠️ Skipping VerificationToken cleanup (not critical)')
    }

    // Clear many-to-many relationships
    await prisma.$executeRaw`DELETE FROM "_TeamMembers"`

    await prisma.team.deleteMany()
    await prisma.user.deleteMany()

    console.log('✅ Database cleared successfully!')

    console.log('🌱 Running seed script...')

    // Import and run the main seed function
    const { main } = await import('../prisma/seed')
    await main()

    console.log('🎉 Database reset and seeded successfully!')

  } catch (error) {
    console.error('❌ Error during reset and seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resetAndSeed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
