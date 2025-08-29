import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readdirSync, statSync } from 'fs'
import path from 'path'
import readline from 'readline'

const execAsync = promisify(exec)

// Funkcja do wyboru pliku backup
async function selectBackupFile(): Promise<string> {
  const backupsDir = path.join(process.cwd(), 'backups')
  
  if (!existsSync(backupsDir)) {
    console.error('❌ Folder backups nie istnieje. Najpierw wykonaj eksport bazy danych.')
    process.exit(1)
  }

  const files = readdirSync(backupsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      const filePath = path.join(backupsDir, file)
      const stats = statSync(filePath)
      return {
        name: file,
        path: filePath,
        date: stats.mtime
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sortuj od najnowszych

  if (files.length === 0) {
    console.error('❌ Nie znaleziono plików backup w folderze backups/')
    process.exit(1)
  }

  console.log('\n📋 Dostępne pliki backup:')
  files.forEach((file, index) => {
    const dateStr = file.date.toLocaleString('pl-PL')
    console.log(`${index + 1}. ${file.name} (${dateStr})`)
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('\n🔢 Wybierz numer pliku do importu (lub naciśnij Enter dla najnowszego): ', (answer) => {
      rl.close()
      
      if (!answer.trim()) {
        resolve(files[0].path) // Najnowszy plik
      } else {
        const index = parseInt(answer) - 1
        if (index >= 0 && index < files.length) {
          resolve(files[index].path)
        } else {
          console.error('❌ Nieprawidłowy numer pliku')
          process.exit(1)
        }
      }
    })
  })
}

// Funkcja do potwierdzenia operacji
async function confirmImport(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('\n⚠️  UWAGA: Ta operacja zastąpi całą obecną bazę danych!\nCzy chcesz kontynuować? (tak/nie): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'tak' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function importDatabase() {
  try {
    console.log('📥 Rozpoczynam import bazy danych...')

    // Wybierz plik backup
    const backupPath = await selectBackupFile()
    console.log(`\n📄 Wybrany plik: ${path.basename(backupPath)}`)

    // Potwierdź operację
    const confirmed = await confirmImport()
    if (!confirmed) {
      console.log('❌ Import anulowany przez użytkownika')
      process.exit(0)
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

    console.log('\n🗑️ Usuwam obecną bazę danych...')
    
    // Usuń obecną bazę danych
    if (existsSync(dbPath)) {
      await execAsync(`rm "${dbPath}"`)
      console.log('✅ Obecna baza danych usunięta')
    }

    console.log('📥 Importuję dane z backup...')

    // Importuj dane z pliku backup
    const command = `sqlite3 "${dbPath}" < "${backupPath}"`
    await execAsync(command)

    console.log('✅ Import bazy danych zakończony pomyślnie!')
    console.log('🔄 Uruchamiam generowanie klienta Prisma...')

    // Wygeneruj klienta Prisma
    await execAsync('npx prisma generate')

    console.log('🎉 Baza danych została pomyślnie przywrócona z backup!')

  } catch (error) {
    console.error('❌ Błąd podczas importu bazy danych:', error)
    process.exit(1)
  }
}

importDatabase()
