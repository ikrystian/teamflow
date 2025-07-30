import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding system changes...')

  // Find admin user (krystian@bpcoders.pl) or any user with admin role
  let adminUser = await prisma.user.findUnique({
    where: { email: 'krystian@bpcoders.pl' }
  })

  if (!adminUser) {
    // Try to find any admin user
    adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    })
  }

  if (!adminUser) {
    // Try to find any user
    adminUser = await prisma.user.findFirst()
  }

  if (!adminUser) {
    console.error('No users found. Please run the main seed script first.')
    return
  }

  console.log(`Using user: ${adminUser.email} (${adminUser.role})`)

  // Create sample system changes
  const systemChanges = [
    {
      title: 'Nowa funkcjonalność: Prawy sidebar z ostatnimi zmianami',
      description: 'Dodano prawy sidebar o szerokości 400px z możliwością zwinięcia, który wyświetla ostatnie zmiany systemowe.',
      type: 'success' as const,
      isVisible: true,
      createdById: adminUser.id
    },
    {
      title: 'Aktualizacja: Ulepszona nawigacja dla administratorów',
      description: 'Administratorzy mają teraz dostęp do nowej sekcji "Administracja" w lewym sidebarze.',
      type: 'info' as const,
      isVisible: true,
      createdById: adminUser.id
    },
    {
      title: 'Ostrzeżenie: Planowana konserwacja systemu',
      description: 'W najbliższą sobotę planowana jest konserwacja systemu między 2:00 a 4:00. Mogą wystąpić krótkie przerwy w dostępności.',
      type: 'warning' as const,
      isVisible: true,
      createdById: adminUser.id
    },
    {
      title: 'Nowa funkcja: Zarządzanie zmianami systemowymi',
      description: 'Administratorzy mogą teraz dodawać, edytować i usuwać zmiany systemowe bezpośrednio z interfejsu.',
      type: 'success' as const,
      isVisible: true,
      createdById: adminUser.id
    },
    {
      title: 'Informacja: Aktualizacja dokumentacji',
      description: 'Dokumentacja została zaktualizowana o nowe funkcjonalności związane z zarządzaniem projektami.',
      type: 'info' as const,
      isVisible: true,
      createdById: adminUser.id
    }
  ]

  for (const change of systemChanges) {
    await prisma.systemChange.create({
      data: change
    })
    console.log(`Created system change: ${change.title}`)
  }

  console.log('System changes seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
