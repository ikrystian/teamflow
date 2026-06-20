#!/bin/bash
# Tworzy timestampowany backup SQLite, zachowuje ostatnie N kopii.
# Użycie: ./scripts/db-backup.sh [label]
# Przykład: ./scripts/db-backup.sh pre-deploy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

DB_PATH="${DATABASE_URL:-file:./prisma/dev.db}"
DB_PATH="${DB_PATH#file:}"
# Resolve relative path from project root
if [[ "$DB_PATH" != /* ]]; then
  if [[ "$DB_PATH" != *prisma* ]]; then
    DB_PATH="prisma/$DB_PATH"
  fi
  DB_PATH="$PROJECT_DIR/$DB_PATH"
fi

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups/db}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
LABEL="${1:-manual}"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: Baza danych nie istnieje: $DB_PATH" >&2
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_${TIMESTAMP}_${LABEL}.db"

# sqlite3 .backup jest bezpieczne przy aktywnych połączeniach
if command -v sqlite3 &>/dev/null; then
  sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
else
  cp "$DB_PATH" "$BACKUP_FILE"
fi

echo "Backup zapisany: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Rotacja - usuń stare backupy
DELETED=$(find "$BACKUP_DIR" -name "db_*.db" -mtime +"$KEEP_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "Usunięto $DELETED backupów starszych niż ${KEEP_DAYS}d"
fi

echo "$BACKUP_FILE"
