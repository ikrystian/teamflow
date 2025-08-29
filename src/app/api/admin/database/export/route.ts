import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// POST /api/admin/database/export - Export database (admin only)
export async function POST() {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    console.log('🔐 Admin database export initiated by:', session.user.email)

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

    const backupFileName = `database_backup_${timestamp}.sql`
    const backupPath = path.join(backupsDir, backupFileName)

    console.log(`💾 Exporting database to: ${backupFileName}`)

    // Sprawdź ile danych jest w bazie przed eksportem
    const tableCountsCommand = `sqlite3 "${dbPath}" "SELECT 'User: ' || COUNT(*) FROM User UNION ALL SELECT 'Team: ' || COUNT(*) FROM Team UNION ALL SELECT 'Project: ' || COUNT(*) FROM Project UNION ALL SELECT 'Task: ' || COUNT(*) FROM Task UNION ALL SELECT 'Todo: ' || COUNT(*) FROM Todo UNION ALL SELECT 'Comment: ' || COUNT(*) FROM Comment UNION ALL SELECT 'TimeEntry: ' || COUNT(*) FROM TimeEntry;"`

    try {
      const { stdout: tableCounts } = await execAsync(tableCountsCommand)
      console.log('📊 Data counts before export:')
      tableCounts.split('\n').filter(line => line.trim()).forEach(line => {
        console.log(`   ${line}`)
      })
    } catch (error) {
      console.log('⚠️ Could not get table counts:', error)
    }

    // Wykonaj pełny dump bazy danych SQLite (struktura + wszystkie dane)
    const command = `sqlite3 "${dbPath}" ".dump" > "${backupPath}"`

    await execAsync(command)

    // Sprawdź ile INSERT statements zostało wyeksportowanych
    try {
      const { stdout: insertCount } = await execAsync(`grep -c "INSERT INTO" "${backupPath}" || echo "0"`)
      console.log(`📝 Exported ${insertCount.trim()} INSERT statements (data records)`)
    } catch (error) {
      console.log('⚠️ Could not count INSERT statements')
    }

    // Sprawdź rozmiar pliku
    const { stdout } = await execAsync(`ls -lh "${backupPath}"`)
    const fileSize = stdout.split(/\s+/)[4]

    console.log('✅ Database export completed successfully!')
    console.log(`📄 Backup file: ${backupPath}`)
    console.log(`📊 File size: ${fileSize}`)

    // Pobierz liczbę wyeksportowanych rekordów dla odpowiedzi
    let exportedRecords = 0
    try {
      const { stdout: insertCount } = await execAsync(`grep -c "INSERT INTO" "${backupPath}" || echo "0"`)
      exportedRecords = parseInt(insertCount.trim()) || 0
    } catch (error) {
      console.log('⚠️ Could not count exported records for response')
    }

    return NextResponse.json({
      success: true,
      message: "Baza danych została pomyślnie wyeksportowana (struktura + wszystkie dane)",
      fileName: backupFileName,
      fileSize: fileSize,
      exportedRecords: exportedRecords,
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
