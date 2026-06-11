#!/bin/bash
# Instaluje cron job dla automatycznych backupów bazy danych.
# Uruchom raz na serwerze produkcyjnym: ./scripts/setup-cron-backup.sh
# Wymaga: sqlite3, crontab

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/db-backup.sh"

chmod +x "$BACKUP_SCRIPT"

CRON_JOB_DAILY="0 2 * * * $BACKUP_SCRIPT daily >> $PROJECT_DIR/backups/backup.log 2>&1"
CRON_JOB_WEEKLY="0 3 * * 0 $BACKUP_SCRIPT weekly >> $PROJECT_DIR/backups/backup.log 2>&1"

# Nie dodawaj duplikatów
add_cron() {
  local job="$1"
  (crontab -l 2>/dev/null | grep -qF "$BACKUP_SCRIPT") \
    && echo "Cron już skonfigurowany." \
    || (crontab -l 2>/dev/null; echo "$job") | crontab -
}

mkdir -p "$PROJECT_DIR/backups/db"

add_cron "$CRON_JOB_DAILY"
add_cron "$CRON_JOB_WEEKLY"

echo "Zainstalowane cron joby:"
crontab -l | grep "$BACKUP_SCRIPT" || true

echo ""
echo "Backupy będą tworzone:"
echo "  - Codziennie o 02:00 (retencja 30 dni)"
echo "  - Co niedzielę o 03:00"
echo "  - Log: $PROJECT_DIR/backups/backup.log"
