import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function main() {
  console.log('🌱 Seeding database...')

  // Create users with different roles and profiles
  const hashedPassword = await bcrypt.hash('password123', 10)
  const adminPassword = await bcrypt.hash('admin123', 12)

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'krystian@bpcoders.pl' },
    update: {},
    create: {
      email: 'krystian@bpcoders.pl',
      name: 'Krystian Admin',
      password: adminPassword,
      role: 'admin',
      jobTitle: 'System Administrator',
      company: 'BP Coders',
      location: 'Warszawa, Polska',
      bio: 'Administrator systemu z wieloletnim doświadczeniem w zarządzaniu projektami.',
      phone: '+48 123 456 789',
      website: 'https://bpcoders.pl',
    },
  })

  // Team Lead
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Team Lead & Senior Developer',
      company: 'TechCorp',
      location: 'Kraków, Polska',
      bio: 'Doświadczony programista z pasją do nowych technologii i zarządzania zespołem.',
      phone: '+48 987 654 321',
    },
  })

  // Frontend Developer
  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Frontend Developer',
      company: 'TechCorp',
      location: 'Gdańsk, Polska',
      bio: 'Specjalistka od interfejsów użytkownika z zamiłowaniem do UX/UI design.',
      phone: '+48 555 123 456',
      website: 'https://janesmith.dev',
    },
  })

  // UI/UX Designer
  const user3 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Johnson',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'UI/UX Designer',
      company: 'DesignStudio',
      location: 'Wrocław, Polska',
      bio: 'Kreatywny designer z doświadczeniem w projektowaniu aplikacji mobilnych i webowych.',
      phone: '+48 777 888 999',
    },
  })

  // Backend Developer
  const user4 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Cooper',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Backend Developer',
      company: 'TechCorp',
      location: 'Poznań, Polska',
      bio: 'Ekspertka od architektury systemów i baz danych.',
      phone: '+48 444 555 666',
    },
  })

  // DevOps Engineer
  const user5 = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'DevOps Engineer',
      company: 'CloudTech',
      location: 'Łódź, Polska',
      bio: 'Specjalista od automatyzacji i infrastruktury chmurowej.',
      phone: '+48 333 222 111',
      website: 'https://charlie-devops.com',
    },
  })

  // Create teams with different configurations
  const mainTeam = await prisma.team.upsert({
    where: { id: 'team-main' },
    update: {},
    create: {
      id: 'team-main',
      name: 'Main Development Team',
      members: {
        connect: [
          { id: adminUser.id },
          { id: user1.id },
          { id: user2.id },
          { id: user4.id }
        ]
      }
    },
  })

  const designTeam = await prisma.team.upsert({
    where: { id: 'team-design' },
    update: {},
    create: {
      id: 'team-design',
      name: 'Design & UX Team',
      members: {
        connect: [
          { id: user2.id },
          { id: user3.id }
        ]
      }
    },
  })

  const devopsTeam = await prisma.team.upsert({
    where: { id: 'team-devops' },
    update: {},
    create: {
      id: 'team-devops',
      name: 'DevOps & Infrastructure',
      members: {
        connect: [
          { id: user4.id },
          { id: user5.id }
        ]
      }
    },
  })

  // Create task statuses first - check if they exist to avoid conflicts
  const existingStatuses = await prisma.taskStatus.findMany()
  let taskStatuses = []

  if (existingStatuses.length === 0) {
    // Create default statuses if none exist
    const statusData = [
      { name: 'To Do', color: '#6B7280', order: 0, isDefault: true },
      { name: 'In Progress', color: '#3B82F6', order: 1, isDefault: false },
      { name: 'In Review', color: '#F59E0B', order: 2, isDefault: false },
      { name: 'Testing', color: '#8B5CF6', order: 3, isDefault: false },
      { name: 'Done', color: '#10B981', order: 4, isDefault: false },
      { name: 'Blocked', color: '#EF4444', order: 5, isDefault: false },
    ]

    for (const status of statusData) {
      const createdStatus = await prisma.taskStatus.create({ data: status })
      taskStatuses.push(createdStatus)
    }
  } else {
    // Use existing statuses
    taskStatuses = existingStatuses.sort((a, b) => a.order - b.order)

    // Ensure we have all required statuses
    const requiredStatuses = ['To Do', 'In Progress', 'In Review', 'Testing', 'Done', 'Blocked']
    for (const statusName of requiredStatuses) {
      if (!taskStatuses.find(s => s.name === statusName)) {
        const maxOrder = Math.max(...taskStatuses.map(s => s.order), -1)
        const newStatus = await prisma.taskStatus.create({
          data: {
            name: statusName,
            color: statusName === 'To Do' ? '#6B7280' :
                   statusName === 'In Progress' ? '#3B82F6' :
                   statusName === 'In Review' ? '#F59E0B' :
                   statusName === 'Testing' ? '#8B5CF6' :
                   statusName === 'Done' ? '#10B981' : '#EF4444',
            order: maxOrder + 1,
            isDefault: statusName === 'To Do',
          }
        })
        taskStatuses.push(newStatus)
      }
    }
    taskStatuses.sort((a, b) => a.order - b.order)
  }

  // Create diverse projects
  const project1 = await prisma.project.upsert({
    where: { id: 'project-nexus' },
    update: {},
    create: {
      id: 'project-nexus',
      name: 'Nexus - Project Management Platform',
      description: 'Kompleksowa platforma do zarządzania projektami z funkcjami śledzenia czasu, zadań i zespołów.',
      readme: '# Nexus Project Management\n\nNowoczesna platforma do zarządzania projektami...',
      status: 'In Progress',
      color: '#3B82F6',
      icon: '🚀',
      repositoryUrl: 'https://github.com/company/nexus',
      databaseUrl: 'postgresql://localhost:5432/nexus',
      serverUrl: 'https://nexus-api.company.com',
      apiUrl: 'https://api.nexus.company.com',
      stagingUrl: 'https://staging.nexus.company.com',
      productionUrl: 'https://nexus.company.com',
      credentials: 'Admin: admin@nexus.com / SecurePass123',
      teamId: mainTeam.id,
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: 'project-mobile' },
    update: {},
    create: {
      id: 'project-mobile',
      name: 'Nexus Mobile App',
      description: 'Aplikacja mobilna dla platformy Nexus z funkcjami offline i synchronizacji.',
      readme: '# Nexus Mobile\n\nAplikacja mobilna React Native...',
      status: 'Planning',
      color: '#10B981',
      icon: '📱',
      repositoryUrl: 'https://github.com/company/nexus-mobile',
      teamId: designTeam.id,
    },
  })

  const project3 = await prisma.project.upsert({
    where: { id: 'project-analytics' },
    update: {},
    create: {
      id: 'project-analytics',
      name: 'Analytics Dashboard',
      description: 'Dashboard analityczny z raportami i wizualizacjami danych projektowych.',
      readme: '# Analytics Dashboard\n\nSystem raportowania i analityki...',
      status: 'In Progress',
      color: '#8B5CF6',
      icon: '📊',
      repositoryUrl: 'https://github.com/company/analytics',
      apiUrl: 'https://analytics-api.company.com',
      productionUrl: 'https://analytics.company.com',
      teamId: mainTeam.id,
    },
  })

  const project4 = await prisma.project.upsert({
    where: { id: 'project-infrastructure' },
    update: {},
    create: {
      id: 'project-infrastructure',
      name: 'Cloud Infrastructure',
      description: 'Infrastruktura chmurowa i automatyzacja deploymentów.',
      readme: '# Infrastructure as Code\n\nKonfiguracja infrastruktury AWS...',
      status: 'Maintenance',
      color: '#F59E0B',
      icon: '☁️',
      repositoryUrl: 'https://github.com/company/infrastructure',
      serverUrl: 'https://aws.amazon.com/console',
      teamId: devopsTeam.id,
    },
  })

  // Create diverse tasks with different statuses and priorities
  const tasks = [
    // Nexus Platform tasks
    {
      id: 'task-auth',
      title: 'Implement user authentication system',
      description: 'Set up NextAuth.js with multiple providers (Google, GitHub, email/password). Include role-based access control and session management.',
      statusId: taskStatuses[4].id, // Done
      priority: 'High',
      estimatedHours: 12,
      projectId: project1.id,
      assigneeId: user1.id,
      createdById: adminUser.id,
      dueDate: new Date('2025-07-15T17:00:00Z'),
      startTime: new Date('2025-07-10T09:00:00Z'),
      endTime: new Date('2025-07-15T17:00:00Z'),
    },
    {
      id: 'task-dashboard',
      title: 'Create main project dashboard',
      description: 'Build responsive dashboard with real-time statistics, charts, and project overview widgets.',
      statusId: taskStatuses[1].id, // In Progress
      priority: 'High',
      estimatedHours: 16,
      projectId: project1.id,
      assigneeId: user2.id,
      createdById: user1.id,
      dueDate: new Date('2025-08-05T18:00:00Z'),
      startTime: new Date('2025-07-25T09:00:00Z'),
    },
    {
      id: 'task-api',
      title: 'Design and implement REST API',
      description: 'Create comprehensive REST API with OpenAPI documentation, rate limiting, and error handling.',
      statusId: taskStatuses[2].id, // In Review
      priority: 'High',
      estimatedHours: 20,
      projectId: project1.id,
      assigneeId: user4.id,
      createdById: user1.id,
      dueDate: new Date('2025-08-10T16:00:00Z'),
      startTime: new Date('2025-07-20T09:00:00Z'),
    },
    {
      id: 'task-time-tracking',
      title: 'Implement advanced time tracking',
      description: 'Add time tracking with automatic detection, manual entries, reporting, and export functionality.',
      statusId: taskStatuses[0].id, // To Do
      priority: 'Medium',
      estimatedHours: 14,
      projectId: project1.id,
      assigneeId: user1.id,
      createdById: user2.id,
      dueDate: new Date('2025-08-15T17:00:00Z'),
    },
    {
      id: 'task-notifications',
      title: 'Build notification system',
      description: 'Real-time notifications with email, in-app, and push notification support.',
      statusId: taskStatuses[0].id, // To Do
      priority: 'Medium',
      estimatedHours: 10,
      projectId: project1.id,
      assigneeId: user4.id,
      createdById: adminUser.id,
      dueDate: new Date('2025-08-20T15:00:00Z'),
    },

    // Mobile App tasks
    {
      id: 'task-mobile-wireframes',
      title: 'Create mobile app wireframes',
      description: 'Design wireframes for all main screens including navigation flow and user interactions.',
      statusId: taskStatuses[4].id, // Done
      priority: 'High',
      estimatedHours: 8,
      projectId: project2.id,
      assigneeId: user3.id,
      createdById: user2.id,
      dueDate: new Date('2025-07-20T17:00:00Z'),
      startTime: new Date('2025-07-15T09:00:00Z'),
      endTime: new Date('2025-07-20T17:00:00Z'),
    },
    {
      id: 'task-mobile-prototype',
      title: 'Build interactive prototype',
      description: 'Create clickable prototype in Figma with all user flows and micro-interactions.',
      statusId: taskStatuses[3].id, // Testing
      priority: 'High',
      estimatedHours: 12,
      projectId: project2.id,
      assigneeId: user3.id,
      createdById: user2.id,
      dueDate: new Date('2025-08-01T16:00:00Z'),
      startTime: new Date('2025-07-22T09:00:00Z'),
    },
    {
      id: 'task-mobile-setup',
      title: 'Setup React Native project',
      description: 'Initialize React Native project with navigation, state management, and development tools.',
      statusId: taskStatuses[0].id, // To Do
      priority: 'High',
      estimatedHours: 6,
      projectId: project2.id,
      assigneeId: user2.id,
      createdById: user1.id,
      dueDate: new Date('2025-08-05T14:00:00Z'),
    },

    // Analytics Dashboard tasks
    {
      id: 'task-analytics-charts',
      title: 'Implement data visualization charts',
      description: 'Create interactive charts using Chart.js or D3.js for project metrics and KPIs.',
      statusId: taskStatuses[1].id, // In Progress
      priority: 'Medium',
      estimatedHours: 15,
      projectId: project3.id,
      assigneeId: user4.id,
      createdById: adminUser.id,
      dueDate: new Date('2025-08-12T18:00:00Z'),
      startTime: new Date('2025-07-28T09:00:00Z'),
    },
    {
      id: 'task-analytics-reports',
      title: 'Build automated reporting system',
      description: 'Create system for generating and scheduling automated reports with PDF export.',
      statusId: taskStatuses[0].id, // To Do
      priority: 'Low',
      estimatedHours: 18,
      projectId: project3.id,
      assigneeId: user4.id,
      createdById: user1.id,
      dueDate: new Date('2025-08-25T17:00:00Z'),
    },

    // Infrastructure tasks
    {
      id: 'task-docker-setup',
      title: 'Containerize applications with Docker',
      description: 'Create Docker containers for all services with multi-stage builds and optimization.',
      statusId: taskStatuses[4].id, // Done
      priority: 'High',
      estimatedHours: 8,
      projectId: project4.id,
      assigneeId: user5.id,
      createdById: adminUser.id,
      dueDate: new Date('2025-07-25T17:00:00Z'),
      startTime: new Date('2025-07-20T09:00:00Z'),
      endTime: new Date('2025-07-25T17:00:00Z'),
    },
    {
      id: 'task-ci-cd',
      title: 'Setup CI/CD pipeline',
      description: 'Implement automated testing, building, and deployment pipeline using GitHub Actions.',
      statusId: taskStatuses[2].id, // In Review
      priority: 'High',
      estimatedHours: 12,
      projectId: project4.id,
      assigneeId: user5.id,
      createdById: user1.id,
      dueDate: new Date('2025-08-08T16:00:00Z'),
      startTime: new Date('2025-07-26T09:00:00Z'),
    },
    {
      id: 'task-monitoring',
      title: 'Implement monitoring and logging',
      description: 'Setup comprehensive monitoring with Prometheus, Grafana, and centralized logging.',
      statusId: taskStatuses[0].id, // To Do
      priority: 'Medium',
      estimatedHours: 16,
      projectId: project4.id,
      assigneeId: user5.id,
      createdById: adminUser.id,
      dueDate: new Date('2025-08-18T17:00:00Z'),
    },

    // Blocked task example
    {
      id: 'task-blocked',
      title: 'Integrate payment gateway',
      description: 'Integrate Stripe payment system for subscription management.',
      statusId: taskStatuses[5].id, // Blocked
      priority: 'High',
      estimatedHours: 10,
      projectId: project1.id,
      assigneeId: user4.id,
      createdById: adminUser.id,
      dueDate: new Date('2025-08-30T15:00:00Z'),
      isBlocked: true,
      blockReason: 'Waiting for legal approval and compliance review',
      blockedAt: new Date('2025-07-28T10:00:00Z'),
      blockedById: adminUser.id,
    },
  ]

  // Create all tasks
  for (const taskData of tasks) {
    await prisma.task.upsert({
      where: { id: taskData.id },
      update: {},
      create: taskData,
    })
  }

  // Create subtasks for complex tasks
  const subtasks = [
    // Authentication subtasks
    { title: 'Setup NextAuth configuration', isCompleted: true, taskId: 'task-auth' },
    { title: 'Implement Google OAuth provider', isCompleted: true, taskId: 'task-auth' },
    { title: 'Implement GitHub OAuth provider', isCompleted: true, taskId: 'task-auth' },
    { title: 'Create user registration flow', isCompleted: true, taskId: 'task-auth' },
    { title: 'Add role-based access control', isCompleted: true, taskId: 'task-auth' },
    { title: 'Implement session management', isCompleted: true, taskId: 'task-auth' },

    // Dashboard subtasks
    { title: 'Design dashboard layout', isCompleted: true, taskId: 'task-dashboard' },
    { title: 'Implement project statistics widgets', isCompleted: true, taskId: 'task-dashboard' },
    { title: 'Add real-time data updates', isCompleted: false, taskId: 'task-dashboard' },
    { title: 'Create responsive design', isCompleted: false, taskId: 'task-dashboard' },
    { title: 'Add data export functionality', isCompleted: false, taskId: 'task-dashboard' },

    // API subtasks
    { title: 'Design API endpoints structure', isCompleted: true, taskId: 'task-api' },
    { title: 'Implement user management endpoints', isCompleted: true, taskId: 'task-api' },
    { title: 'Implement project management endpoints', isCompleted: true, taskId: 'task-api' },
    { title: 'Add OpenAPI documentation', isCompleted: false, taskId: 'task-api' },
    { title: 'Implement rate limiting', isCompleted: false, taskId: 'task-api' },
    { title: 'Add comprehensive error handling', isCompleted: false, taskId: 'task-api' },

    // Mobile wireframes subtasks
    { title: 'Create login screen wireframe', isCompleted: true, taskId: 'task-mobile-wireframes' },
    { title: 'Create dashboard wireframe', isCompleted: true, taskId: 'task-mobile-wireframes' },
    { title: 'Create task management wireframes', isCompleted: true, taskId: 'task-mobile-wireframes' },
    { title: 'Create settings wireframes', isCompleted: true, taskId: 'task-mobile-wireframes' },

    // CI/CD subtasks
    { title: 'Setup GitHub Actions workflow', isCompleted: true, taskId: 'task-ci-cd' },
    { title: 'Configure automated testing', isCompleted: true, taskId: 'task-ci-cd' },
    { title: 'Setup staging deployment', isCompleted: false, taskId: 'task-ci-cd' },
    { title: 'Setup production deployment', isCompleted: false, taskId: 'task-ci-cd' },
  ]

  for (const subtask of subtasks) {
    await prisma.subtask.create({ data: subtask })
  }

  // Create comments for tasks
  const comments = [
    {
      content: 'Świetna robota z implementacją OAuth! Wszystko działa płynnie.',
      taskId: 'task-auth',
      authorId: adminUser.id,
      createdAt: new Date('2025-07-16T10:30:00Z'),
    },
    {
      content: 'Dodałem dokumentację do README. Proszę o review przed mergem.',
      taskId: 'task-auth',
      authorId: user1.id,
      createdAt: new Date('2025-07-16T14:15:00Z'),
    },
    {
      content: 'Dashboard wygląda świetnie! Może warto dodać więcej kolorów do wykresów?',
      taskId: 'task-dashboard',
      authorId: user3.id,
      createdAt: new Date('2025-07-30T09:45:00Z'),
    },
    {
      content: 'Zgadzam się z sugestią. Pracuję nad paletą kolorów zgodną z brand guidelines.',
      taskId: 'task-dashboard',
      authorId: user2.id,
      createdAt: new Date('2025-07-30T11:20:00Z'),
    },
    {
      content: 'API endpoints są gotowe do testowania. Dokumentacja w Swagger UI.',
      taskId: 'task-api',
      authorId: user4.id,
      createdAt: new Date('2025-07-29T16:00:00Z'),
    },
    {
      content: 'Znalazłem mały bug w endpoint\'cie /api/projects. Utworzyłem issue na GitHubie.',
      taskId: 'task-api',
      authorId: user1.id,
      createdAt: new Date('2025-07-30T08:30:00Z'),
    },
    {
      content: 'Wireframes zatwierdzone przez klienta. Możemy przechodzić do prototypowania.',
      taskId: 'task-mobile-wireframes',
      authorId: user2.id,
      createdAt: new Date('2025-07-21T13:45:00Z'),
    },
    {
      content: 'Czekamy na dokumenty prawne od działu compliance. Może potrwać 2-3 tygodnie.',
      taskId: 'task-blocked',
      authorId: adminUser.id,
      createdAt: new Date('2025-07-28T11:00:00Z'),
    },
  ]

  for (const comment of comments) {
    await prisma.comment.create({ data: comment })
  }

  // Create comprehensive time entries
  const timeEntries = [
    // Authentication task - completed
    {
      hours: 3.0,
      description: 'Initial NextAuth setup and configuration',
      date: new Date('2025-07-10'),
      taskId: 'task-auth',
      userId: user1.id,
    },
    {
      hours: 2.5,
      description: 'Implemented Google OAuth provider',
      date: new Date('2025-07-11'),
      taskId: 'task-auth',
      userId: user1.id,
    },
    {
      hours: 2.0,
      description: 'Added GitHub OAuth provider',
      date: new Date('2025-07-12'),
      taskId: 'task-auth',
      userId: user1.id,
    },
    {
      hours: 4.0,
      description: 'Created user registration and login flows',
      date: new Date('2025-07-13'),
      taskId: 'task-auth',
      userId: user1.id,
    },
    {
      hours: 1.5,
      description: 'Bug fixes and testing',
      date: new Date('2025-07-15'),
      taskId: 'task-auth',
      userId: user1.id,
    },

    // Dashboard task - in progress
    {
      hours: 4.0,
      description: 'Dashboard layout design and component structure',
      date: new Date('2025-07-25'),
      taskId: 'task-dashboard',
      userId: user2.id,
    },
    {
      hours: 3.5,
      description: 'Implemented project statistics widgets',
      date: new Date('2025-07-26'),
      taskId: 'task-dashboard',
      userId: user2.id,
    },
    {
      hours: 2.0,
      description: 'Added charts and data visualization',
      date: new Date('2025-07-29'),
      taskId: 'task-dashboard',
      userId: user2.id,
    },
    {
      hours: 3.0,
      description: 'Working on real-time updates integration',
      date: new Date('2025-07-30'),
      taskId: 'task-dashboard',
      userId: user2.id,
    },

    // API task - in review
    {
      hours: 5.0,
      description: 'API architecture design and endpoint planning',
      date: new Date('2025-07-20'),
      taskId: 'task-api',
      userId: user4.id,
    },
    {
      hours: 4.5,
      description: 'Implemented user management endpoints',
      date: new Date('2025-07-22'),
      taskId: 'task-api',
      userId: user4.id,
    },
    {
      hours: 6.0,
      description: 'Implemented project and task management endpoints',
      date: new Date('2025-07-24'),
      taskId: 'task-api',
      userId: user4.id,
    },
    {
      hours: 2.5,
      description: 'Added validation and error handling',
      date: new Date('2025-07-26'),
      taskId: 'task-api',
      userId: user4.id,
    },
    {
      hours: 2.0,
      description: 'Created OpenAPI documentation',
      date: new Date('2025-07-28'),
      taskId: 'task-api',
      userId: user4.id,
    },

    // Mobile wireframes - completed
    {
      hours: 2.5,
      description: 'Research and competitive analysis',
      date: new Date('2025-07-15'),
      taskId: 'task-mobile-wireframes',
      userId: user3.id,
    },
    {
      hours: 3.0,
      description: 'Created login and onboarding wireframes',
      date: new Date('2025-07-16'),
      taskId: 'task-mobile-wireframes',
      userId: user3.id,
    },
    {
      hours: 2.5,
      description: 'Dashboard and navigation wireframes',
      date: new Date('2025-07-18'),
      taskId: 'task-mobile-wireframes',
      userId: user3.id,
    },

    // Mobile prototype - in testing
    {
      hours: 4.0,
      description: 'Started interactive prototype in Figma',
      date: new Date('2025-07-22'),
      taskId: 'task-mobile-prototype',
      userId: user3.id,
    },
    {
      hours: 3.5,
      description: 'Added micro-interactions and animations',
      date: new Date('2025-07-24'),
      taskId: 'task-mobile-prototype',
      userId: user3.id,
    },
    {
      hours: 2.0,
      description: 'User testing and feedback incorporation',
      date: new Date('2025-07-26'),
      taskId: 'task-mobile-prototype',
      userId: user3.id,
    },

    // Analytics charts - in progress
    {
      hours: 3.0,
      description: 'Chart library evaluation and setup',
      date: new Date('2025-07-28'),
      taskId: 'task-analytics-charts',
      userId: user4.id,
    },
    {
      hours: 4.0,
      description: 'Implemented basic chart components',
      date: new Date('2025-07-29'),
      taskId: 'task-analytics-charts',
      userId: user4.id,
    },

    // Docker setup - completed
    {
      hours: 3.0,
      description: 'Created Dockerfiles for all services',
      date: new Date('2025-07-20'),
      taskId: 'task-docker-setup',
      userId: user5.id,
    },
    {
      hours: 2.5,
      description: 'Optimized Docker images and multi-stage builds',
      date: new Date('2025-07-22'),
      taskId: 'task-docker-setup',
      userId: user5.id,
    },
    {
      hours: 2.5,
      description: 'Created docker-compose configuration',
      date: new Date('2025-07-24'),
      taskId: 'task-docker-setup',
      userId: user5.id,
    },

    // CI/CD pipeline - in review
    {
      hours: 4.0,
      description: 'GitHub Actions workflow setup',
      date: new Date('2025-07-26'),
      taskId: 'task-ci-cd',
      userId: user5.id,
    },
    {
      hours: 3.0,
      description: 'Automated testing integration',
      date: new Date('2025-07-28'),
      taskId: 'task-ci-cd',
      userId: user5.id,
    },
    {
      hours: 2.0,
      description: 'Deployment scripts and configuration',
      date: new Date('2025-07-30'),
      taskId: 'task-ci-cd',
      userId: user5.id,
    },
  ]

  for (const entry of timeEntries) {
    await prisma.timeEntry.create({
      data: entry,
    })
  }

  // Create project documents
  const documents = [
    {
      filename: 'project-requirements.pdf',
      url: '/documents/nexus-requirements.pdf',
      mimeType: 'application/pdf',
      size: 2048576,
      description: 'Szczegółowe wymagania funkcjonalne i niefunkcjonalne dla platformy Nexus',
      category: 'Requirements',
      projectId: project1.id,
      uploadedById: adminUser.id,
    },
    {
      filename: 'api-documentation.md',
      url: '/documents/api-docs.md',
      mimeType: 'text/markdown',
      size: 512000,
      description: 'Dokumentacja API z przykładami użycia i schematami danych',
      category: 'Documentation',
      projectId: project1.id,
      uploadedById: user4.id,
    },
    {
      filename: 'design-system.fig',
      url: '/documents/design-system.fig',
      mimeType: 'application/figma',
      size: 15728640,
      description: 'Kompletny system designu z komponentami UI i wytycznymi',
      category: 'Design',
      projectId: project1.id,
      uploadedById: user3.id,
    },
    {
      filename: 'mobile-wireframes.pdf',
      url: '/documents/mobile-wireframes.pdf',
      mimeType: 'application/pdf',
      size: 8388608,
      description: 'Wireframes dla aplikacji mobilnej z opisami funkcjonalności',
      category: 'Design',
      projectId: project2.id,
      uploadedById: user3.id,
    },
    {
      filename: 'infrastructure-diagram.png',
      url: '/documents/infrastructure.png',
      mimeType: 'image/png',
      size: 1048576,
      description: 'Diagram architektury infrastruktury chmurowej',
      category: 'Architecture',
      projectId: project4.id,
      uploadedById: user5.id,
    },
    {
      filename: 'deployment-guide.md',
      url: '/documents/deployment-guide.md',
      mimeType: 'text/markdown',
      size: 256000,
      description: 'Przewodnik wdrażania aplikacji na środowiska staging i production',
      category: 'Documentation',
      projectId: project4.id,
      uploadedById: user5.id,
    },
  ]

  for (const doc of documents) {
    await prisma.projectDocument.create({ data: doc })
  }

  // Create system changes for the changelog
  const systemChanges = [
    {
      title: 'Nowy system zarządzania zadaniami',
      description: 'Wprowadziliśmy zaawansowany system zarządzania zadaniami z drag & drop, statusami niestandardowymi i automatycznym śledzeniem czasu.',
      type: 'success',
      isVisible: true,
      createdById: adminUser.id,
      createdAt: new Date('2025-07-30T10:00:00Z'),
    },
    {
      title: 'Ulepszona analityka projektów',
      description: 'Dodaliśmy nowe wykresy i raporty do dashboardu analitycznego. Teraz możesz śledzić postępy projektów w czasie rzeczywistym.',
      type: 'info',
      isVisible: true,
      createdById: adminUser.id,
      createdAt: new Date('2025-07-29T14:30:00Z'),
    },
    {
      title: 'Integracja z systemami CI/CD',
      description: 'Platforma została zintegrowana z GitHub Actions i automatycznymi deploymentami. Wszystkie zmiany są teraz automatycznie testowane.',
      type: 'success',
      isVisible: true,
      createdById: user5.id,
      createdAt: new Date('2025-07-28T16:45:00Z'),
    },
    {
      title: 'Nowe funkcje mobilne w przygotowaniu',
      description: 'Pracujemy nad aplikacją mobilną z pełną funkcjonalnością offline. Spodziewaj się beta testów w sierpniu.',
      type: 'info',
      isVisible: true,
      createdById: user3.id,
      createdAt: new Date('2025-07-27T09:15:00Z'),
    },
    {
      title: 'Planowana przerwa techniczna',
      description: 'W najbliższą sobotę (3 sierpnia) planujemy krótką przerwę techniczną w godzinach 2:00-4:00 w celu aktualizacji serwerów.',
      type: 'warning',
      isVisible: true,
      createdById: adminUser.id,
      createdAt: new Date('2025-07-26T11:00:00Z'),
    },
    {
      title: 'Nowe funkcje bezpieczeństwa',
      description: 'Dodaliśmy dwuskładnikowe uwierzytelnianie (2FA) i zaawansowane zarządzanie sesjami dla zwiększenia bezpieczeństwa.',
      type: 'success',
      isVisible: true,
      createdById: user1.id,
      createdAt: new Date('2025-07-25T13:20:00Z'),
    },
  ]

  for (const change of systemChanges) {
    await prisma.systemChange.create({ data: change })
  }

  // Create some todos for tasks
  const todos = [
    { title: 'Przygotować dokumentację API', isCompleted: true, taskId: 'task-api' },
    { title: 'Napisać testy jednostkowe', isCompleted: false, taskId: 'task-api' },
    { title: 'Przeprowadzić code review', isCompleted: false, taskId: 'task-api' },
    { title: 'Zaktualizować README', isCompleted: true, taskId: 'task-dashboard' },
    { title: 'Dodać testy E2E', isCompleted: false, taskId: 'task-dashboard' },
    { title: 'Optymalizować wydajność', isCompleted: false, taskId: 'task-dashboard' },
    { title: 'Przygotować prezentację dla klienta', isCompleted: true, taskId: 'task-mobile-prototype' },
    { title: 'Zebrać feedback od użytkowników', isCompleted: false, taskId: 'task-mobile-prototype' },
  ]

  for (const todo of todos) {
    await prisma.todo.create({ data: todo })
  }

  // Create chat rooms and messages
  console.log('Creating chat rooms and messages...')

  // 1. General team chat room
  const generalChatRoom = await prisma.chatRoom.upsert({
    where: { id: 'chat-general' },
    update: {},
    create: {
      id: 'chat-general',
      name: 'Ogólny',
      type: 'group',
      createdById: adminUser.id,
    },
  })

  // Add all users to general chat
  const allUsers = [adminUser, user1, user2, user3, user4, user5]
  for (const user of allUsers) {
    await prisma.userChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId: user.id,
          chatRoomId: generalChatRoom.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        chatRoomId: generalChatRoom.id,
        joinedAt: new Date('2025-07-25T09:00:00Z'),
        lastReadAt: new Date('2025-08-02T16:00:00Z'),
      },
    })
  }

  // 2. Project-specific chat rooms
  const nexusProjectChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-nexus-project' },
    update: {},
    create: {
      id: 'chat-nexus-project',
      name: 'Nexus - Dyskusja projektu',
      type: 'project',
      projectId: project1.id,
      createdById: adminUser.id,
    },
  })

  // Add main team members to Nexus project chat
  const nexusTeamMembers = [adminUser, user1, user2, user4]
  for (const user of nexusTeamMembers) {
    await prisma.userChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId: user.id,
          chatRoomId: nexusProjectChat.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        chatRoomId: nexusProjectChat.id,
        joinedAt: new Date('2025-07-26T10:00:00Z'),
        lastReadAt: new Date('2025-08-02T15:30:00Z'),
      },
    })
  }

  const mobileAppChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-mobile-app' },
    update: {},
    create: {
      id: 'chat-mobile-app',
      name: 'Mobile App - Sprint Planning',
      type: 'project',
      projectId: project2.id,
      createdById: user1.id,
    },
  })

  // Add mobile team members
  const mobileTeamMembers = [user1, user2, user3]
  for (const user of mobileTeamMembers) {
    await prisma.userChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId: user.id,
          chatRoomId: mobileAppChat.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        chatRoomId: mobileAppChat.id,
        joinedAt: new Date('2025-07-27T11:00:00Z'),
        lastReadAt: new Date('2025-08-02T14:45:00Z'),
      },
    })
  }

  // 3. Design team chat
  const designTeamChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-design-team' },
    update: {},
    create: {
      id: 'chat-design-team',
      name: 'Design Team',
      type: 'group',
      createdById: user3.id,
    },
  })

  // Add design team members
  const designMembers = [user3, user2, adminUser]
  for (const user of designMembers) {
    await prisma.userChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId: user.id,
          chatRoomId: designTeamChat.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        chatRoomId: designTeamChat.id,
        joinedAt: new Date('2025-07-28T12:00:00Z'),
        lastReadAt: new Date('2025-08-02T13:20:00Z'),
      },
    })
  }

  // 4. Direct message chat between admin and user1
  const directChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-direct-admin-john' },
    update: {},
    create: {
      id: 'chat-direct-admin-john',
      name: null, // Direct chats don't have names
      type: 'direct',
      createdById: adminUser.id,
    },
  })

  // Add both users to direct chat
  for (const user of [adminUser, user1]) {
    await prisma.userChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId: user.id,
          chatRoomId: directChat.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        chatRoomId: directChat.id,
        joinedAt: new Date('2025-07-29T13:00:00Z'),
        lastReadAt: new Date('2025-08-02T17:00:00Z'),
      },
    })
  }

  // Create messages for chat rooms
  console.log('Creating chat messages...')

  // Messages for general chat room
  const generalMessages = [
    {
      content: 'Witajcie wszystkich! 👋 Miło Was poznać w naszym zespole.',
      senderId: adminUser.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-25T09:15:00Z'),
    },
    {
      content: 'Cześć @[' + adminUser.id + ']! Dziękuję za ciepłe powitanie. Cieszę się, że mogę być częścią zespołu! 🚀',
      senderId: user1.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-25T09:20:00Z'),
    },
    {
      content: 'Hej wszystkim! Jestem Jane, frontend developer. Mam nadzieję na świetną współpracę! ✨',
      senderId: user2.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-25T09:25:00Z'),
    },
    {
      content: 'Cześć! Bob tutaj, UI/UX designer. Już nie mogę się doczekać pracy nad nowymi projektami! 🎨',
      senderId: user3.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-25T09:30:00Z'),
    },
    {
      content: 'Witam! Alice, backend developer. Gotowa na nowe wyzwania! 💻',
      senderId: user4.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-25T09:35:00Z'),
    },
    {
      content: 'Hej! Charlie z DevOps. Jeśli będziecie potrzebować pomocy z infrastrukturą, jestem do dyspozycji! ⚙️',
      senderId: user5.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-25T09:40:00Z'),
    },
    {
      content: 'Świetnie! Mamy kompletny zespół. Jutro o 10:00 mamy pierwsze spotkanie planistyczne. Przygotujcie się! 📅',
      senderId: adminUser.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-25T10:00:00Z'),
    },
    {
      content: 'Czy ktoś wie gdzie znajdę dokumentację API? Chciałbym się przygotować przed jutrzejszym spotkaniem.',
      senderId: user2.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-08-01T14:30:00Z'),
    },
    {
      content: '@[' + user2.id + '] Dokumentacja jest w repozytorium w folderze /docs. Mogę Ci też wysłać link na priv.',
      senderId: user4.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-08-01T14:35:00Z'),
    },
    {
      content: 'Dzięki @[' + user4.id + ']! To będzie bardzo pomocne 🙏',
      senderId: user2.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-08-01T14:37:00Z'),
    },
    {
      content: 'Przypominam o dzisiejszym daily standup o 9:00. Przygotujcie updates! ⏰',
      senderId: adminUser.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-08-02T08:45:00Z'),
    },
  ]

  // Messages for Nexus project chat
  const nexusMessages = [
    {
      content: 'Rozpoczynamy prace nad projektem Nexus! 🚀 To będzie nasza flagowa platforma.',
      senderId: adminUser.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-07-26T10:15:00Z'),
    },
    {
      content: 'Świetnie! Przejrzałem wymagania i mam kilka pytań dotyczących architektury bazy danych.',
      senderId: user4.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-07-26T10:30:00Z'),
    },
    {
      content: '@[' + user4.id + '] Umówmy się na osobne spotkanie techniczne. Jutro o 14:00?',
      senderId: adminUser.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-07-26T10:35:00Z'),
    },
    {
      content: 'Idealnie! Przygotuje listę pytań i propozycji.',
      senderId: user4.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-07-26T10:37:00Z'),
    },
    {
      content: 'Czy mamy już gotowe mockupy interfejsu? Chciałbym zacząć pracę nad komponentami.',
      senderId: user2.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-07-28T11:00:00Z'),
    },
    {
      content: '@[' + user2.id + '] Mockupy będą gotowe do końca tygodnia. Na razie możesz przygotować podstawową strukturę.',
      senderId: user1.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-07-28T11:15:00Z'),
    },
    {
      content: 'Update: API dla zarządzania użytkownikami jest gotowe! 🎉 Można zacząć integrację.',
      senderId: user4.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-08-01T16:00:00Z'),
    },
    {
      content: 'Fantastycznie @[' + user4.id + ']! Zacznę testy integracyjne jutro rano.',
      senderId: user1.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-08-01T16:05:00Z'),
    },
    {
      content: 'Mam problem z responsywnością dashboardu. @[' + user1.id + '] możesz rzucić okiem?',
      senderId: user2.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-08-02T13:30:00Z'),
    },
    {
      content: 'Jasne! Spojrzę po lunch. Wyślij mi link do branch-a.',
      senderId: user1.id,
      chatRoomId: nexusProjectChat.id,
      createdAt: new Date('2025-08-02T13:35:00Z'),
    },
  ]

  // Messages for mobile app chat
  const mobileMessages = [
    {
      content: 'Czas na sprint planning dla aplikacji mobilnej! 📱',
      senderId: user1.id,
      chatRoomId: mobileAppChat.id,
      createdAt: new Date('2025-07-27T11:15:00Z'),
    },
    {
      content: 'Mam gotowe wireframes dla głównych ekranów. Mogę je zaprezentować.',
      senderId: user3.id,
      chatRoomId: mobileAppChat.id,
      createdAt: new Date('2025-07-27T11:20:00Z'),
    },
    {
      content: 'Super @[' + user3.id + ']! Pokażesz je na dzisiejszym spotkaniu?',
      senderId: user2.id,
      chatRoomId: mobileAppChat.id,
      createdAt: new Date('2025-07-27T11:25:00Z'),
    },
    {
      content: 'Tak, przygotowałem prezentację. Będzie o 15:00 w sali konferencyjnej.',
      senderId: user3.id,
      chatRoomId: mobileAppChat.id,
      createdAt: new Date('2025-07-27T11:30:00Z'),
    },
    {
      content: 'Pytanie: czy używamy React Native czy Flutter?',
      senderId: user2.id,
      chatRoomId: mobileAppChat.id,
      createdAt: new Date('2025-07-29T09:00:00Z'),
    },
    {
      content: 'React Native. Mamy już doświadczenie z tym frameworkiem w zespole.',
      senderId: user1.id,
      chatRoomId: mobileAppChat.id,
      createdAt: new Date('2025-07-29T09:05:00Z'),
    },
    {
      content: 'Świetnie! Zacznę setup projektu. Potrzebuję dostępu do repo.',
      senderId: user2.id,
      chatRoomId: mobileAppChat.id,
      createdAt: new Date('2025-07-29T09:10:00Z'),
    },
    {
      content: 'Wysłałem zaproszenie. Sprawdź email! 📧',
      senderId: user1.id,
      chatRoomId: mobileAppChat.id,
      createdAt: new Date('2025-07-29T09:15:00Z'),
    },
  ]

  // Messages for design team chat
  const designMessages = [
    {
      content: 'Witajcie w kanale design team! 🎨 Tutaj będziemy omawiać wszystkie kwestie designu.',
      senderId: user3.id,
      chatRoomId: designTeamChat.id,
      createdAt: new Date('2025-07-28T12:15:00Z'),
    },
    {
      content: 'Cześć @[' + user3.id + ']! Cieszę się, że mogę współpracować z zespołem design.',
      senderId: user2.id,
      chatRoomId: designTeamChat.id,
      createdAt: new Date('2025-07-28T12:20:00Z'),
    },
    {
      content: 'Mam pytanie o system kolorów. Czy mamy już zdefiniowaną paletę?',
      senderId: user2.id,
      chatRoomId: designTeamChat.id,
      createdAt: new Date('2025-07-30T10:00:00Z'),
    },
    {
      content: 'Tak! Mam przygotowany design system. Udostępnię link do Figmy.',
      senderId: user3.id,
      chatRoomId: designTeamChat.id,
      createdAt: new Date('2025-07-30T10:05:00Z'),
    },
    {
      content: 'https://figma.com/design-system-nexus - tutaj macie wszystko! 🔗',
      senderId: user3.id,
      chatRoomId: designTeamChat.id,
      createdAt: new Date('2025-07-30T10:07:00Z'),
    },
    {
      content: 'Świetnie! Przejrzę to i dam feedback do końca dnia.',
      senderId: adminUser.id,
      chatRoomId: designTeamChat.id,
      createdAt: new Date('2025-07-30T10:10:00Z'),
    },
    {
      content: 'Czy możemy dodać dark mode do design systemu? Użytkownicy często o to pytają.',
      senderId: user2.id,
      chatRoomId: designTeamChat.id,
      createdAt: new Date('2025-08-01T11:00:00Z'),
    },
    {
      content: 'Dobry pomysł @[' + user2.id + ']! Dodaję to do backlogu. Priorytet: średni.',
      senderId: user3.id,
      chatRoomId: designTeamChat.id,
      createdAt: new Date('2025-08-01T11:05:00Z'),
    },
  ]

  // Messages for direct chat
  const directMessages = [
    {
      content: 'Cześć John! Masz chwilę na rozmowę o architekturze projektu?',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-29T13:15:00Z'),
    },
    {
      content: 'Oczywiście! O czym konkretnie chciałbyś porozmawiać?',
      senderId: user1.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-29T13:20:00Z'),
    },
    {
      content: 'Zastanawiam się nad mikroserwisami vs monolit dla Nexus. Jakie masz zdanie?',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-29T13:25:00Z'),
    },
    {
      content: 'Na początek bym poszedł w monolit. Łatwiej będzie nam się rozwijać i debugować. Mikroserwisy możemy wprowadzić później gdy będziemy mieli więcej ruchu.',
      senderId: user1.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-29T13:30:00Z'),
    },
    {
      content: 'Zgadzam się! Modularny monolit to dobry kompromis. Dzięki za input! 👍',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-29T13:35:00Z'),
    },
    {
      content: 'Btw, jak Ci idzie z nowym zespołem? Wszyscy wydają się bardzo zaangażowani.',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-08-01T15:00:00Z'),
    },
    {
      content: 'Świetnie! Zespół jest naprawdę profesjonalny. Jane ma świetne pomysły na frontend, a Alice zna się na rzeczy z backendem.',
      senderId: user1.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-08-01T15:05:00Z'),
    },
    {
      content: 'A Bob? Jak oceniasz jego design skills?',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-08-01T15:10:00Z'),
    },
    {
      content: 'Bob ma świetne oko do detali. Jego wireframes są bardzo przemyślane. Myślę, że będzie świetnym dodatkiem do zespołu.',
      senderId: user1.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-08-01T15:15:00Z'),
    },
    {
      content: 'Cieszę się! Mam dobre przeczucia co do tego projektu 🚀',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-08-01T15:20:00Z'),
    },
  ]

  // Create all messages
  const allMessages = [
    ...generalMessages,
    ...nexusMessages,
    ...mobileMessages,
    ...designMessages,
    ...directMessages,
  ]

  for (const messageData of allMessages) {
    await prisma.message.create({
      data: messageData,
    })
  }

  // Update chat rooms with latest activity
  await prisma.chatRoom.update({
    where: { id: generalChatRoom.id },
    data: { updatedAt: new Date('2025-08-02T08:45:00Z') },
  })

  await prisma.chatRoom.update({
    where: { id: nexusProjectChat.id },
    data: { updatedAt: new Date('2025-08-02T13:35:00Z') },
  })

  await prisma.chatRoom.update({
    where: { id: mobileAppChat.id },
    data: { updatedAt: new Date('2025-07-29T09:15:00Z') },
  })

  await prisma.chatRoom.update({
    where: { id: designTeamChat.id },
    data: { updatedAt: new Date('2025-08-01T11:05:00Z') },
  })

  await prisma.chatRoom.update({
    where: { id: directChat.id },
    data: { updatedAt: new Date('2025-08-01T15:20:00Z') },
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n📊 Created data summary:')
  console.log(`👥 Users: ${[adminUser.email, user1.email, user2.email, user3.email, user4.email, user5.email].length}`)
  console.log(`🏢 Teams: ${[mainTeam.name, designTeam.name, devopsTeam.name].length}`)
  console.log(`📁 Projects: ${[project1.name, project2.name, project3.name, project4.name].length}`)
  console.log(`📋 Tasks: ${tasks.length}`)
  console.log(`📝 Subtasks: ${subtasks.length}`)
  console.log(`💬 Comments: ${comments.length}`)
  console.log(`⏱️ Time entries: ${timeEntries.length}`)
  console.log(`📄 Documents: ${documents.length}`)
  console.log(`🔄 System changes: ${systemChanges.length}`)
  console.log(`✅ Todos: ${todos.length}`)
  console.log(`🏷️ Task statuses: ${taskStatuses.length}`)
  console.log(`💭 Chat rooms: 5 (General, Nexus Project, Mobile App, Design Team, Direct)`)
  console.log(`📨 Chat messages: ${allMessages.length}`)

  console.log('\n🔑 Login credentials:')
  console.log('Admin: krystian@bpcoders.pl / admin123')
  console.log('Users: john@example.com, jane@example.com, bob@example.com, alice@example.com, charlie@example.com / password123')

  console.log('\n🎯 Sample data includes:')
  console.log('• Different user roles and detailed profiles')
  console.log('• Multiple teams with various specializations')
  console.log('• Diverse projects with different statuses and configurations')
  console.log('• Tasks in all possible statuses (To Do, In Progress, In Review, Testing, Done, Blocked)')
  console.log('• Comprehensive time tracking entries')
  console.log('• Subtasks and todos for task breakdown')
  console.log('• Comments and collaboration examples')
  console.log('• Project documents and attachments')
  console.log('• System changelog entries')
  console.log('• Real-world scenarios including blocked tasks and completed work')
  console.log('• Chat rooms: general team chat, project-specific chats, design team, direct messages')
  console.log('• Chat messages with mentions, emojis, and realistic team conversations')
  console.log('• User participation in multiple chat rooms with read status tracking')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
