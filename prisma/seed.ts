import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function main() {
  console.log('🌱 Seeding database with IT company data...')

  // Create users with different roles and profiles for an IT company
  const hashedPassword = await bcrypt.hash('password123', 10)
  const adminPassword = await bcrypt.hash('admin123', 12)

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@techsolutions.com' },
    update: {},
    create: {
      email: 'admin@techsolutions.com',
      name: 'Anna Kowalska',
      password: adminPassword,
      role: 'admin',
      jobTitle: 'CEO & Lead Architect',
      company: 'TechSolutions Inc.',
      location: 'Warszawa, Polska',
      bio: 'Założycielka i główny architekt w TechSolutions, z pasją do innowacyjnych rozwiązań IT.',
      phone: '+48 500 100 200',
      website: 'https://techsolutions.com',
    },
  })

  // Project Manager
  const user1 = await prisma.user.upsert({
    where: { email: 'marek.nowak@techsolutions.com' },
    update: {},
    create: {
      email: 'marek.nowak@techsolutions.com',
      name: 'Marek Nowak',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Senior Project Manager',
      company: 'TechSolutions Inc.',
      location: 'Kraków, Polska',
      bio: 'Doświadczony Project Manager z sukcesami w prowadzeniu złożonych projektów software\'owych.',
      phone: '+48 600 200 300',
    },
  })

  // Senior Frontend Developer
  const user2 = await prisma.user.upsert({
    where: { email: 'zofia.wisniewska@techsolutions.com' },
    update: {},
    create: {
      email: 'zofia.wisniewska@techsolutions.com',
      name: 'Zofia Wiśniewska',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Senior Frontend Developer',
      company: 'TechSolutions Inc.',
      location: 'Gdańsk, Polska',
      bio: 'Specjalistka od nowoczesnych technologii frontendowych i optymalizacji UX.',
      phone: '+48 700 300 400',
      website: 'https://zofia.dev',
    },
  })

  // Senior Backend Developer
  const user3 = await prisma.user.upsert({
    where: { email: 'piotr.dabrowski@techsolutions.com' },
    update: {},
    create: {
      email: 'piotr.dabrowski@techsolutions.com',
      name: 'Piotr Dąbrowski',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Senior Backend Developer',
      company: 'TechSolutions Inc.',
      location: 'Wrocław, Polska',
      bio: 'Architekt systemów backendowych, ekspert w skalowalnych rozwiązaniach chmurowych.',
      phone: '+48 800 400 500',
    },
  })

  // QA Engineer
  const user4 = await prisma.user.upsert({
    where: { email: 'katarzyna.zielinska@techsolutions.com' },
    update: {},
    create: {
      email: 'katarzyna.zielinska@techsolutions.com',
      name: 'Katarzyna Zielińska',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'QA Engineer',
      company: 'TechSolutions Inc.',
      location: 'Poznań, Polska',
      bio: 'Pasjonatka testowania oprogramowania, dbająca o najwyższą jakość produktów.',
      phone: '+48 900 500 600',
    },
  })

  // DevOps Engineer
  const user5 = await prisma.user.upsert({
    where: { email: 'tomasz.wojcik@techsolutions.com' },
    update: {},
    create: {
      email: 'tomasz.wojcik@techsolutions.com',
      name: 'Tomasz Wójcik',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'DevOps Engineer',
      company: 'TechSolutions Inc.',
      location: 'Łódź, Polska',
      bio: 'Automatyzacja, infrastruktura jako kod i ciągłe dostarczanie to jego specjalność.',
      phone: '+48 111 222 333',
      website: 'https://tomasz-devops.com',
    },
  })

  // Create teams for an IT company
  const frontendTeam = await prisma.team.upsert({
    where: { id: 'team-frontend' },
    update: {},
    create: {
      id: 'team-frontend',
      name: 'Frontend Development',
      members: {
        connect: [
          { id: adminUser.id },
          { id: user1.id }, // PM
          { id: user2.id }, // Senior FE
          { id: user4.id }  // QA
        ]
      }
    },
  })

  const backendTeam = await prisma.team.upsert({
    where: { id: 'team-backend' },
    update: {},
    create: {
      id: 'team-backend',
      name: 'Backend Services',
      members: {
        connect: [
          { id: adminUser.id },
          { id: user1.id }, // PM
          { id: user3.id }, // Senior BE
          { id: user4.id }  // QA
        ]
      }
    },
  })

  const devopsTeam = await prisma.team.upsert({
    where: { id: 'team-devops' },
    update: {},
    create: {
      id: 'team-devops',
      name: 'DevOps & Cloud',
      members: {
        connect: [
          { id: adminUser.id },
          { id: user1.id }, // PM
          { id: user5.id }  // DevOps
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
      { name: 'Backlog', color: '#6B7280', order: 0, isDefault: true },
      { name: 'In Progress', color: '#3B82F6', order: 1, isDefault: false },
      { name: 'Code Review', color: '#F59E0B', order: 2, isDefault: false },
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
    const requiredStatuses = ['Backlog', 'In Progress', 'Code Review', 'Testing', 'Done', 'Blocked']
    for (const statusName of requiredStatuses) {
      if (!taskStatuses.find(s => s.name === statusName)) {
        const maxOrder = Math.max(...taskStatuses.map(s => s.order), -1)
        const newStatus = await prisma.taskStatus.create({
          data: {
            name: statusName,
            color: statusName === 'Backlog' ? '#6B7280' :
                   statusName === 'In Progress' ? '#3B82F6' :
                   statusName === 'Code Review' ? '#F59E0B' :
                   statusName === 'Testing' ? '#8B5CF6' :
                   statusName === 'Done' ? '#10B981' : '#EF4444',
            order: maxOrder + 1,
            isDefault: statusName === 'Backlog',
          }
        })
        taskStatuses.push(newStatus)
      }
    }
    taskStatuses.sort((a, b) => a.order - b.order)
  }

  // Create IT-focused projects
  const project1 = await prisma.project.upsert({
    where: { id: 'project-ecommerce' },
    update: {},
    create: {
      id: 'project-ecommerce',
      name: 'E-commerce Platform Relaunch',
      description: 'Kompleksowa przebudowa platformy e-commerce dla klienta detalicznego, z nowym UX/UI i skalowalnym backendem.',
      readme: '# E-commerce Relaunch\n\nProjekt przebudowy platformy e-commerce...',
      status: 'In Progress',
      color: '#3B82F6',
      icon: '🛒',
      repositoryUrl: 'https://github.com/techsolutions/ecommerce-platform',
      databaseUrl: 'postgresql://localhost:5432/ecommerce_db',
      serverUrl: 'https://api.ecommerce.techsolutions.com',
      apiUrl: 'https://api.ecommerce.techsolutions.com',
      stagingUrl: 'https://staging.ecommerce.techsolutions.com',
      productionUrl: 'https://www.ecommerce-client.com',
      credentials: 'Admin: admin@ecommerce.com / SecurePass123',
      teamId: frontendTeam.id,
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: 'project-mobile-banking' },
    update: {},
    create: {
      id: 'project-mobile-banking',
      name: 'Mobile Banking App Development',
      description: 'Rozwój nowej aplikacji mobilnej dla banku, z naciskiem na bezpieczeństwo i intuicyjny interfejs.',
      readme: '# Mobile Banking App\n\nAplikacja mobilna React Native dla sektora bankowego...',
      status: 'Planning',
      color: '#10B981',
      icon: '🏦',
      repositoryUrl: 'https://github.com/techsolutions/mobile-banking-app',
      teamId: frontendTeam.id,
    },
  })

  const project3 = await prisma.project.upsert({
    where: { id: 'project-ai-chatbot' },
    update: {},
    create: {
      id: 'project-ai-chatbot',
      name: 'AI Chatbot Integration',
      description: 'Integracja zaawansowanego chatbota opartego na AI z systemem obsługi klienta.',
      readme: '# AI Chatbot\n\nProjekt integracji chatbota AI...',
      status: 'In Progress',
      color: '#8B5CF6',
      icon: '🤖',
      repositoryUrl: 'https://github.com/techsolutions/ai-chatbot',
      apiUrl: 'https://api.chatbot.techsolutions.com',
      productionUrl: 'https://chatbot.techsolutions.com',
      teamId: backendTeam.id,
    },
  })

  const project4 = await prisma.project.upsert({
    where: { id: 'project-cloud-migration' },
    update: {},
    create: {
      id: 'project-cloud-migration',
      name: 'Cloud Infrastructure Migration',
      description: 'Migracja istniejącej infrastruktury klienta do chmury AWS, z optymalizacją kosztów i wydajności.',
      readme: '# Cloud Migration\n\nMigracja do AWS...',
      status: 'Maintenance',
      color: '#F59E0B',
      icon: '☁️',
      repositoryUrl: 'https://github.com/techsolutions/cloud-migration',
      serverUrl: 'https://aws.amazon.com/console',
      teamId: devopsTeam.id,
    },
  })

  // Create diverse tasks with different statuses and priorities for IT projects
  const tasks = [
    // E-commerce Platform Relaunch tasks
    {
      id: 'task-ecommerce-frontend',
      title: 'Develop new product listing page (Frontend)',
      description: 'Implement responsive and performant product listing page with filtering and sorting capabilities.',
      statusId: taskStatuses[1].id, // In Progress
      priority: 'High',
      estimatedHours: 24,
      projectId: project1.id,
      assigneeId: user2.id, // Zofia Wiśniewska (Senior FE)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-15T17:00:00Z'),
      startTime: new Date('2025-08-05T09:00:00Z'),
    },
    {
      id: 'task-ecommerce-backend-api',
      title: 'Build Product API endpoints (Backend)',
      description: 'Create RESTful API for product data, including search, categories, and detailed product views.',
      statusId: taskStatuses[0].id, // Backlog
      priority: 'High',
      estimatedHours: 32,
      projectId: project1.id,
      assigneeId: user3.id, // Piotr Dąbrowski (Senior BE)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-20T18:00:00Z'),
    },
    {
      id: 'task-ecommerce-qa',
      title: 'Perform UAT for checkout process',
      description: 'Conduct User Acceptance Testing for the redesigned checkout flow, identify and report bugs.',
      statusId: taskStatuses[3].id, // Testing
      priority: 'Medium',
      estimatedHours: 16,
      projectId: project1.id,
      assigneeId: user4.id, // Katarzyna Zielińska (QA)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-10T16:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },
    {
      id: 'task-ecommerce-deployment',
      title: 'Prepare production deployment script',
      description: 'Automate deployment process for the new e-commerce platform to AWS production environment.',
      statusId: taskStatuses[0].id, // Backlog
      priority: 'Low',
      estimatedHours: 12,
      projectId: project1.id,
      assigneeId: user5.id, // Tomasz Wójcik (DevOps)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-08-25T17:00:00Z'),
    },

    // Mobile Banking App Development tasks
    {
      id: 'task-mobile-banking-ux',
      title: 'Design user flow for fund transfers',
      description: 'Create intuitive and secure user experience for transferring funds between accounts.',
      statusId: taskStatuses[4].id, // Done
      priority: 'High',
      estimatedHours: 16,
      projectId: project2.id,
      assigneeId: user2.id, // Zofia Wiśniewska (Senior FE - also UX focused)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-07-30T17:00:00Z'),
      startTime: new Date('2025-07-25T09:00:00Z'),
      endTime: new Date('2025-07-30T17:00:00Z'),
    },
    {
      id: 'task-mobile-banking-security',
      title: 'Implement biometric authentication',
      description: 'Integrate Face ID/Touch ID for secure login and transaction authorization.',
      statusId: taskStatuses[1].id, // In Progress
      priority: 'High',
      estimatedHours: 20,
      projectId: project2.id,
      assigneeId: user3.id, // Piotr Dąbrowski (Senior BE)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-12T16:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },

    // AI Chatbot Integration tasks
    {
      id: 'task-chatbot-nlp',
      title: 'Develop Natural Language Processing module',
      description: 'Train and fine-tune NLP models for understanding customer queries and intent recognition.',
      statusId: taskStatuses[1].id, // In Progress
      priority: 'High',
      estimatedHours: 40,
      projectId: project3.id,
      assigneeId: user3.id, // Piotr Dąbrowski (Senior BE)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-08-20T18:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },
    {
      id: 'task-chatbot-frontend',
      title: 'Integrate chatbot UI into client portal',
      description: 'Embed the chatbot widget into the existing client web portal and ensure seamless user experience.',
      statusId: taskStatuses[0].id, // Backlog
      priority: 'Medium',
      estimatedHours: 20,
      projectId: project3.id,
      assigneeId: user2.id, // Zofia Wiśniewska (Senior FE)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-28T17:00:00Z'),
    },

    // Cloud Infrastructure Migration tasks
    {
      id: 'task-cloud-audit',
      title: 'Perform current infrastructure audit',
      description: 'Analyze existing on-premise infrastructure, identify dependencies and migration strategy.',
      statusId: taskStatuses[4].id, // Done
      priority: 'High',
      estimatedHours: 24,
      projectId: project4.id,
      assigneeId: user5.id, // Tomasz Wójcik (DevOps)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-07-20T17:00:00Z'),
      startTime: new Date('2025-07-15T09:00:00Z'),
      endTime: new Date('2025-07-20T17:00:00Z'),
    },
    {
      id: 'task-cloud-vpc',
      title: 'Design and implement AWS VPC network',
      description: 'Set up secure and scalable Virtual Private Cloud (VPC) with subnets, routing, and security groups.',
      statusId: taskStatuses[1].id, // In Progress
      priority: 'High',
      estimatedHours: 30,
      projectId: project4.id,
      assigneeId: user5.id, // Tomasz Wójcik (DevOps)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-08-18T16:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },

    // Blocked task example
    {
      id: 'task-blocked-legal',
      title: 'Legal review for data privacy policy',
      description: 'Obtain legal approval for updated data privacy policy before deploying new features.',
      statusId: taskStatuses[5].id, // Blocked
      priority: 'High',
      estimatedHours: 8,
      projectId: project1.id,
      assigneeId: user1.id, // Marek Nowak (PM)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-08-30T15:00:00Z'),
      isBlocked: true,
      blockReason: 'Waiting for legal department approval on GDPR compliance.',
      blockedAt: new Date('2025-08-01T10:00:00Z'),
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
    // E-commerce Frontend subtasks
    { title: 'Implement product card component', isCompleted: true, taskId: 'task-ecommerce-frontend' },
    { title: 'Develop filtering logic (price, category, brand)', isCompleted: false, taskId: 'task-ecommerce-frontend' },
    { title: 'Integrate with backend product API', isCompleted: false, taskId: 'task-ecommerce-frontend' },

    // E-commerce QA subtasks
    { title: 'Test user registration and login', isCompleted: true, taskId: 'task-ecommerce-qa' },
    { title: 'Verify shopping cart functionality', isCompleted: true, taskId: 'task-ecommerce-qa' },
    { title: 'Test payment gateway integration', isCompleted: false, taskId: 'task-ecommerce-qa' },

    // Mobile Banking UX subtasks
    { title: 'Sketch wireframes for transfer flow', isCompleted: true, taskId: 'task-mobile-banking-ux' },
    { title: 'Create high-fidelity mockups', isCompleted: true, taskId: 'task-mobile-banking-ux' },
    { title: 'Conduct user testing sessions', isCompleted: false, taskId: 'task-mobile-banking-ux' },

    // AI Chatbot NLP subtasks
    { title: 'Collect and preprocess training data', isCompleted: true, taskId: 'task-chatbot-nlp' },
    { title: 'Choose and configure NLP model (e.g., BERT)', isCompleted: false, taskId: 'task-chatbot-nlp' },
    { title: 'Develop intent classification module', isCompleted: false, taskId: 'task-chatbot-nlp' },

    // Cloud Infrastructure Audit subtasks
    { title: 'Document existing server configurations', isCompleted: true, taskId: 'task-cloud-audit' },
    { title: 'Map network topology', isCompleted: true, taskId: 'task-cloud-audit' },
    { title: 'Identify critical applications and databases', isCompleted: true, taskId: 'task-cloud-audit' },
  ]

  for (const subtask of subtasks) {
    await prisma.subtask.create({ data: subtask })
  }

  // Create comments for tasks
  const comments = [
    {
      content: 'Frontend dla strony produktu idzie zgodnie z planem. Potrzebuję tylko finalnej specyfikacji API.',
      taskId: 'task-ecommerce-frontend',
      authorId: user2.id,
      createdAt: new Date('2025-08-06T10:30:00Z'),
    },
    {
      content: 'API dla produktów jest w trakcie code review. Powinno być gotowe do końca tygodnia.',
      taskId: 'task-ecommerce-backend-api',
      authorId: user3.id,
      createdAt: new Date('2025-08-07T14:15:00Z'),
    },
    {
      content: 'Testy UAT dla procesu checkoutu wykazały kilka drobnych błędów. Zgłosiłem je w JIRA.',
      taskId: 'task-ecommerce-qa',
      authorId: user4.id,
      createdAt: new Date('2025-08-08T09:45:00Z'),
    },
    {
      content: 'Projekt UX dla przelewów bankowych zatwierdzony przez klienta. Możemy ruszać z implementacją.',
      taskId: 'task-mobile-banking-ux',
      authorId: user1.id,
      createdAt: new Date('2025-07-31T11:20:00Z'),
    },
    {
      content: 'NLP module wymaga jeszcze sporo pracy nad precyzją. Zwiększam estymację czasu.',
      taskId: 'task-chatbot-nlp',
      authorId: user3.id,
      createdAt: new Date('2025-08-05T16:00:00Z'),
    },
    {
      content: 'Audyt infrastruktury zakończony. Raport dostępny w Google Drive.',
      taskId: 'task-cloud-audit',
      authorId: user5.id,
      createdAt: new Date('2025-07-21T08:30:00Z'),
    },
    {
      content: 'Czekamy na zielone światło od działu prawnego. Bez tego nie możemy ruszyć z nowymi funkcjami.',
      taskId: 'task-blocked-legal',
      authorId: adminUser.id,
      createdAt: new Date('2025-08-01T11:00:00Z'),
    },
  ]

  for (const comment of comments) {
    await prisma.comment.create({ data: comment })
  }

  // Create comprehensive time entries
  const timeEntries = [
    // E-commerce Frontend task
    {
      hours: 8.0,
      description: 'Initial setup and component scaffolding for product listing page.',
      date: new Date('2025-08-05'),
      taskId: 'task-ecommerce-frontend',
      userId: user2.id,
    },
    {
      hours: 6.0,
      description: 'Implemented basic product card layout and styling.',
      date: new Date('2025-08-06'),
      taskId: 'task-ecommerce-frontend',
      userId: user2.id,
    },

    // E-commerce QA task
    {
      hours: 5.0,
      description: 'Tested user registration and login flows, reported minor UI bugs.',
      date: new Date('2025-08-01'),
      taskId: 'task-ecommerce-qa',
      userId: user4.id,
    },
    {
      hours: 4.0,
      description: 'Verified shopping cart functionality and item addition/removal.',
      date: new Date('2025-08-02'),
      taskId: 'task-ecommerce-qa',
      userId: user4.id,
    },

    // Mobile Banking UX task
    {
      hours: 8.0,
      description: 'Researched best practices for secure fund transfer UX in banking apps.',
      date: new Date('2025-07-25'),
      taskId: 'task-mobile-banking-ux',
      userId: user2.id,
    },
    {
      hours: 8.0,
      description: 'Created wireframes and initial mockups for fund transfer flow.',
      date: new Date('2025-07-26'),
      taskId: 'task-mobile-banking-ux',
      userId: user2.id,
    },

    // AI Chatbot NLP task
    {
      hours: 10.0,
      description: 'Collected and preprocessed initial dataset for NLP model training.',
      date: new Date('2025-08-01'),
      taskId: 'task-chatbot-nlp',
      userId: user3.id,
    },
    {
      hours: 8.0,
      description: 'Experimented with different NLP models (BERT, GPT-3) for intent recognition.',
      date: new Date('2025-08-02'),
      taskId: 'task-chatbot-nlp',
      userId: user3.id,
    },

    // Cloud Infrastructure Audit task
    {
      hours: 8.0,
      description: 'Documented existing server configurations and software versions.',
      date: new Date('2025-07-15'),
      taskId: 'task-cloud-audit',
      userId: user5.id,
    },
    {
      hours: 8.0,
      description: 'Mapped network topology and identified critical dependencies.',
      date: new Date('2025-07-16'),
      taskId: 'task-cloud-audit',
      userId: user5.id,
    },
    {
      hours: 8.0,
      description: 'Prepared migration strategy document and cost analysis.',
      date: new Date('2025-07-17'),
      taskId: 'task-cloud-audit',
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
      filename: 'ecommerce-requirements.pdf',
      url: '/documents/ecommerce-requirements.pdf',
      mimeType: 'application/pdf',
      size: 3072000,
      description: 'Szczegółowe wymagania biznesowe i techniczne dla nowej platformy e-commerce.',
      category: 'Requirements',
      projectId: project1.id,
      uploadedById: adminUser.id,
    },
    {
      filename: 'api-spec-v2.0.json',
      url: '/documents/api-spec-v2.0.json',
      mimeType: 'application/json',
      size: 768000,
      description: 'Specyfikacja OpenAPI dla API produktów i zamówień.',
      category: 'Documentation',
      projectId: project1.id,
      uploadedById: user3.id,
    },
    {
      filename: 'mobile-banking-ux-flows.fig',
      url: '/documents/mobile-banking-ux-flows.fig',
      mimeType: 'application/figma',
      size: 20480000,
      description: 'Kompletne przepływy użytkownika i prototypy dla aplikacji bankowej.',
      category: 'Design',
      projectId: project2.id,
      uploadedById: user2.id,
    },
    {
      filename: 'chatbot-training-data.csv',
      url: '/documents/chatbot-training-data.csv',
      mimeType: 'text/csv',
      size: 10240000,
      description: 'Zbiór danych treningowych dla modułu NLP chatbota.',
      category: 'Data',
      projectId: project3.id,
      uploadedById: user3.id,
    },
    {
      filename: 'aws-migration-plan.pdf',
      url: '/documents/aws-migration-plan.pdf',
      mimeType: 'application/pdf',
      size: 4096000,
      description: 'Szczegółowy plan migracji infrastruktury do AWS.',
      category: 'Planning',
      projectId: project4.id,
      uploadedById: user5.id,
    },
    {
      filename: 'security-audit-report.pdf',
      url: '/documents/security-audit-report.pdf',
      mimeType: 'application/pdf',
      size: 1536000,
      description: 'Raport z audytu bezpieczeństwa dla istniejącej infrastruktury.',
      category: 'Security',
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
      title: 'Nowy moduł zarządzania projektami',
      description: 'Wprowadziliśmy zaawansowany moduł zarządzania projektami z widokami Kanban i Gantta.',
      type: 'success',
      isVisible: true,
      createdById: adminUser.id,
      createdAt: new Date('2025-08-01T10:00:00Z'),
    },
    {
      title: 'Ulepszona integracja z Git',
      description: 'Dodaliśmy nowe funkcje integracji z repozytoriami Git, w tym automatyczne linkowanie commitów do zadań.',
      type: 'info',
      isVisible: true,
      createdById: user5.id,
      createdAt: new Date('2025-07-30T14:30:00Z'),
    },
    {
      title: 'Wdrożenie CI/CD dla projektów frontendowych',
      description: 'Automatyczne testowanie i deployment dla wszystkich projektów frontendowych. Skrócony czas dostarczania.',
      type: 'success',
      isVisible: true,
      createdById: user2.id,
      createdAt: new Date('2025-07-29T16:45:00Z'),
    },
    {
      title: 'Planowane szkolenie z AWS Serverless',
      description: 'W przyszłym tygodniu odbędzie się szkolenie z AWS Lambda i API Gateway. Zapisy otwarte!',
      type: 'info',
      isVisible: true,
      createdById: adminUser.id,
      createdAt: new Date('2025-07-28T09:15:00Z'),
    },
    {
      title: 'Pilna aktualizacja bezpieczeństwa',
      description: 'Wdrożono krytyczną łatkę bezpieczeństwa dla modułu uwierzytelniania. Zalecamy zmianę hasła.',
      type: 'warning',
      isVisible: true,
      createdById: adminUser.id,
      createdAt: new Date('2025-07-27T11:00:00Z'),
    },
    {
      title: 'Nowe szablony projektów IT',
      description: 'Dodaliśmy szablony dla typowych projektów IT: Web Development, Mobile App, Data Science.',
      type: 'success',
      isVisible: true,
      createdById: user1.id,
      createdAt: new Date('2025-07-26T13:20:00Z'),
    },
  ]

  for (const change of systemChanges) {
    await prisma.systemChange.create({ data: change })
  }

  // Create some todos for tasks
  const todos = [
    { title: 'Przygotować testy jednostkowe dla modułu koszyka', isCompleted: false, taskId: 'task-ecommerce-frontend' },
    { title: 'Zaktualizować dokumentację API dla produktów', isCompleted: true, taskId: 'task-ecommerce-backend-api' },
    { title: 'Przeprowadzić code review dla modułu płatności', isCompleted: false, taskId: 'task-ecommerce-backend-api' },
    { title: 'Zgłosić błędy z UAT w systemie JIRA', isCompleted: true, taskId: 'task-ecommerce-qa' },
    { title: 'Przygotować scenariusze testowe dla biometrii', isCompleted: false, taskId: 'task-mobile-banking-security' },
    { title: 'Zoptymalizować model NLP pod kątem wydajności', isCompleted: false, taskId: 'task-chatbot-nlp' },
    { title: 'Przygotować prezentację z audytu infrastruktury dla klienta', isCompleted: true, taskId: 'task-cloud-audit' },
    { title: 'Zaprojektować podsieci VPC', isCompleted: false, taskId: 'task-cloud-vpc' },
  ]

  for (const todo of todos) {
    await prisma.todo.create({ data: todo })
  }

  // Create chat rooms and messages
  console.log('Creating chat rooms and messages...')

  // 1. General team chat room
  const generalChatRoom = await prisma.chatRoom.upsert({
    where: { id: 'chat-general-it' },
    update: {},
    create: {
      id: 'chat-general-it',
      name: 'TechSolutions - Ogólny',
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
        joinedAt: new Date('2025-07-20T09:00:00Z'),
        lastReadAt: new Date('2025-08-04T10:00:00Z'),
      },
    })
  }

  // 2. Project-specific chat rooms
  const ecommerceProjectChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-ecommerce-project' },
    update: {},
    create: {
      id: 'chat-ecommerce-project',
      name: 'E-commerce Relaunch - Dyskusja',
      type: 'project',
      projectId: project1.id,
      createdById: user1.id,
    },
  })

  // Add relevant team members to E-commerce project chat
  const ecommerceTeamMembers = [adminUser, user1, user2, user3, user4, user5]
  for (const user of ecommerceTeamMembers) {
    await prisma.userChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId: user.id,
          chatRoomId: ecommerceProjectChat.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        chatRoomId: ecommerceProjectChat.id,
        joinedAt: new Date('2025-07-25T10:00:00Z'),
        lastReadAt: new Date('2025-08-04T09:30:00Z'),
      },
    })
  }

  const mobileBankingChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-mobile-banking' },
    update: {},
    create: {
      id: 'chat-mobile-banking',
      name: 'Mobile Banking - Sprint Planning',
      type: 'project',
      projectId: project2.id,
      createdById: user1.id,
    },
  })

  // Add mobile banking team members
  const mobileBankingTeamMembers = [user1, user2, user3, user4]
  for (const user of mobileBankingTeamMembers) {
    await prisma.userChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId: user.id,
          chatRoomId: mobileBankingChat.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        chatRoomId: mobileBankingChat.id,
        joinedAt: new Date('2025-07-28T11:00:00Z'),
        lastReadAt: new Date('2025-08-03T14:45:00Z'),
      },
    })
  }

  // 3. DevOps team chat
  const devopsTeamChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-devops-team' },
    update: {},
    create: {
      id: 'chat-devops-team',
      name: 'DevOps & Cloud Team',
      type: 'group',
      createdById: user5.id,
    },
  })

  // Add devops team members
  const devopsMembers = [user5, user1, adminUser]
  for (const user of devopsMembers) {
    await prisma.userChatRoom.upsert({
      where: {
        userId_chatRoomId: {
          userId: user.id,
          chatRoomId: devopsTeamChat.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        chatRoomId: devopsTeamChat.id,
        joinedAt: new Date('2025-07-29T12:00:00Z'),
        lastReadAt: new Date('2025-08-04T08:20:00Z'),
      },
    })
  }

  // 4. Direct message chat between admin and PM
  const directChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-direct-admin-pm' },
    update: {},
    create: {
      id: 'chat-direct-admin-pm',
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
        joinedAt: new Date('2025-07-30T13:00:00Z'),
        lastReadAt: new Date('2025-08-04T11:00:00Z'),
      },
    })
  }

  // Create messages for chat rooms
  console.log('Creating chat messages...')

  // Messages for general chat room
  const generalMessages = [
    {
      content: 'Witajcie w TechSolutions! 👋 Cieszę się, że możemy razem tworzyć innowacje.',
      senderId: adminUser.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:15:00Z'),
    },
    {
      content: 'Cześć Anno! Marek Nowak, PM. Gotowy na nowe wyzwania! 🚀',
      senderId: user1.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:20:00Z'),
    },
    {
      content: 'Hej wszystkim! Zofia Wiśniewska, Senior Frontend. Liczę na owocną współpracę! ✨',
      senderId: user2.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:25:00Z'),
    },
    {
      content: 'Witam! Piotr Dąbrowski, Senior Backend. Cieszę się, że dołączam do zespołu! 💻',
      senderId: user3.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:30:00Z'),
    },
    {
      content: 'Cześć! Katarzyna Zielińska, QA. Zadbajmy o jakość! ✅',
      senderId: user4.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:35:00Z'),
    },
    {
      content: 'Tomasz Wójcik, DevOps. Jestem tu, aby ułatwić Wam życie z infrastrukturą! ⚙️',
      senderId: user5.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:40:00Z'),
    },
    {
      content: 'Przypominam o dzisiejszym daily standup o 9:00. Przygotujcie updates! ⏰',
      senderId: adminUser.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-08-04T08:45:00Z'),
    },
  ]

  // Messages for E-commerce project chat
  const ecommerceMessages = [
    {
      content: 'Rozpoczynamy sprint 1 dla projektu E-commerce Relaunch! Skupiamy się na stronie produktu.',
      senderId: user1.id,
      chatRoomId: ecommerceProjectChat.id,
      createdAt: new Date('2025-07-25T10:15:00Z'),
    },
    {
      content: 'Zofia, jak idzie frontend dla strony produktu? Czy API jest już dostępne?',
      senderId: user1.id,
      chatRoomId: ecommerceProjectChat.id,
      createdAt: new Date('2025-08-06T10:00:00Z'),
    },
    {
      content: '@[' + user1.id + '] Frontend idzie dobrze. Czekam na finalne API. Piotr, kiedy będzie gotowe?',
      senderId: user2.id,
      chatRoomId: ecommerceProjectChat.id,
      createdAt: new Date('2025-08-06T10:05:00Z'),
    },
    {
      content: '@[' + user2.id + '] API jest w code review. Powinno być zmergowane do końca dnia.',
      senderId: user3.id,
      chatRoomId: ecommerceProjectChat.id,
      createdAt: new Date('2025-08-06T10:10:00Z'),
    },
    {
      content: 'Kasia, czy testy UAT dla checkoutu są już zakończone?',
      senderId: user1.id,
      chatRoomId: ecommerceProjectChat.id,
      createdAt: new Date('2025-08-08T09:00:00Z'),
    },
    {
      content: '@[' + user1.id + '] Tak, zgłosiłam wszystkie błędy w JIRA. Możesz sprawdzić status.',
      senderId: user4.id,
      chatRoomId: ecommerceProjectChat.id,
      createdAt: new Date('2025-08-08T09:05:00Z'),
    },
  ]

  // Messages for mobile banking chat
  const mobileBankingMessages = [
    {
      content: 'Sprint planning dla Mobile Banking App! Skupiamy się na module przelewów.',
      senderId: user1.id,
      chatRoomId: mobileBankingChat.id,
      createdAt: new Date('2025-07-28T11:15:00Z'),
    },
    {
      content: 'Zofia, jak idzie projekt UX dla przelewów? Mamy już finalne mockupy?',
      senderId: user1.id,
      chatRoomId: mobileBankingChat.id,
      createdAt: new Date('2025-07-30T10:00:00Z'),
    },
    {
      content: '@[' + user1.id + '] Tak, mockupy są gotowe i zatwierdzone przez klienta. Link w dokumentach projektu.',
      senderId: user2.id,
      chatRoomId: mobileBankingChat.id,
      createdAt: new Date('2025-07-30T10:05:00Z'),
    },
    {
      content: 'Piotr, kiedy możemy zacząć implementację biometrycznego uwierzytelniania?',
      senderId: user1.id,
      chatRoomId: mobileBankingChat.id,
      createdAt: new Date('2025-08-01T09:00:00Z'),
    },
    {
      content: '@[' + user1.id + '] Rozpocząłem już pracę. Estymuję 2 tygodnie na pierwszą wersję.',
      senderId: user3.id,
      chatRoomId: mobileBankingChat.id,
      createdAt: new Date('2025-08-01T09:05:00Z'),
    },
  ]

  // Messages for devops team chat
  const devopsMessages = [
    {
      content: 'Witajcie w kanale DevOps & Cloud Team! ☁️ Tutaj będziemy omawiać migracje i infrastrukturę.',
      senderId: user5.id,
      chatRoomId: devopsTeamChat.id,
      createdAt: new Date('2025-07-29T12:15:00Z'),
    },
    {
      content: 'Tomasz, jak poszedł audyt infrastruktury dla projektu Cloud Migration?',
      senderId: user1.id,
      chatRoomId: devopsTeamChat.id,
      createdAt: new Date('2025-07-30T10:00:00Z'),
    },
    {
      content: '@[' + user1.id + '] Audyt zakończony. Raport dostępny w dokumentach projektu. Możemy planować VPC.',
      senderId: user5.id,
      chatRoomId: devopsTeamChat.id,
      createdAt: new Date('2025-07-30T10:05:00Z'),
    },
    {
      content: 'Świetnie! Anna, czy możemy zaplanować spotkanie w sprawie strategii migracji?',
      senderId: user1.id,
      chatRoomId: devopsTeamChat.id,
      createdAt: new Date('2025-07-30T10:10:00Z'),
    },
    {
      content: 'Tak, umówmy się na jutro na 14:00. Zaproszenie wysłane.',
      senderId: adminUser.id,
      chatRoomId: devopsTeamChat.id,
      createdAt: new Date('2025-07-30T10:15:00Z'),
    },
  ]

  // Messages for direct chat
  const directMessages = [
    {
      content: 'Cześć Marek! Masz chwilę na rozmowę o priorytetach projektu E-commerce?',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-30T13:15:00Z'),
    },
    {
      content: 'Oczywiście Anno! Jestem dostępny.',
      senderId: user1.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-30T13:20:00Z'),
    },
    {
      content: 'Musimy przyspieszyć prace nad modułem płatności. Klient chce to mieć jak najszybciej.',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-30T13:25:00Z'),
    },
    {
      content: 'Rozumiem. Przesunę zasoby i zaktualizuję harmonogram. Powiadomię zespół.',
      senderId: user1.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-30T13:30:00Z'),
    },
    {
      content: 'Dzięki! Świetna robota z zarządzaniem zespołem.',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-07-30T13:35:00Z'),
    },
    {
      content: 'Marek, czy mamy już odpowiedź od działu prawnego w sprawie polityki prywatności?',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-08-04T10:00:00Z'),
    },
    {
      content: 'Niestety, nadal czekamy. Wysłałem kolejne przypomnienie. To blokuje nam deployment.',
      senderId: user1.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-08-04T10:05:00Z'),
    },
    {
      content: 'Rozumiem. Będę to eskalować. Dzięki za informację.',
      senderId: adminUser.id,
      chatRoomId: directChat.id,
      createdAt: new Date('2025-08-04T10:10:00Z'),
    },
  ]

  // Create all messages
  const allMessages = [
    ...generalMessages,
    ...ecommerceMessages,
    ...mobileBankingMessages,
    ...devopsMessages,
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
    data: { updatedAt: new Date('2025-08-04T08:45:00Z') },
  })

  await prisma.chatRoom.update({
    where: { id: ecommerceProjectChat.id },
    data: { updatedAt: new Date('2025-08-08T09:05:00Z') },
  })

  await prisma.chatRoom.update({
    where: { id: mobileBankingChat.id },
    data: { updatedAt: new Date('2025-08-01T09:05:00Z') },
  })

  await prisma.chatRoom.update({
    where: { id: devopsTeamChat.id },
    data: { updatedAt: new Date('2025-07-30T10:15:00Z') },
  })

  await prisma.chatRoom.update({
    where: { id: directChat.id },
    data: { updatedAt: new Date('2025-08-04T10:10:00Z') },
  })

  console.log('✅ Database seeded successfully with IT company data!')
  console.log('\n📊 Created data summary:')
  console.log(`👥 Users: ${allUsers.length}`)
  console.log(`🏢 Teams: ${[frontendTeam.name, backendTeam.name, devopsTeam.name].length}`)
  console.log(`📁 Projects: ${[project1.name, project2.name, project3.name, project4.name].length}`)
  console.log(`📋 Tasks: ${tasks.length}`)
  console.log(`📝 Subtasks: ${subtasks.length}`)
  console.log(`💬 Comments: ${comments.length}`)
  console.log(`⏱️ Time entries: ${timeEntries.length}`)
  console.log(`📄 Documents: ${documents.length}`)
  console.log(`🔄 System changes: ${systemChanges.length}`)
  console.log(`✅ Todos: ${todos.length}`)
  console.log(`🏷️ Task statuses: ${taskStatuses.length}`)
  console.log(`💭 Chat rooms: 5 (General, E-commerce Project, Mobile Banking, DevOps Team, Direct)`)
  console.log(`📨 Chat messages: ${allMessages.length}`)

  console.log('\n🔑 Login credentials:')
  console.log('Admin: admin@techsolutions.com / admin123')
  console.log('Users: marek.nowak@techsolutions.com, zofia.wisniewska@techsolutions.com, piotr.dabrowski@techsolutions.com, katarzyna.zielinska@techsolutions.com, tomasz.wojcik@techsolutions.com / password123')

  console.log('\n🎯 Sample data includes:')
  console.log('• IT-focused user roles and detailed profiles')
  console.log('• Teams reflecting IT departments (Frontend, Backend, DevOps)')
  console.log('• Diverse IT projects (E-commerce, Mobile Banking, AI Chatbot, Cloud Migration)')
  console.log('• Tasks in various IT development stages (Backlog, In Progress, Code Review, Testing, Done, Blocked)')
  console.log('• Comprehensive time tracking entries for IT tasks')
  console.log('• Subtasks and todos relevant to software development')
  console.log('• Comments and collaboration examples in an IT context')
  console.log('• Project documents like requirements, API specs, UX flows, migration plans')
  console.log('• System changelog entries for IT system updates')
  console.log('• Real-world IT scenarios including blocked tasks and completed work')
  console.log('• Chat rooms: general IT team chat, project-specific chats, DevOps team, direct messages')
  console.log('• Chat messages with mentions, emojis, and realistic IT team conversations')
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
