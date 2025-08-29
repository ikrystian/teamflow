# Database Backups

Ten folder zawiera kopie zapasowe bazy danych SQLite.

## Struktura plików

Pliki backup są nazywane według wzorca:
```
database_backup_YYYY-MM-DD_HH-MM-SS.sql
```

Gdzie:
- `YYYY-MM-DD` - data utworzenia backup
- `HH-MM-SS` - czas utworzenia backup

## Jak używać

### Eksport bazy danych (tworzenie backup)

**Przez interfejs administratora:**
1. Zaloguj się jako administrator
2. Przejdź do Ustawień → zakładka "Baza danych"
3. Kliknij przycisk "Eksportuj bazę"

**Przez terminal:**
```bash
npm run db:export
```

Ten skrypt:
- Sprawdza czy istnieje baza danych
- Tworzy folder `backups` jeśli nie istnieje
- Eksportuje całą bazę danych do pliku SQL z timestampem
- Wyświetla rozmiar utworzonego pliku

### Import bazy danych (przywracanie z backup)

```bash
npm run db:import
```

Ten skrypt:
- Wyświetla listę dostępnych plików backup
- Pozwala wybrać plik do przywrócenia
- Pyta o potwierdzenie (operacja jest nieodwracalna!)
- Usuwa obecną bazę danych
- Przywraca dane z wybranego backup
- Regeneruje klienta Prisma

## Uwagi bezpieczeństwa

⚠️ **WAŻNE**: Import bazy danych **całkowicie zastępuje** obecną bazę danych!

- Zawsze rób backup przed ważnymi operacjami
- Pliki backup zawierają wszystkie dane, w tym hasła użytkowników
- Nie udostępniaj plików backup publicznie
- Regularnie usuwaj stare pliki backup, aby zaoszczędzić miejsce

### Czyszczenie starych backup-ów

```bash
npm run db:cleanup
```

Ten skrypt:
- Zachowuje 5 najnowszych plików backup
- Usuwa starsze pliki automatycznie
- Wyświetla informacje o zwolnionym miejscu

## Automatyzacja

Możesz dodać tworzenie backup do swoich procesów CI/CD lub cron jobs:

```bash
# Codziennie o 2:00 w nocy - backup + czyszczenie
0 2 * * * cd /path/to/project && npm run db:export && npm run db:cleanup
```

## Rozwiązywanie problemów

### Błąd: "sqlite3: command not found"

Zainstaluj SQLite3:
```bash
# Ubuntu/Debian
sudo apt-get install sqlite3

# macOS
brew install sqlite3

# Windows
# Pobierz z https://sqlite.org/download.html
```

### Błąd: "Permission denied"

Sprawdź uprawnienia do folderu:
```bash
chmod 755 backups/
```
