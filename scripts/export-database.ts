import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

async function exportDatabase() {
  try {
    console.log('📦 Rozpoczynam eksport bazy danych...')

    // Sprawdź czy istnieje plik bazy danych
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
    if (!existsSync(dbPath)) {
      console.error('❌ Plik bazy danych nie istnieje:', dbPath)
      process.exit(1)
    }

    // Utwórz folder backups jeśli nie istnieje
    const backupsDir = path.join(process.cwd(), 'backups')
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true })
      console.log('📁 Utworzono folder backups')
    }

    // Wygeneruj nazwę pliku z timestampem
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .replace('T', '_')
      .slice(0, 19) // YYYY-MM-DD_HH-MM-SS
    
    const backupFileName = `database_backup_${timestamp}.sql`
    const backupPath = path.join(backupsDir, backupFileName)

    console.log(`💾 Eksportuję bazę danych do: ${backupFileName}`)

    // Wykonaj dump bazy danych SQLite
    const command = `sqlite3 "${dbPath}" .dump > "${backupPath}"`
    
    await execAsync(command)

    console.log('✅ Eksport bazy danych zakończony pomyślnie!')
    console.log(`📄 Plik backup: ${backupPath}`)

    // Wyświetl rozmiar pliku
    const { stdout } = await execAsync(`ls -lh "${backupPath}"`)
    const fileSize = stdout.split(/\s+/)[4]
    console.log(`📊 Rozmiar pliku: ${fileSize}`)

  } catch (error) {
    console.error('❌ Błąd podczas eksportu bazy danych:', error)
    process.exit(1)
  }
}

exportDatabase()
