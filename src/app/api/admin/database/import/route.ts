import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readdirSync, statSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// GET /api/admin/database/backups - List available backup files (admin only)
export async function GET() {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const backupsDir = path.join(process.cwd(), 'backups')
    
    if (!existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] })
    }

    const files = readdirSync(backupsDir)
      .filter(file => file.endsWith('.sql') && file.startsWith('database_backup_'))
      .map(file => {
        const filePath = path.join(backupsDir, file)
        const stats = statSync(filePath)
        return {
          name: file,
          size: stats.size,
          date: stats.mtime.toISOString(),
          sizeFormatted: `${Math.round(stats.size / 1024)}KB`
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sortuj od najnowszych

    return NextResponse.json({ backups: files })

  } catch (error) {
    console.error('❌ Error listing backup files:', error)
    return NextResponse.json({ 
      error: "Błąd podczas pobierania listy plików backup",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// POST /api/admin/database/import - Import database from backup (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { fileName } = await request.json()

    if (!fileName) {
      return NextResponse.json({ error: "Nazwa pliku jest wymagana" }, { status: 400 })
    }

    console.log('🔐 Admin database import initiated by:', session.user.email)
    console.log('📄 Import file:', fileName)

    const backupsDir = path.join(process.cwd(), 'backups')
    const backupPath = path.join(backupsDir, fileName)

    // Sprawdź czy plik backup istnieje
    if (!existsSync(backupPath)) {
      console.error('❌ Backup file not found:', backupPath)
      return NextResponse.json({ error: "Plik backup nie został znaleziony" }, { status: 404 })
    }

    // Sprawdź czy nazwa pliku jest bezpieczna (tylko pliki backup)
    if (!fileName.endsWith('.sql') || !fileName.startsWith('database_backup_')) {
      return NextResponse.json({ error: "Nieprawidłowy format pliku backup" }, { status: 400 })
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

    console.log('🗑️ Removing current database...')
    
    // Usuń obecną bazę danych
    if (existsSync(dbPath)) {
      await execAsync(`rm "${dbPath}"`)
      console.log('✅ Current database removed')
    }

    console.log('📥 Importing data from backup...')

    // Importuj dane z pliku backup
    const command = `sqlite3 "${dbPath}" < "${backupPath}"`
    await execAsync(command)

    console.log('🔄 Regenerating Prisma client...')

    // Wygeneruj klienta Prisma
    await execAsync('npx prisma generate')

    console.log('✅ Database import completed successfully!')

    return NextResponse.json({
      success: true,
      message: "Baza danych została pomyślnie przywrócona z backup",
      fileName: fileName,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error during database import:', error)
    return NextResponse.json({ 
      error: "Błąd podczas importu bazy danych",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
