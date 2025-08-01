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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
