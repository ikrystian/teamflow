"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Database, Download, Upload, AlertTriangle, CheckCircle, FileText, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

interface BackupFile {
  name: string
  size: number
  date: string
  sizeFormatted: string
}

export function DatabaseManagement() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isLoadingBackups, setIsLoadingBackups] = useState(false)
  const [availableBackups, setAvailableBackups] = useState<BackupFile[]>([])
  const [selectedBackup, setSelectedBackup] = useState<string>("")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [lastExport, setLastExport] = useState<{
    fileName: string
    fileSize: string
    timestamp: string
  } | null>(null)
  const [lastImport, setLastImport] = useState<{
    fileName: string
    timestamp: string
  } | null>(null)

  // Pobierz listę dostępnych backup-ów
  const fetchAvailableBackups = async () => {
    setIsLoadingBackups(true)
    try {
      const response = await fetch('/api/admin/database/import')
      const data = await response.json()

      if (response.ok) {
        setAvailableBackups(data.backups || [])
      } else {
        toast.error("Błąd podczas pobierania listy backup-ów", {
          description: data.error || "Nieznany błąd"
        })
      }
    } catch (error) {
      console.error('Error fetching backups:', error)
      toast.error("Błąd podczas pobierania listy backup-ów")
    } finally {
      setIsLoadingBackups(false)
    }
  }

  // Załaduj listę backup-ów przy pierwszym renderze
  useEffect(() => {
    fetchAvailableBackups()
  }, [])

  const handleExportDatabase = async () => {
    setIsExporting(true)

    try {
      const response = await fetch('/api/admin/database/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setLastExport({
          fileName: data.fileName,
          fileSize: data.fileSize,
          timestamp: data.timestamp
        })

        const recordsInfo = data.exportedRecords ? ` • ${data.exportedRecords} rekordów danych` : ''
        toast.success("Eksport bazy danych zakończony pomyślnie!", {
          description: `Plik: ${data.fileName} (${data.fileSize})${recordsInfo}`
        })

        // Odśwież listę backup-ów po eksporcie
        fetchAvailableBackups()
      } else {
        toast.error("Błąd podczas eksportu bazy danych", {
          description: data.error || "Nieznany błąd"
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error("Błąd podczas eksportu bazy danych", {
        description: "Sprawdź połączenie internetowe i spróbuj ponownie"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportDatabase = async () => {
    if (!selectedBackup) {
      toast.error("Wybierz plik backup do importu")
      return
    }

    setIsImporting(true)

    try {
      const response = await fetch('/api/admin/database/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: selectedBackup })
      })

      const data = await response.json()

      if (response.ok) {
        setLastImport({
          fileName: data.fileName,
          timestamp: data.timestamp
        })

        toast.success("Import bazy danych zakończony pomyślnie!", {
          description: `Przywrócono z pliku: ${data.fileName}`
        })

        setImportDialogOpen(false)
        setSelectedBackup("")

        // Informuj użytkownika o konieczności odświeżenia strony
        toast.info("Odśwież stronę aby zobaczyć zmiany", {
          description: "Baza danych została przywrócona",
          duration: 10000
        })
      } else {
        toast.error("Błąd podczas importu bazy danych", {
          description: data.error || "Nieznany błąd"
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error("Błąd podczas importu bazy danych", {
        description: "Sprawdź połączenie internetowe i spróbuj ponownie"
      })
    } finally {
      setIsImporting(false)
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Zarządzanie bazą danych
        </CardTitle>
        <CardDescription>
          Eksportuj kopię zapasową bazy danych lub zarządzaj istniejącymi backup-ami
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ważne:</strong> Pliki backup zawierają wszystkie dane systemu, w tym hasła użytkowników.
            Przechowuj je w bezpiecznym miejscu i nie udostępniaj publicznie.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Eksport bazy danych */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <h4 className="font-medium">Eksport bazy danych</h4>
              <p className="text-sm text-muted-foreground">
                Utwórz kopię zapasową całej bazy danych w formacie SQL
              </p>
            </div>
            <Button
              onClick={handleExportDatabase}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eksportuję...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Eksportuj bazę
                </>
              )}
            </Button>
          </div>

          {/* Import bazy danych */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <h4 className="font-medium">Import bazy danych</h4>
              <p className="text-sm text-muted-foreground">
                Przywróć bazę danych z wcześniej utworzonego backup
              </p>
              {availableBackups.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Dostępne backup-y: {availableBackups.length}
                </p>
              )}
            </div>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={availableBackups.length === 0 || isLoadingBackups}
                  className="flex items-center gap-2"
                  onClick={() => fetchAvailableBackups()}
                >
                  {isLoadingBackups ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ładuję...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Importuj bazę
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import bazy danych
                  </DialogTitle>
                  <DialogDescription>
                    <strong className="text-red-600">UWAGA:</strong> Ta operacja całkowicie zastąpi obecną bazę danych.
                    Wszystkie niezapisane zmiany zostaną utracone.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Wybierz plik backup:</label>
                    <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz plik backup..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBackups.map((backup) => (
                          <SelectItem key={backup.name} value={backup.name}>
                            <div className="flex items-center gap-2 w-full">
                              <FileText className="h-4 w-4" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {backup.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(backup.date)} • {backup.sizeFormatted}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(false)
                      setSelectedBackup("")
                    }}
                    disabled={isImporting}
                  >
                    Anuluj
                  </Button>
                  <Button
                    onClick={handleImportDatabase}
                    disabled={!selectedBackup || isImporting}
                    className="flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importuję...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Importuj bazę
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status ostatniego eksportu */}
          {lastExport && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-green-900">Ostatni eksport zakończony pomyślnie</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Plik:</strong> {lastExport.fileName}</p>
                    <p><strong>Rozmiar:</strong> {lastExport.fileSize}</p>
                    <p><strong>Data:</strong> {formatDate(lastExport.timestamp)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status ostatniego importu */}
          {lastImport && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-blue-900">Ostatni import zakończony pomyślnie</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Plik:</strong> {lastImport.fileName}</p>
                    <p><strong>Data:</strong> {formatDate(lastImport.timestamp)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium">Zarządzanie przez terminal</h4>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-700">
                Możesz również zarządzać backup-ami przez terminal:
              </p>
              <div className="space-y-1 text-sm font-mono bg-gray-900 text-gray-100 p-3 rounded">
                <div># Eksport bazy danych</div>
                <div className="text-green-400">npm run db:export</div>
                <div className="mt-2"># Import bazy danych (interaktywny wybór)</div>
                <div className="text-green-400">npm run db:import</div>
                <div className="mt-2"># Czyszczenie starych backup-ów</div>
                <div className="text-green-400">npm run db:cleanup</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Wskazówki</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pliki backup są zapisywane w folderze <code className="bg-blue-100 px-1 rounded">backups/</code></li>
              <li>• Nazwa pliku zawiera timestamp: <code className="bg-blue-100 px-1 rounded">database_backup_YYYY-MM-DD_HH-MM-SS.sql</code></li>
              <li>• Import bazy danych całkowicie zastępuje obecne dane</li>
              <li>• Po imporcie odśwież stronę, aby zobaczyć zmiany</li>
              <li>• Użyj <code className="bg-blue-100 px-1 rounded">npm run db:cleanup</code> aby usunąć stare backup-y</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
