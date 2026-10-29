#!/bin/bash
# Pierwsze uruchomienie projektu po sklonowaniu repo:
# tworzy .env z env.example (z wygenerowanymi sekretami), instaluje zależności,
# startuje lokalne usługi (MongoDB, PostgreSQL, Redis, Mailpit — docker compose),
# zakłada kolekcje/indeksy MongoDB i uruchamia migracje PostgreSQL.
# Użycie: npm run setup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(dirname "$SCRIPT_DIR")"

secret() {
  openssl rand -base64 "$1" 2>/dev/null || node -e "console.log(require('crypto').randomBytes($1).toString('base64'))"
}

if [ ! -f .env ]; then
  cp env.example .env
  sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=\"$(secret 48)\"|" .env
  sed -i "s|^CAPTCHA_SECRET=.*|CAPTCHA_SECRET=\"$(secret 32)\"|" .env
  sed -i "s|^CRON_SECRET=.*|CRON_SECRET=\"$(secret 24)\"|" .env
  echo "Utworzono .env z env.example (z wygenerowanymi sekretami)"
fi

npm install

echo "Start usług (MongoDB, PostgreSQL, Redis, Mailpit)..."
docker compose up -d --wait

echo "Synchronizacja schematu Prisma (MongoDB)..."
npm run db:push

echo "Migracje PostgreSQL (konta, klienci, sejf)..."
npm run db:pg:migrate

echo "Gotowe. Uruchom: npm run dev"
echo "Konta sprzed scalenia logują się dotychczasowym hasłem (migracja przy pierwszym logowaniu)."
