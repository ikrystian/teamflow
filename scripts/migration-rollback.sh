#!/bin/bash
# Rollback ostatniej migracji Prisma przez przywrócenie backupu pre-deploy.
# Użycie: ./scripts/migration-rollback.sh [plik_backupu]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/db}"

find_latest_predeploy() {
  ls -t "$BACKUP_DIR"/db_*_pre-deploy.db 2>/dev/null | head -1
}

if [ $# -eq 0 ]; then
  BACKUP_FILE=$(find_latest_predeploy)
  if [ -z "$BACKUP_FILE" ]; then
    echo "ERROR: Nie znaleziono backupu pre-deploy w $BACKUP_DIR"
    echo "Użycie: $0 <plik_backupu>"
    echo ""
    echo "Dostępne backupy:"
    ls -lht "$BACKUP_DIR"/db_*.db 2>/dev/null | head -10 || echo "  Brak backupów"
    exit 1
  fi
  echo "Znaleziono najnowszy backup pre-deploy: $BACKUP_FILE"
else
  BACKUP_FILE="$1"
fi

# Wyświetl aktualną ostatnią migrację dla informacji
echo ""
echo "=== Stan przed rollbackiem ==="
DB_PATH="${DATABASE_URL:-file:./prisma/dev.db}"
DB_PATH="${DB_PATH#file:}"
if [[ "$DB_PATH" != /* ]]; then
  if [[ "$DB_PATH" != *prisma* ]]; then
    DB_PATH="prisma/$DB_PATH"
  fi
  DB_PATH="$PROJECT_DIR/$DB_PATH"
fi

if [ -f "$DB_PATH" ] && command -v sqlite3 &>/dev/null; then
  echo "Ostatnie migracje:"
  sqlite3 "$DB_PATH" \
    "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;" \
    2>/dev/null || echo "  (brak danych)"
fi

echo ""
read -r -p "Czy przywrócić backup '$BACKUP_FILE'? [tak/N] " CONFIRM
if [ "$CONFIRM" != "tak" ]; then
  echo "Anulowano."
  exit 0
fi

"$SCRIPT_DIR/db-restore.sh" "$BACKUP_FILE"

echo ""
echo "=== Stan po rollbacku ==="
if [ -f "$DB_PATH" ] && command -v sqlite3 &>/dev/null; then
  echo "Ostatnie migracje:"
  sqlite3 "$DB_PATH" \
    "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;" \
    2>/dev/null || echo "  (brak danych)"
fi

echo ""
echo "Rollback zakończony. Zrestartuj aplikację jeśli działa w tle."
