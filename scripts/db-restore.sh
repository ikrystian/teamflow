#!/bin/bash
# Przywraca bazę danych z backupu.
# Użycie: ./scripts/db-restore.sh [plik_backupu]
# Bez argumentu - wyświetla listę dostępnych backupów.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

DB_PATH="${DATABASE_URL:-file:./prisma/dev.db}"
DB_PATH="${DB_PATH#file:}"
if [[ "$DB_PATH" != /* ]]; then
  if [[ "$DB_PATH" != *prisma* ]]; then
    DB_PATH="prisma/$DB_PATH"
  fi
  DB_PATH="$PROJECT_DIR/$DB_PATH"
fi

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/db}"

if [ $# -eq 0 ]; then
  echo "Dostępne backupy:"
  ls -lht "$BACKUP_DIR"/db_*.db 2>/dev/null | head -20 \
    || echo "  Brak backupów w $BACKUP_DIR"
  echo ""
  echo "Użycie: $0 <plik_backupu>"
  exit 0
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  # Try resolving relative to BACKUP_DIR
  BACKUP_FILE="$BACKUP_DIR/$1"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Plik backupu nie istnieje: $1" >&2
  exit 1
fi

# Zabezpieczenie - zrób backup aktualnego stanu przed nadpisaniem
SAFETY_BACKUP="$BACKUP_DIR/db_$(date +"%Y%m%d_%H%M%S")_pre-restore.db"
if [ -f "$DB_PATH" ]; then
  if command -v sqlite3 &>/dev/null; then
    sqlite3 "$DB_PATH" ".backup '$SAFETY_BACKUP'"
  else
    cp "$DB_PATH" "$SAFETY_BACKUP"
  fi
  echo "Aktualny stan zabezpieczony w: $SAFETY_BACKUP"
fi

# Przywróć backup
if command -v sqlite3 &>/dev/null; then
  sqlite3 "$BACKUP_FILE" ".backup '$DB_PATH'"
else
  cp "$BACKUP_FILE" "$DB_PATH"
fi

echo "Przywrócono bazę z: $BACKUP_FILE"
echo "Aby cofnąć: $0 $SAFETY_BACKUP"
