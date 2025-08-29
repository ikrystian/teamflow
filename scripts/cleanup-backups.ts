import { readdirSync, statSync, unlinkSync } from 'fs'
import path from 'path'

async function cleanupBackups() {
  try {
    console.log('🧹 Rozpoczynam czyszczenie starych backup-ów...')

    const backupsDir = path.join(process.cwd(), 'backups')
    
    // Sprawdź czy folder istnieje
    try {
      const files = readdirSync(backupsDir)
      const backupFiles = files
        .filter(file => file.endsWith('.sql') && file.startsWith('database_backup_'))
        .map(file => {
          const filePath = path.join(backupsDir, file)
          const stats = statSync(filePath)
          return {
            name: file,
            path: filePath,
            date: stats.mtime,
            size: stats.size
          }
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sortuj od najnowszych

      console.log(`📋 Znaleziono ${backupFiles.length} plików backup`)

      if (backupFiles.length <= 5) {
        console.log('✅ Mniej niż 5 plików backup - nie ma potrzeby czyszczenia')
        return
      }

      // Zachowaj 5 najnowszych plików, usuń resztę
      const filesToKeep = backupFiles.slice(0, 5)
      const filesToDelete = backupFiles.slice(5)

      console.log(`📦 Zachowuję ${filesToKeep.length} najnowszych plików:`)
      filesToKeep.forEach(file => {
        const dateStr = file.date.toLocaleString('pl-PL')
        const sizeKB = Math.round(file.size / 1024)
        console.log(`  ✓ ${file.name} (${dateStr}, ${sizeKB}KB)`)
      })

      if (filesToDelete.length > 0) {
        console.log(`🗑️ Usuwam ${filesToDelete.length} starych plików:`)
        
        let totalSizeFreed = 0
        filesToDelete.forEach(file => {
          const dateStr = file.date.toLocaleString('pl-PL')
          const sizeKB = Math.round(file.size / 1024)
          console.log(`  🗑️ ${file.name} (${dateStr}, ${sizeKB}KB)`)
          
          unlinkSync(file.path)
          totalSizeFreed += file.size
        })

        const totalSizeFreedKB = Math.round(totalSizeFreed / 1024)
        console.log(`✅ Usunięto ${filesToDelete.length} plików, zwolniono ${totalSizeFreedKB}KB miejsca`)
      }

      console.log('🎉 Czyszczenie backup-ów zakończone pomyślnie!')

    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log('📁 Folder backups nie istnieje - nic do wyczyszczenia')
      } else {
        throw error
      }
    }

  } catch (error) {
    console.error('❌ Błąd podczas czyszczenia backup-ów:', error)
    process.exit(1)
  }
}

cleanupBackups()
