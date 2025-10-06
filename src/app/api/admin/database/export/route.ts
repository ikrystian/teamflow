import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// POST /api/admin/database/export - Export database (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    // Odczytaj format z body (domyślnie 'sql')
    let format: 'sql' | 'db' = 'sql'
    try {
      const body = await request.json().catch(() => null as unknown as { format?: string })
      if (body?.format === 'db') format = 'db'
    } catch {}

    console.log('🔐 Admin database export initiated by:', session.user.email, '| format:', format)

    // Sprawdź czy istnieje plik bazy danych
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
    if (!existsSync(dbPath)) {
      console.error('❌ Database file not found:', dbPath)
      return NextResponse.json({ error: "Database file not found" }, { status: 404 })
    }

    // Utwórz folder backups jeśli nie istnieje
    const backupsDir = path.join(process.cwd(), 'backups')
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true })
      console.log('📁 Created backups directory')
    }

    // Wygeneruj nazwę pliku z timestampem
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .replace('T', '_')
      .slice(0, 19) // YYYY-MM-DD_HH-MM-SS

    const backupFileName = `database_backup_${timestamp}.${format}`
    const backupPath = path.join(backupsDir, backupFileName)

    console.log(`💾 Exporting database to: ${backupFileName}`)

    // Sprawdź ile danych jest w bazie przed eksportem (log)
    const tableCountsCommand = `sqlite3 "${dbPath}" "SELECT 'User: ' || COUNT(*) FROM User UNION ALL SELECT 'Team: ' || COUNT(*) FROM Team UNION ALL SELECT 'Project: ' || COUNT(*) FROM Project UNION ALL SELECT 'Task: ' || COUNT(*) FROM Task UNION ALL SELECT 'Todo: ' || COUNT(*) FROM Todo UNION ALL SELECT 'Comment: ' || COUNT(*) FROM Comment UNION ALL SELECT 'TimeEntry: ' || COUNT(*) FROM TimeEntry;"`

    try {
      const { stdout: tableCounts } = await execAsync(tableCountsCommand)
      console.log('📊 Data counts before export:')
      tableCounts.split('\n').filter(line => line.trim()).forEach(line => {
        console.log(`   ${line}`)
      })
    } catch (error: unknown) {
      console.log('⚠️ Could not get table counts:', error instanceof Error ? error.message : error)
    }

    if (format === 'sql') {
      // Pełny dump bazy SQLite (struktura + dane)
      const command = `sqlite3 "${dbPath}" ".dump" > "${backupPath}"`
      await execAsync(command)

      // Sprawdź ile INSERT statements zostało wyeksportowanych
      try {
        const { stdout: insertCount } = await execAsync(`grep -c "INSERT INTO" "${backupPath}" || echo "0"`)
        console.log(`📝 Exported ${insertCount.trim()} INSERT statements (data records)`)
      } catch (error: unknown) {
        console.log('⚠️ Could not count INSERT statements:', error instanceof Error ? error.message : error)
      }
    } else {
      // Binarny backup bazy (szybsze przywracanie)
      try {
        // Preferuj .backup
        await execAsync(`sqlite3 "${dbPath}" ".backup '${backupPath}'"`)
      } catch (e) {
        console.log('⚠️ .backup failed, trying VACUUM INTO...', e instanceof Error ? e.message : e)
        // Fallback do VACUUM INTO (SQLite 3.27+)
        await execAsync(`sqlite3 "${dbPath}" "VACUUM INTO '${backupPath}'"`)
      }
    }

    // Sprawdź rozmiar pliku
    const { stdout } = await execAsync(`ls -lh "${backupPath}"`)
    const fileSize = stdout.split(/\s+/)[4]

    console.log('✅ Database export completed successfully!')
    console.log(`📄 Backup file: ${backupPath}`)
    console.log(`📊 File size: ${fileSize}`)

    // Pobierz liczbę wyeksportowanych rekordów dla odpowiedzi (tylko dla SQL dump)
    let exportedRecords = 0
    if (format === 'sql') {
      try {
        const { stdout: insertCount } = await execAsync(`grep -c "INSERT INTO" "${backupPath}" || echo "0"`)
        exportedRecords = parseInt(insertCount.trim()) || 0
      } catch (error) {
        console.log('⚠️ Could not count exported records for response')
      }
    }

    return NextResponse.json({
      success: true,
      message: format === 'sql'
        ? "Baza danych została pomyślnie wyeksportowana (SQL dump: struktura + dane)"
        : "Baza danych została pomyślnie wyeksportowana (binarny plik .db)",
      fileName: backupFileName,
      fileSize: fileSize,
      exportedRecords: exportedRecords,
      format,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error during database export:', error)
    return NextResponse.json({
      error: "Błąd podczas eksportu bazy danych",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
