#!/bin/bash
# Pierwsze uruchomienie projektu po sklonowaniu repo:
# tworzy .env z env.example, instaluje zależności, startuje lokalne MongoDB
# (docker compose) i zakłada kolekcje/indeksy.
# Użycie: npm run setup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(dirname "$SCRIPT_DIR")"

if [ ! -f .env ]; then
  cp env.example .env
  SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$SECRET\"|" .env
  echo "Utworzono .env z env.example (z wygenerowanym NEXTAUTH_SECRET)"
fi

npm install

echo "Start MongoDB..."
docker compose up -d --wait

echo "Synchronizacja schematu Prisma..."
npm run db:push

echo "Gotowe. Uruchom: npm run dev"
