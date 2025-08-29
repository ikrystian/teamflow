import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function main() {
  console.log('🌱 Seedowanie bazy danych danymi firmy IT...')

  // Tworzenie użytkowników z różnymi rolami i profilami dla firmy IT
  const hashedPassword = await bcrypt.hash('password123', 10)
  const adminPassword = await bcrypt.hash('admin123', 12)

  // Użytkownik Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@techsolutions.com' },
    update: {},
    create: {
      email: 'admin@techsolutions.com',
      name: 'Anna Kowalska',
      password: adminPassword,
      role: 'admin',
      jobTitle: 'CEO i Główny Architekt',
      company: 'TechSolutions Inc.',
      location: 'Warszawa, Polska',
      bio: 'Założycielka i główny architekt w TechSolutions, z pasją do innowacyjnych rozwiązań IT.',
      phone: '+48 500 100 200',
      website: 'https://techsolutions.com',
    },
  })
  console.log(`Utworzono adminUser: ${adminUser.id} (${adminUser.email})`)

  // Menedżer Projektu
  const user1 = await prisma.user.upsert({
    where: { email: 'marek.nowak@techsolutions.com' },
    update: {},
    create: {
      email: 'marek.nowak@techsolutions.com',
      name: 'Marek Nowak',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Starszy Menedżer Projektu',
      company: 'TechSolutions Inc.',
      location: 'Kraków, Polska',
      bio: 'Doświadczony Menedżer Projektu z sukcesami w prowadzeniu złożonych projektów software\'owych.',
      phone: '+48 600 200 300',
    },
  })
  console.log(`Utworzono user1: ${user1.id} (${user1.email})`)

  // Starszy Programista Frontend
  const user2 = await prisma.user.upsert({
    where: { email: 'zofia.wisniewska@techsolutions.com' },
    update: {},
    create: {
      email: 'zofia.wisniewska@techsolutions.com',
      name: 'Zofia Wiśniewska',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Starszy Programista Frontend',
      company: 'TechSolutions Inc.',
      location: 'Gdańsk, Polska',
      bio: 'Specjalistka od nowoczesnych technologii frontendowych i optymalizacji UX.',
      phone: '+48 700 300 400',
      website: 'https://zofia.dev',
    },
  })
  console.log(`Utworzono user2: ${user2.id} (${user2.email})`)

  // Starszy Programista Backend
  const user3 = await prisma.user.upsert({
    where: { email: 'piotr.dabrowski@techsolutions.com' },
    update: {},
    create: {
      email: 'piotr.dabrowski@techsolutions.com',
      name: 'Piotr Dąbrowski',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Starszy Programista Backend',
      company: 'TechSolutions Inc.',
      location: 'Wrocław, Polska',
      bio: 'Architekt systemów backendowych, ekspert w skalowalnych rozwiązaniach chmurowych.',
      phone: '+48 800 400 500',
    },
  })
  console.log(`Utworzono user3: ${user3.id} (${user3.email})`)

  // Inżynier QA
  const user4 = await prisma.user.upsert({
    where: { email: 'katarzyna.zielinska@techsolutions.com' },
    update: {},
    create: {
      email: 'katarzyna.zielinska@techsolutions.com',
      name: 'Katarzyna Zielińska',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Inżynier QA',
      company: 'TechSolutions Inc.',
      location: 'Poznań, Polska',
      bio: 'Pasjonatka testowania oprogramowania, dbająca o najwyższą jakość produktów.',
      phone: '+48 900 500 600',
    },
  })
  console.log(`Utworzono user4: ${user4.id} (${user4.email})`)

  // Inżynier DevOps
  const user5 = await prisma.user.upsert({
    where: { email: 'tomasz.wojcik@techsolutions.com' },
    update: {},
    create: {
      email: 'tomasz.wojcik@techsolutions.com',
      name: 'Tomasz Wójcik',
      password: hashedPassword,
      role: 'user',
      jobTitle: 'Inżynier DevOps',
      company: 'TechSolutions Inc.',
      location: 'Łódź, Polska',
      bio: 'Automatyzacja, infrastruktura jako kod i ciągłe dostarczanie to jego specjalność.',
      phone: '+48 111 222 333',
      website: 'https://tomasz-devops.com',
    },
  })
  console.log(`Utworzono user5: ${user5.id} (${user5.email})`)

  // Tworzenie zespołów dla firmy IT
  const frontendTeam = await prisma.team.upsert({
    where: { id: 'team-frontend' },
    update: {},
    create: {
      id: 'team-frontend',
      name: 'Zespół Rozwoju Frontend',
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
      name: 'Zespół Usług Backendowych',
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
      name: 'Zespół DevOps i Chmury',
      members: {
        connect: [
          { id: adminUser.id },
          { id: user1.id }, // PM
          { id: user5.id }  // DevOps
        ]
      }
    },
  })

  // Tworzenie statusów zadań - najpierw sprawdź, czy istnieją, aby uniknąć konfliktów
  const statusData = [
    { name: 'Backlog', color: '#6B7280', order: 0, isDefault: true },
    { name: 'W Trakcie', color: '#3B82F6', order: 1, isDefault: false },
    { name: 'Code Review', color: '#F59E0B', order: 2, isDefault: false },
    { name: 'Testowanie', color: '#8B5CF6', order: 3, isDefault: false },
    { name: 'Zakończone', color: '#10B981', order: 4, isDefault: false },
    { name: 'Zablokowane', color: '#EF4444', order: 5, isDefault: false },
  ]

  let taskStatuses = []
  for (const status of statusData) {
    const upsertedStatus = await prisma.taskStatus.upsert({
      where: { order: status.order },
      update: { name: status.name, color: status.color, order: status.order, isDefault: status.isDefault },
      create: status,
    })
    taskStatuses.push(upsertedStatus)
  }
  taskStatuses.sort((a, b) => a.order - b.order)

  // Tworzenie projektów skoncentrowanych na IT
  const project1 = await prisma.project.upsert({
    where: { id: 'project-ecommerce' },
    update: {},
    create: {
      id: 'project-ecommerce',
      name: 'Przebudowa Platformy E-commerce',
      description: 'Kompleksowa przebudowa platformy e-commerce dla klienta detalicznego, z nowym UX/UI i skalowalnym backendem.',
      readme: '# Przebudowa E-commerce\n\nProjekt przebudowy platformy e-commerce...',
      status: 'W Trakcie',
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
      name: 'Rozwój Aplikacji Bankowości Mobilnej',
      description: 'Rozwój nowej aplikacji mobilnej dla banku, z naciskiem na bezpieczeństwo i intuicyjny interfejs.',
      readme: '# Aplikacja Bankowości Mobilnej\n\nAplikacja mobilna React Native dla sektora bankowego...',
      status: 'Planowanie',
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
      name: 'Integracja Chatbota AI',
      description: 'Integracja zaawansowanego chatbota opartego na AI z systemem obsługi klienta.',
      readme: '# Chatbot AI\n\nProjekt integracji chatbota AI...',
      status: 'W Trakcie',
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
      name: 'Migracja Infrastruktury do Chmury',
      description: 'Migracja istniejącej infrastruktury klienta do chmury AWS, z optymalizacją kosztów i wydajności.',
      readme: '# Migracja do Chmury\n\nMigracja do AWS...',
      status: 'Utrzymanie',
      color: '#F59E0B',
      icon: '☁️',
      repositoryUrl: 'https://github.com/techsolutions/cloud-migration',
      serverUrl: 'https://aws.amazon.com/console',
      teamId: devopsTeam.id,
    },
  })

  // Tworzenie różnorodnych zadań z różnymi statusami i priorytetami dla projektów IT
  const tasks = [
    // Zadania Przebudowy Platformy E-commerce
    {
      id: 'task-ecommerce-frontend',
      title: 'Opracowanie nowej strony listy produktów (Frontend)',
      description: 'Implementacja responsywnej i wydajnej strony listy produktów z funkcjami filtrowania i sortowania.',
      statusId: taskStatuses[1].id, // W Trakcie
      priority: 'Wysoki',
      estimatedHours: 24,
      projectId: project1.id,
      assigneeId: user2.id, // Zofia Wiśniewska (Starszy FE)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-15T17:00:00Z'),
      startTime: new Date('2025-08-05T09:00:00Z'),
    },
    {
      id: 'task-ecommerce-backend-api',
      title: 'Budowa endpointów API produktów (Backend)',
      description: 'Stworzenie RESTful API dla danych produktów, w tym wyszukiwania, kategorii i szczegółowych widoków produktów.',
      statusId: taskStatuses[0].id, // Backlog
      priority: 'Wysoki',
      estimatedHours: 32,
      projectId: project1.id,
      assigneeId: user3.id, // Piotr Dąbrowski (Starszy BE)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-20T18:00:00Z'),
    },
    {
      id: 'task-ecommerce-qa',
      title: 'Przeprowadzenie testów UAT dla procesu płatności',
      description: 'Przeprowadzenie testów akceptacyjnych użytkownika dla przeprojektowanego procesu płatności, identyfikacja i zgłaszanie błędów.',
      statusId: taskStatuses[3].id, // Testowanie
      priority: 'Średni',
      estimatedHours: 16,
      projectId: project1.id,
      assigneeId: user4.id, // Katarzyna Zielińska (QA)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-10T16:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },
    {
      id: 'task-ecommerce-deployment',
      title: 'Przygotowanie skryptu wdrożeniowego na produkcję',
      description: 'Automatyzacja procesu wdrożenia nowej platformy e-commerce do środowiska produkcyjnego AWS.',
      statusId: taskStatuses[0].id, // Backlog
      priority: 'Niski',
      estimatedHours: 12,
      projectId: project1.id,
      assigneeId: user5.id, // Tomasz Wójcik (DevOps)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-08-25T17:00:00Z'),
    },

    // Zadania Rozwoju Aplikacji Bankowości Mobilnej
    {
      id: 'task-mobile-banking-ux',
      title: 'Projektowanie przepływu użytkownika dla przelewów środków',
      description: 'Stworzenie intuicyjnego i bezpiecznego doświadczenia użytkownika dla przelewania środków między kontami.',
      statusId: taskStatuses[4].id, // Zakończone
      priority: 'Wysoki',
      estimatedHours: 16,
      projectId: project2.id,
      assigneeId: user2.id, // Zofia Wiśniewska (Starszy FE - również zorientowana na UX)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-07-30T17:00:00Z'),
      startTime: new Date('2025-07-25T09:00:00Z'),
      endTime: new Date('2025-07-30T17:00:00Z'),
    },
    {
      id: 'task-mobile-banking-security',
      title: 'Implementacja uwierzytelniania biometrycznego',
      description: 'Integracja Face ID/Touch ID dla bezpiecznego logowania i autoryzacji transakcji.',
      statusId: taskStatuses[1].id, // W Trakcie
      priority: 'Wysoki',
      estimatedHours: 20,
      projectId: project2.id,
      assigneeId: user3.id, // Piotr Dąbrowski (Starszy BE)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-12T16:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },

    // Zadania Integracji Chatbota AI
    {
      id: 'task-chatbot-nlp',
      title: 'Opracowanie modułu przetwarzania języka naturalnego (NLP)',
      description: 'Trenowanie i dostrajanie modeli NLP do rozumienia zapytań klientów i rozpoznawania intencji.',
      statusId: taskStatuses[1].id, // W Trakcie
      priority: 'Wysoki',
      estimatedHours: 40,
      projectId: project3.id,
      assigneeId: user3.id, // Piotr Dąbrowski (Starszy BE)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-08-20T18:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },
    {
      id: 'task-chatbot-frontend',
      title: 'Integracja interfejsu chatbota z portalem klienta',
      description: 'Osadzenie widżetu chatbota w istniejącym portalu internetowym klienta i zapewnienie płynnego doświadczenia użytkownika.',
      statusId: taskStatuses[0].id, // Backlog
      priority: 'Średni',
      estimatedHours: 20,
      projectId: project3.id,
      assigneeId: user2.id, // Zofia Wiśniewska (Starszy FE)
      createdById: user1.id, // Marek Nowak (PM)
      dueDate: new Date('2025-08-28T17:00:00Z'),
    },

    // Zadania Migracji Infrastruktury do Chmury
    {
      id: 'task-cloud-audit',
      title: 'Przeprowadzenie audytu obecnej infrastruktury',
      description: 'Analiza istniejącej infrastruktury on-premise, identyfikacja zależności i strategii migracji.',
      statusId: taskStatuses[4].id, // Zakończone
      priority: 'Wysoki',
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
      title: 'Projektowanie i implementacja sieci AWS VPC',
      description: 'Konfiguracja bezpiecznej i skalowalnej sieci Virtual Private Cloud (VPC) z podsieciami, routingiem i grupami bezpieczeństwa.',
      statusId: taskStatuses[1].id, // W Trakcie
      priority: 'Wysoki',
      estimatedHours: 30,
      projectId: project4.id,
      assigneeId: user5.id, // Tomasz Wójcik (DevOps)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-08-18T16:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },

    // Przykład zablokowanego zadania
    {
      id: 'task-blocked-legal',
      title: 'Przegląd prawny polityki prywatności danych',
      description: 'Uzyskanie zgody prawnej na zaktualizowaną politykę prywatności danych przed wdrożeniem nowych funkcji.',
      statusId: taskStatuses[5].id, // Zablokowane
      priority: 'Wysoki',
      estimatedHours: 8,
      projectId: project1.id,
      assigneeId: user1.id, // Marek Nowak (PM)
      createdById: adminUser.id, // Anna Kowalska (CEO)
      dueDate: new Date('2025-08-30T15:00:00Z'),
      isBlocked: true,
      blockReason: 'Oczekiwanie na zgodę działu prawnego w sprawie zgodności z RODO.',
      blockedAt: new Date('2025-08-01T10:00:00Z'),
      blockedById: adminUser.id,
    },

    // Zadania przypisane bezpośrednio do administratora
    {
      id: 'task-admin-strategy',
      title: 'Opracowanie strategii technologicznej na 2025',
      description: 'Przygotowanie kompleksowej strategii technologicznej firmy na nadchodzący rok, uwzględniającej trendy AI, cloud computing i cyberbezpieczeństwo.',
      statusId: taskStatuses[1].id, // W Trakcie
      priority: 'Krytyczny',
      estimatedHours: 32,
      projectId: project1.id,
      assigneeId: adminUser.id, // Anna Kowalska (CEO)
      createdById: adminUser.id,
      dueDate: new Date('2025-08-12T18:00:00Z'),
      startTime: new Date('2025-08-01T09:00:00Z'),
    },
    {
      id: 'task-admin-budget',
      title: 'Przegląd budżetu IT na Q4 2025',
      description: 'Analiza wydatków IT w trzecim kwartale i planowanie budżetu na czwarty kwartał z uwzględnieniem nowych projektów.',
      statusId: taskStatuses[0].id, // Backlog
      priority: 'Wysoki',
      estimatedHours: 16,
      projectId: project4.id,
      assigneeId: adminUser.id, // Anna Kowalska (CEO)
      createdById: adminUser.id,
      dueDate: new Date('2025-08-20T17:00:00Z'),
    },
    {
      id: 'task-admin-team-review',
      title: 'Przeprowadzenie rocznych ocen zespołu',
      description: 'Przegląd wydajności zespołu, ustalenie celów rozwojowych i planowanie awansów na nadchodzący rok.',
      statusId: taskStatuses[2].id, // Do Przeglądu
      priority: 'Średni',
      estimatedHours: 24,
      projectId: project2.id,
      assigneeId: adminUser.id, // Anna Kowalska (CEO)
      createdById: adminUser.id,
      dueDate: new Date('2025-08-25T16:00:00Z'),
    },
    {
      id: 'task-admin-security-audit',
      title: 'Koordynacja audytu bezpieczeństwa systemów',
      description: 'Nadzorowanie zewnętrznego audytu bezpieczeństwa wszystkich systemów firmy i implementacja zaleceń.',
      statusId: taskStatuses[1].id, // W Trakcie
      priority: 'Krytyczny',
      estimatedHours: 20,
      projectId: project4.id,
      assigneeId: adminUser.id, // Anna Kowalska (CEO)
      createdById: adminUser.id,
      dueDate: new Date('2025-08-15T17:00:00Z'),
      startTime: new Date('2025-08-03T10:00:00Z'),
    },
    {
      id: 'task-admin-client-meeting',
      title: 'Spotkanie z kluczowymi klientami - Q4 roadmap',
      description: 'Prezentacja planów rozwoju produktu na Q4 dla najważniejszych klientów i zebranie feedbacku.',
      statusId: taskStatuses[0].id, // Backlog
      priority: 'Wysoki',
      estimatedHours: 8,
      projectId: project1.id,
      assigneeId: adminUser.id, // Anna Kowalska (CEO)
      createdById: adminUser.id,
      dueDate: new Date('2025-08-18T14:00:00Z'),
    },
    {
      id: 'task-admin-innovation',
      title: 'Badanie nowych technologii AI dla produktów',
      description: 'Analiza możliwości implementacji najnowszych rozwiązań AI w istniejących produktach firmy.',
      statusId: taskStatuses[1].id, // W Trakcie
      priority: 'Średni',
      estimatedHours: 28,
      projectId: project3.id,
      assigneeId: adminUser.id, // Anna Kowalska (CEO)
      createdById: adminUser.id,
      dueDate: new Date('2025-08-22T16:00:00Z'),
      startTime: new Date('2025-08-02T09:00:00Z'),
    },
    {
      id: 'task-admin-partnership',
      title: 'Negocjacje partnerstwa strategicznego',
      description: 'Finalizacja umowy partnerskiej z Microsoft Azure dla rozszerzenia oferty cloud computing.',
      statusId: taskStatuses[3].id, // Testowanie
      priority: 'Krytyczny',
      estimatedHours: 12,
      projectId: project4.id,
      assigneeId: adminUser.id, // Anna Kowalska (CEO)
      createdById: adminUser.id,
      dueDate: new Date('2025-08-10T15:00:00Z'),
      startTime: new Date('2025-07-28T10:00:00Z'),
    },
    {
      id: 'task-admin-completed',
      title: 'Wdrożenie nowego systemu HR',
      description: 'Zakończona implementacja nowego systemu zarządzania zasobami ludzkimi z integracją z istniejącymi systemami.',
      statusId: taskStatuses[4].id, // Zakończone
      priority: 'Wysoki',
      estimatedHours: 40,
      projectId: project2.id,
      assigneeId: adminUser.id, // Anna Kowalska (CEO)
      createdById: adminUser.id,
      dueDate: new Date('2025-07-30T17:00:00Z'),
      startTime: new Date('2025-07-15T09:00:00Z'),
      endTime: new Date('2025-07-30T17:00:00Z'),
    },
  ]

  // Tworzenie wszystkich zadań
  const createdTasks: Record<string, any> = {}
  for (const taskData of tasks) {
    console.log(`Tworzenie zadania: ${taskData.title}, assigneeId: ${taskData.assigneeId}, createdById: ${taskData.createdById}`)
    const { id, ...createData } = taskData
    const task = await prisma.task.upsert({
      where: { id: id },
      update: {},
      create: createData,
    })
    createdTasks[id] = task
  }

  // Tworzenie podzadań dla złożonych zadań
  const subtasks = [
    // Podzadania Frontend E-commerce
    { title: 'Implementacja komponentu karty produktu', isCompleted: true, taskId: 'task-ecommerce-frontend' },
    { title: 'Opracowanie logiki filtrowania (cena, kategoria, marka)', isCompleted: false, taskId: 'task-ecommerce-frontend' },
    { title: 'Integracja z backendowym API produktów', isCompleted: false, taskId: 'task-ecommerce-frontend' },

    // Podzadania QA E-commerce
    { title: 'Testowanie rejestracji i logowania użytkowników', isCompleted: true, taskId: 'task-ecommerce-qa' },
    { title: 'Weryfikacja funkcjonalności koszyka zakupowego', isCompleted: true, taskId: 'task-ecommerce-qa' },
    { title: 'Testowanie integracji bramki płatności', isCompleted: false, taskId: 'task-ecommerce-qa' },

    // Podzadania UX Bankowości Mobilnej
    { title: 'Szkicowanie wireframe\'ów dla przepływu przelewów', isCompleted: true, taskId: 'task-mobile-banking-ux' },
    { title: 'Tworzenie makiet wysokiej wierności', isCompleted: true, taskId: 'task-mobile-banking-ux' },
    { title: 'Przeprowadzenie sesji testów użytkowników', isCompleted: false, taskId: 'task-mobile-banking-ux' },

    // Podzadania NLP Chatbota AI
    { title: 'Zbieranie i wstępne przetwarzanie danych treningowych', isCompleted: true, taskId: 'task-chatbot-nlp' },
    { title: 'Wybór i konfiguracja modelu NLP (np. BERT)', isCompleted: false, taskId: 'task-chatbot-nlp' },
    { title: 'Opracowanie modułu klasyfikacji intencji', isCompleted: false, taskId: 'task-chatbot-nlp' },

    // Podzadania Audytu Infrastruktury Chmurowej
    { title: 'Dokumentowanie istniejących konfiguracji serwerów', isCompleted: true, taskId: 'task-cloud-audit' },
    { title: 'Mapowanie topologii sieci', isCompleted: true, taskId: 'task-cloud-audit' },
    { title: 'Identyfikacja krytycznych aplikacji i baz danych', isCompleted: true, taskId: 'task-cloud-audit' },

    // Podzadania dla zadań administratora
    { title: 'Analiza trendów technologicznych na 2025', isCompleted: true, taskId: 'task-admin-strategy' },
    { title: 'Konsultacje z liderami zespołów', isCompleted: true, taskId: 'task-admin-strategy' },
    { title: 'Opracowanie roadmapy technologicznej', isCompleted: false, taskId: 'task-admin-strategy' },
    { title: 'Prezentacja strategii dla zarządu', isCompleted: false, taskId: 'task-admin-strategy' },

    { title: 'Przegląd wydatków Q3', isCompleted: false, taskId: 'task-admin-budget' },
    { title: 'Planowanie inwestycji w nowe technologie', isCompleted: false, taskId: 'task-admin-budget' },
    { title: 'Konsultacje z CFO', isCompleted: false, taskId: 'task-admin-budget' },

    { title: 'Przygotowanie formularzy oceny', isCompleted: true, taskId: 'task-admin-team-review' },
    { title: 'Indywidualne rozmowy z zespołem', isCompleted: false, taskId: 'task-admin-team-review' },
    { title: 'Ustalenie celów rozwojowych', isCompleted: false, taskId: 'task-admin-team-review' },

    { title: 'Koordynacja z firmą audytorską', isCompleted: true, taskId: 'task-admin-security-audit' },
    { title: 'Przegląd wyników wstępnych', isCompleted: true, taskId: 'task-admin-security-audit' },
    { title: 'Implementacja zaleceń bezpieczeństwa', isCompleted: false, taskId: 'task-admin-security-audit' },
  ]

  for (const subtask of subtasks) {
    const taskId = createdTasks[subtask.taskId]?.id || subtask.taskId
    await prisma.subtask.create({ 
      data: {
        ...subtask,
        taskId: taskId
      }
    })
  }

  // Tworzenie komentarzy do zadań
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
      content: 'Testy UAT dla procesu płatności wykazały kilka drobnych błędów. Zgłosiłem je w JIRA.',
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
      content: 'Moduł NLP wymaga jeszcze sporo pracy nad precyzją. Zwiększam estymację czasu.',
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
    const taskId = createdTasks[comment.taskId]?.id || comment.taskId
    await prisma.comment.create({ 
      data: {
        ...comment,
        taskId: taskId
      }
    })
  }

  // Tworzenie kompleksowych wpisów czasu
  const timeEntries = [
    // Zadanie Frontend E-commerce
    {
      hours: 8.0,
      description: 'Wstępna konfiguracja i tworzenie komponentów dla strony listy produktów.',
      date: new Date('2025-08-05'),
      taskId: 'task-ecommerce-frontend',
      userId: user2.id,
    },
    {
      hours: 6.0,
      description: 'Implementacja podstawowego układu karty produktu i stylizacji.',
      date: new Date('2025-08-06'),
      taskId: 'task-ecommerce-frontend',
      userId: user2.id,
    },

    // Zadanie QA E-commerce
    {
      hours: 5.0,
      description: 'Testowanie przepływów rejestracji i logowania użytkowników, zgłoszenie drobnych błędów UI.',
      date: new Date('2025-08-01'),
      taskId: 'task-ecommerce-qa',
      userId: user4.id,
    },
    {
      hours: 4.0,
      description: 'Weryfikacja funkcjonalności koszyka zakupowego i dodawania/usuwania przedmiotów.',
      date: new Date('2025-08-02'),
      taskId: 'task-ecommerce-qa',
      userId: user4.id,
    },

    // Zadanie UX Bankowości Mobilnej
    {
      hours: 8.0,
      description: 'Badanie najlepszych praktyk dla bezpiecznego UX przelewów środków w aplikacjach bankowych.',
      date: new Date('2025-07-25'),
      taskId: 'task-mobile-banking-ux',
      userId: user2.id,
    },
    {
      hours: 8.0,
      description: 'Tworzenie wireframe\'ów i wstępnych makiet dla przepływu przelewów.',
      date: new Date('2025-07-26'),
      taskId: 'task-mobile-banking-ux',
      userId: user2.id,
    },

    // Zadanie NLP Chatbota AI
    {
      hours: 10.0,
      description: 'Zebrano i wstępnie przetworzono początkowy zestaw danych do trenowania modelu NLP.',
      date: new Date('2025-08-01'),
      taskId: 'task-chatbot-nlp',
      userId: user3.id,
    },
    {
      hours: 8.0,
      description: 'Eksperymentowano z różnymi modelami NLP (BERT, GPT-3) do rozpoznawania intencji.',
      date: new Date('2025-08-02'),
      taskId: 'task-chatbot-nlp',
      userId: user3.id,
    },

    // Zadanie Audytu Infrastruktury Chmurowej
    {
      hours: 8.0,
      description: 'Udokumentowano istniejące konfiguracje serwerów i wersje oprogramowania.',
      date: new Date('2025-07-15'),
      taskId: 'task-cloud-audit',
      userId: user5.id,
    },
    {
      hours: 8.0,
      description: 'Zmapowano topologię sieci i zidentyfikowano krytyczne zależności.',
      date: new Date('2025-07-16'),
      taskId: 'task-cloud-audit',
      userId: user5.id,
    },
    {
      hours: 8.0,
      description: 'Przygotowano dokument strategii migracji i analizę kosztów.',
      date: new Date('2025-07-17'),
      taskId: 'task-cloud-audit',
      userId: user5.id,
    },

    // Wpisy czasu dla zadań administratora (Anna Kowalska)
    {
      hours: 4.0,
      description: 'Analiza trendów technologicznych na 2025 - badanie AI, blockchain i quantum computing.',
      date: new Date('2025-08-01'),
      taskId: 'task-admin-strategy',
      userId: adminUser.id,
    },
    {
      hours: 6.0,
      description: 'Konsultacje z liderami zespołów technicznych i zbieranie wymagań.',
      date: new Date('2025-08-02'),
      taskId: 'task-admin-strategy',
      userId: adminUser.id,
    },
    {
      hours: 3.0,
      description: 'Przygotowanie wstępnej roadmapy technologicznej.',
      date: new Date('2025-08-03'),
      taskId: 'task-admin-strategy',
      userId: adminUser.id,
    },
    {
      hours: 2.0,
      description: 'Koordynacja z firmą audytorską - ustalenie zakresu audytu.',
      date: new Date('2025-08-03'),
      taskId: 'task-admin-security-audit',
      userId: adminUser.id,
    },
    {
      hours: 3.0,
      description: 'Przegląd wyników wstępnego audytu bezpieczeństwa.',
      date: new Date('2025-08-04'),
      taskId: 'task-admin-security-audit',
      userId: adminUser.id,
    },
    {
      hours: 5.0,
      description: 'Badanie rozwiązań AI dla platformy e-commerce - analiza ChatGPT, Claude.',
      date: new Date('2025-08-02'),
      taskId: 'task-admin-innovation',
      userId: adminUser.id,
    },
    {
      hours: 4.0,
      description: 'Analiza konkurencji w obszarze AI i machine learning.',
      date: new Date('2025-08-03'),
      taskId: 'task-admin-innovation',
      userId: adminUser.id,
    },
    {
      hours: 3.0,
      description: 'Negocjacje warunków partnerstwa strategicznego z Microsoft.',
      date: new Date('2025-07-28'),
      taskId: 'task-admin-partnership',
      userId: adminUser.id,
    },
    {
      hours: 2.0,
      description: 'Przegląd umowy partnerskiej z zespołem prawnym.',
      date: new Date('2025-07-29'),
      taskId: 'task-admin-partnership',
      userId: adminUser.id,
    },
    {
      hours: 8.0,
      description: 'Implementacja systemu HR - konfiguracja i migracja danych.',
      date: new Date('2025-07-15'),
      taskId: 'task-admin-completed',
      userId: adminUser.id,
    },
    {
      hours: 6.0,
      description: 'Konfiguracja integracji z istniejącymi systemami.',
      date: new Date('2025-07-20'),
      taskId: 'task-admin-completed',
      userId: adminUser.id,
    },
    {
      hours: 4.0,
      description: 'Testy końcowe systemu HR i wdrożenie produkcyjne.',
      date: new Date('2025-07-30'),
      taskId: 'task-admin-completed',
      userId: adminUser.id,
    },
  ]

  for (const entry of timeEntries) {
    const taskId = createdTasks[entry.taskId]?.id || entry.taskId
    await prisma.timeEntry.create({
      data: {
        ...entry,
        taskId: taskId
      },
    })
  }

  // Tworzenie dokumentów projektowych
  const documents = [
    {
      filename: 'ecommerce-requirements.pdf',
      url: '/documents/ecommerce-requirements.pdf',
      mimeType: 'application/pdf',
      size: 3072000,
      description: 'Szczegółowe wymagania biznesowe i techniczne dla nowej platformy e-commerce.',
      category: 'Wymagania',
      projectId: project1.id,
      uploadedById: adminUser.id,
    },
    {
      filename: 'api-spec-v2.0.json',
      url: '/documents/api-spec-v2.0.json',
      mimeType: 'application/json',
      size: 768000,
      description: 'Specyfikacja OpenAPI dla API produktów i zamówień.',
      category: 'Dokumentacja',
      projectId: project1.id,
      uploadedById: user3.id,
    },
    {
      filename: 'mobile-banking-ux-flows.fig',
      url: '/documents/mobile-banking-ux-flows.fig',
      mimeType: 'application/figma',
      size: 20480000,
      description: 'Kompletne przepływy użytkownika i prototypy dla aplikacji bankowej.',
      category: 'Projektowanie',
      projectId: project2.id,
      uploadedById: user2.id,
    },
    {
      filename: 'chatbot-training-data.csv',
      url: '/documents/chatbot-training-data.csv',
      mimeType: 'text/csv',
      size: 10240000,
      description: 'Zbiór danych treningowych dla modułu NLP chatbota.',
      category: 'Dane',
      projectId: project3.id,
      uploadedById: user3.id,
    },
    {
      filename: 'aws-migration-plan.pdf',
      url: '/documents/aws-migration-plan.pdf',
      mimeType: 'application/pdf',
      size: 4096000,
      description: 'Szczegółowy plan migracji infrastruktury do AWS.',
      category: 'Planowanie',
      projectId: project4.id,
      uploadedById: user5.id,
    },
    {
      filename: 'security-audit-report.pdf',
      url: '/documents/security-audit-report.pdf',
      mimeType: 'application/pdf',
      size: 1536000,
      description: 'Raport z audytu bezpieczeństwa dla istniejącej infrastruktury.',
      category: 'Bezpieczeństwo',
      projectId: project4.id,
      uploadedById: user5.id,
    },
  ]

  for (const doc of documents) {
    await prisma.projectDocument.create({ data: doc })
  }

  // Tworzenie zmian systemowych dla dziennika zmian
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

  // Tworzenie zadań do wykonania (todos)
  const todos = [
    { title: 'Przygotować testy jednostkowe dla modułu koszyka', isCompleted: false, taskId: 'task-ecommerce-frontend' },
    { title: 'Zaktualizować dokumentację API dla produktów', isCompleted: true, taskId: 'task-ecommerce-backend-api' },
    { title: 'Przeprowadzić code review dla modułu płatności', isCompleted: false, taskId: 'task-ecommerce-backend-api' },
    { title: 'Zgłosić błędy z UAT w systemie JIRA', isCompleted: true, taskId: 'task-ecommerce-qa' },
    { title: 'Przygotować scenariusze testowe dla biometrii', isCompleted: false, taskId: 'task-mobile-banking-security' },
    { title: 'Zoptymalizować model NLP pod kątem wydajności', isCompleted: false, taskId: 'task-chatbot-nlp' },
    { title: 'Przygotować prezentację z audytu infrastruktury dla klienta', isCompleted: true, taskId: 'task-cloud-audit' },
    { title: 'Zaprojektować podsieci VPC', isCompleted: false, taskId: 'task-cloud-vpc' },

    // Todos dla zadań administratora
    { title: 'Przygotować prezentację strategii dla zarządu', isCompleted: false, taskId: 'task-admin-strategy' },
    { title: 'Zaplanować budżet na nowe technologie', isCompleted: false, taskId: 'task-admin-strategy' },
    { title: 'Ustalić timeline wdrożenia strategii', isCompleted: false, taskId: 'task-admin-strategy' },

    { title: 'Przeanalizować wydatki Q3 w szczegółach', isCompleted: false, taskId: 'task-admin-budget' },
    { title: 'Przygotować propozycje oszczędności', isCompleted: false, taskId: 'task-admin-budget' },

    { title: 'Zaplanować indywidualne rozmowy z zespołem', isCompleted: false, taskId: 'task-admin-team-review' },
    { title: 'Przygotować cele rozwojowe na 2025', isCompleted: false, taskId: 'task-admin-team-review' },

    { title: 'Wdrożyć zalecenia z audytu bezpieczeństwa', isCompleted: false, taskId: 'task-admin-security-audit' },
    { title: 'Zaplanować szkolenia z cyberbezpieczeństwa', isCompleted: false, taskId: 'task-admin-security-audit' },

    { title: 'Przygotować agendę spotkania z klientami', isCompleted: false, taskId: 'task-admin-client-meeting' },
    { title: 'Zebrać feedback od zespołów produktowych', isCompleted: false, taskId: 'task-admin-client-meeting' },

    { title: 'Przetestować narzędzia AI w środowisku dev', isCompleted: false, taskId: 'task-admin-innovation' },
    { title: 'Przygotować business case dla AI', isCompleted: false, taskId: 'task-admin-innovation' },

    { title: 'Finalizować szczegóły umowy partnerskiej', isCompleted: false, taskId: 'task-admin-partnership' },
    { title: 'Zaplanować kick-off meeting z Microsoft', isCompleted: false, taskId: 'task-admin-partnership' },
  ]

  for (const todo of todos) {
    const taskId = createdTasks[todo.taskId]?.id || todo.taskId
    await prisma.todo.create({ 
      data: {
        ...todo,
        taskId: taskId
      }
    })
  }

  // Tworzenie pokoi czatu i wiadomości
  console.log('Tworzenie pokoi czatu i wiadomości...')

  // 1. Ogólny pokój czatu zespołu
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

  // Dodaj wszystkich użytkowników do ogólnego czatu
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

  // 2. Pokoje czatu specyficzne dla projektu
  const ecommerceProjectChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-ecommerce-project' },
    update: {},
    create: {
      id: 'chat-ecommerce-project',
      name: 'Przebudowa E-commerce - Dyskusja',
      type: 'project',
      projectId: project1.id,
      createdById: user1.id,
    },
  })

  // Dodaj odpowiednich członków zespołu do czatu projektu E-commerce
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
      name: 'Bankowość Mobilna - Planowanie Sprintu',
      type: 'project',
      projectId: project2.id,
      createdById: user1.id,
    },
  })

  // Dodaj członków zespołu bankowości mobilnej
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

  // 3. Czat zespołu DevOps
  const devopsTeamChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-devops-team' },
    update: {},
    create: {
      id: 'chat-devops-team',
      name: 'Zespół DevOps i Chmury',
      type: 'group',
      createdById: user5.id,
    },
  })

  // Dodaj członków zespołu DevOps
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

  // 4. Czat bezpośredni między adminem a PM
  const directChat = await prisma.chatRoom.upsert({
    where: { id: 'chat-direct-admin-pm' },
    update: {},
    create: {
      id: 'chat-direct-admin-pm',
      name: null, // Czaty bezpośrednie nie mają nazw
      type: 'direct',
      createdById: adminUser.id,
    },
  })

  // Dodaj obu użytkowników do czatu bezpośredniego
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

  // Tworzenie wiadomości czatu
  console.log('Tworzenie wiadomości czatu...')

  // Wiadomości dla ogólnego pokoju czatu
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
      content: 'Hej wszystkim! Zofia Wiśniewska, Starszy Programista Frontend. Liczę na owocną współpracę! ✨',
      senderId: user2.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:25:00Z'),
    },
    {
      content: 'Witam! Piotr Dąbrowski, Starszy Programista Backend. Cieszę się, że dołączam do zespołu! 💻',
      senderId: user3.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:30:00Z'),
    },
    {
      content: 'Cześć! Katarzyna Zielińska, Inżynier QA. Zadbajmy o jakość! ✅',
      senderId: user4.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:35:00Z'),
    },
    {
      content: 'Tomasz Wójcik, Inżynier DevOps. Jestem tu, aby ułatwić Wam życie z infrastrukturą! ⚙️',
      senderId: user5.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-07-20T09:40:00Z'),
    },
    {
      content: 'Przypominam o dzisiejszym daily standup o 9:00. Przygotujcie aktualizacje! ⏰',
      senderId: adminUser.id,
      chatRoomId: generalChatRoom.id,
      createdAt: new Date('2025-08-04T08:45:00Z'),
    },
  ]

  // Wiadomości dla czatu projektu E-commerce
  const ecommerceMessages = [
    {
      content: 'Rozpoczynamy sprint 1 dla projektu Przebudowa Platformy E-commerce! Skupiamy się na stronie produktu.',
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

  // Wiadomości dla czatu bankowości mobilnej
  const mobileBankingMessages = [
    {
      content: 'Planowanie sprintu dla Aplikacji Bankowości Mobilnej! Skupiamy się na module przelewów.',
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

  // Wiadomości dla czatu zespołu DevOps
  const devopsMessages = [
    {
      content: 'Witajcie w kanale Zespół DevOps i Chmury! ☁️ Tutaj będziemy omawiać migracje i infrastrukturę.',
      senderId: user5.id,
      chatRoomId: devopsTeamChat.id,
      createdAt: new Date('2025-07-29T12:15:00Z'),
    },
    {
      content: 'Tomasz, jak poszedł audyt infrastruktury dla projektu Migracja Infrastruktury do Chmury?',
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

  // Wiadomości dla czatu bezpośredniego
  const directMessages = [
    {
      content: 'Cześć Marek! Masz chwilę na rozmowę o priorytetach projektu Przebudowa Platformy E-commerce?',
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
      content: 'Niestety, nadal czekamy. Wysłałem kolejne przypomnienie. To blokuje nam wdrożenie.',
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

  // Tworzenie wszystkich wiadomości
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

  // Aktualizacja pokoi czatu z najnowszą aktywnością
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

  console.log('✅ Baza danych zasiedlona pomyślnie danymi firmy IT!')
  console.log('\n📊 Podsumowanie utworzonych danych:')
  console.log(`👥 Użytkownicy: ${allUsers.length}`)
  console.log(`🏢 Zespoły: ${[frontendTeam.name, backendTeam.name, devopsTeam.name].length}`)
  console.log(`📁 Projekty: ${[project1.name, project2.name, project3.name, project4.name].length}`)
  console.log(`📋 Zadania: ${tasks.length}`)
  console.log(`📝 Podzadania: ${subtasks.length}`)
  console.log(`💬 Komentarze: ${comments.length}`)
  console.log(`⏱️ Wpisy czasu: ${timeEntries.length}`)
  console.log(`📄 Dokumenty: ${documents.length}`)
  console.log(`🔄 Zmiany systemowe: ${systemChanges.length}`)
  console.log(`✅ Zadania do wykonania: ${todos.length}`)
  console.log(`🏷️ Statusy zadań: ${taskStatuses.length}`)
  console.log(`💭 Pokoje czatu: 5 (Ogólny, Projekt E-commerce, Bankowość Mobilna, Zespół DevOps, Bezpośredni)`)
  console.log(`📨 Wiadomości czatu: ${allMessages.length}`)

  console.log('\n🔑 Dane logowania:')
  console.log('Admin: admin@techsolutions.com / admin123')
  console.log('Użytkownicy: marek.nowak@techsolutions.com, zofia.wisniewska@techsolutions.com, piotr.dabrowski@techsolutions.com, katarzyna.zielinska@techsolutions.com, tomasz.wojcik@techsolutions.com / password123')

  console.log('\n🎯 Przykładowe dane zawierają:')
  console.log('• Role użytkowników i szczegółowe profile skoncentrowane na IT')
  console.log('• Zespoły odzwierciedlające działy IT (Frontend, Backend, DevOps)')
  console.log('• Różnorodne projekty IT (E-commerce, Bankowość Mobilna, Chatbot AI, Migracja do Chmury)')
  console.log('• Zadania w różnych etapach rozwoju IT (Backlog, W Trakcie, Code Review, Testowanie, Zakończone, Zablokowane)')
  console.log('• Kompleksowe wpisy czasu dla zadań IT')
  console.log('• Podzadania i zadania do wykonania istotne dla rozwoju oprogramowania')
  console.log('• Komentarze i przykłady współpracy w kontekście IT')
  console.log('• Dokumenty projektowe, takie jak wymagania, specyfikacje API, przepływy UX, plany migracji')
  console.log('• Wpisy dziennika zmian systemu dla aktualizacji systemu IT')
  console.log('• Scenariusze IT z życia wzięte, w tym zablokowane zadania i ukończone prace')
  console.log('• Pokoje czatu: ogólny czat zespołu IT, czaty specyficzne dla projektu, zespół DevOps, wiadomości bezpośrednie')
  console.log('• Wiadomości czatu z wzmiankami, emoji i realistycznymi rozmowami zespołu IT')
  console.log('• Udział użytkowników w wielu pokojach czatu ze śledzeniem statusu przeczytania')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
