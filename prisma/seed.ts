import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: hashedPassword,
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Johnson',
      password: hashedPassword,
    },
  })

  // Create team
  const team = await prisma.team.upsert({
    where: { id: 'team-1' },
    update: {},
    create: {
      id: 'team-1',
      name: 'Development Team',
      members: {
        connect: [
          { id: user1.id },
          { id: user2.id },
          { id: user3.id }
        ]
      }
    },
  })

  // Create projects
  const project1 = await prisma.project.upsert({
    where: { id: 'project-1' },
    update: {},
    create: {
      id: 'project-1',
      name: 'TeamFlow Application',
      description: 'Main project management application',

      teamId: team.id,
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: 'project-2' },
    update: {},
    create: {
      id: 'project-2',
      name: 'Mobile App',
      description: 'Mobile version of the application',

      teamId: team.id,
    },
  })

  // Create tasks
  const task1 = await prisma.task.upsert({
    where: { id: 'task-1' },
    update: {},
    create: {
      id: 'task-1',
      title: 'Implement user authentication',
      description: 'Set up NextAuth.js for user authentication',
      statusId: 'status-done',
      priority: 'High',
      estimatedHours: 8,
      projectId: project1.id,
      assigneeId: user1.id,
      createdById: user1.id,
      dueDate: new Date('2025-07-15'),
    },
  })

  const task2 = await prisma.task.upsert({
    where: { id: 'task-2' },
    update: {},
    create: {
      id: 'task-2',
      title: 'Create project dashboard',
      description: 'Build the main dashboard with statistics',
      statusId: 'status-in-progress',
      priority: 'Medium',
      estimatedHours: 12,
      projectId: project1.id,
      assigneeId: user2.id,
      createdById: user1.id,
      dueDate: new Date('2025-07-20'),
    },
  })

  const task3 = await prisma.task.upsert({
    where: { id: 'task-3' },
    update: {},
    create: {
      id: 'task-3',
      title: 'Design mobile UI',
      description: 'Create responsive design for mobile devices',
      statusId: 'status-todo',
      priority: 'Low',
      estimatedHours: 16,
      projectId: project2.id,
      assigneeId: user3.id,
      createdById: user2.id,
      dueDate: new Date('2025-07-25'),
    },
  })

  const task4 = await prisma.task.upsert({
    where: { id: 'task-4' },
    update: {},
    create: {
      id: 'task-4',
      title: 'Implement time tracking',
      description: 'Add time tracking functionality to tasks',
      statusId: 'status-done',
      priority: 'High',
      estimatedHours: 6,
      projectId: project1.id,
      assigneeId: user1.id,
      createdById: user2.id,
      dueDate: new Date('2025-07-10'),
    },
  })

  // Create time entries
  const timeEntries = [
    // User 1 time entries
    {
      hours: 2.5,
      description: 'Set up NextAuth configuration',
      date: new Date('2025-07-10'),
      taskId: task1.id,
      userId: user1.id,
    },
    {
      hours: 4,
      description: 'Implemented login and registration pages',
      date: new Date('2025-07-11'),
      taskId: task1.id,
      userId: user1.id,
    },
    {
      hours: 1.5,
      description: 'Fixed authentication bugs',
      date: new Date('2025-07-12'),
      taskId: task1.id,
      userId: user1.id,
    },
    {
      hours: 3,
      description: 'Added time tracking models',
      date: new Date('2025-07-08'),
      taskId: task4.id,
      userId: user1.id,
    },
    {
      hours: 2,
      description: 'Implemented time logging UI',
      date: new Date('2025-07-09'),
      taskId: task4.id,
      userId: user1.id,
    },
    {
      hours: 1,
      description: 'Testing time tracking functionality',
      date: new Date('2025-07-10'),
      taskId: task4.id,
      userId: user1.id,
    },

    // User 2 time entries
    {
      hours: 4,
      description: 'Created dashboard layout',
      date: new Date('2025-07-13'),
      taskId: task2.id,
      userId: user2.id,
    },
    {
      hours: 3.5,
      description: 'Added statistics cards',
      date: new Date('2025-07-14'),
      taskId: task2.id,
      userId: user2.id,
    },
    {
      hours: 2,
      description: 'Implemented recent tasks section',
      date: new Date('2025-07-15'),
      taskId: task2.id,
      userId: user2.id,
    },
    {
      hours: 1.5,
      description: 'Code review and bug fixes',
      date: new Date('2025-07-16'),
      taskId: task2.id,
      userId: user2.id,
    },

    // User 3 time entries
    {
      hours: 2,
      description: 'Research mobile design patterns',
      date: new Date('2025-07-12'),
      taskId: task3.id,
      userId: user3.id,
    },
    {
      hours: 3,
      description: 'Created wireframes',
      date: new Date('2025-07-13'),
      taskId: task3.id,
      userId: user3.id,
    },
    {
      hours: 1,
      description: 'Team review meeting',
      date: new Date('2025-07-14'),
      taskId: task3.id,
      userId: user3.id,
    },
  ]

  for (const entry of timeEntries) {
    await prisma.timeEntry.create({
      data: entry,
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log(`Created ${timeEntries.length} time entries`)
  console.log('Users:', [user1.email, user2.email, user3.email])
  console.log('Team:', team.name)
  console.log('Projects:', [project1.name, project2.name])
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
