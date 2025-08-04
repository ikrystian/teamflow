import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetAndSeed() {
  try {
    console.log('🗑️ Czyszczenie istniejących danych...')

    // Usuń wszystkie dane w prawidłowej kolejności, aby przestrzegać ograniczeń kluczy obcych
    console.log('Usuwanie wiadomości...')
    await prisma.message.deleteMany() // Zależy od User i ChatRoom
    console.log('Wiadomości usunięte.')

    console.log('Usuwanie UserChatRoom...')
    await prisma.userChatRoom.deleteMany() // Zależy od User i ChatRoom
    console.log('UserChatRoom usunięte.')

    console.log('Usuwanie Todo...')
    await prisma.todo.deleteMany()
    console.log('Todo usunięte.')

    console.log('Usuwanie komentarzy...')
    await prisma.comment.deleteMany()
    console.log('Komentarze usunięte.')

    console.log('Usuwanie podzadań...')
    await prisma.subtask.deleteMany()
    console.log('Podzadania usunięte.')

    console.log('Usuwanie wpisów czasu...')
    await prisma.timeEntry.deleteMany()
    console.log('Wpisy czasu usunięte.')

    console.log('Usuwanie obrazków zadań...')
    await prisma.taskImage.deleteMany()
    console.log('Obrazki zadań usunięte.')

    console.log('Usuwanie zadań...')
    await prisma.task.deleteMany()
    console.log('Zadania usunięte.')

    console.log('Usuwanie dokumentów projektów...')
    await prisma.projectDocument.deleteMany()
    console.log('Dokumenty projektów usunięte.')

    console.log('Usuwanie projektów...')
    await prisma.project.deleteMany()
    console.log('Projekty usunięte.')

    console.log('Usuwanie statusów zadań...')
    await prisma.taskStatus.deleteMany()
    console.log('Statusy zadań usunięte.')

    console.log('Usuwanie zmian systemowych...')
    await prisma.systemChange.deleteMany()
    console.log('Zmiany systemowe usunięte.')

    console.log('Usuwanie sesji...')
    await prisma.session.deleteMany()
    console.log('Sesje usunięte.')

    console.log('Usuwanie kont...')
    await prisma.account.deleteMany()
    console.log('Konta usunięte.')

    console.log('Usuwanie pokoi czatu...')
    await prisma.chatRoom.deleteMany() // Zależy od User (createdById)
    console.log('Pokoje czatu usunięte.')

    // Pomiń VerificationToken, ponieważ może powodować problemy z niektórymi konfiguracjami PostgreSQL
    try {
      await prisma.verificationToken.deleteMany()
    } catch (error) {
      console.log('⚠️ Pomijanie czyszczenia VerificationToken (niekrytyczne)')
    }

    // Wyczyść relacje wiele-do-wielu
    console.log('Usuwanie relacji _TeamMembers...')
    await prisma.$executeRaw`DELETE FROM "_TeamMembers"`
    console.log('Relacje _TeamMembers usunięte.')

    console.log('Usuwanie zespołów...')
    await prisma.team.deleteMany()
    console.log('Zespoły usunięte.')

    console.log('Usuwanie użytkowników...')
    await prisma.user.deleteMany()
    console.log('Użytkownicy usunięci.')

    console.log('✅ Baza danych wyczyszczona pomyślnie!')

    console.log('🌱 Uruchamianie skryptu seedującego...')

    // Importuj i uruchom główną funkcję seedującą
    const { main } = await import('../prisma/seed')
    await main()

    console.log('🎉 Baza danych zresetowana i zasiedlona pomyślnie!')

  } catch (error) {
    console.error('❌ Błąd podczas resetowania i seedowania:', error)
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
