# Nexus

Projekty, zadania i czas pracy zespołu razem z bazą klientów (CRM) i sejfem dostępów
szyfrowanym end-to-end — w jednej aplikacji, z jednym logowaniem.

- **Projekty:** kanban, zadania z podzadaniami, komentarze, załączniki, śledzenie czasu, raporty,
  automatyzacje GitHub (commity → zadania, opisy zmian przez AI), harmonogram Slacka, przypomnienia push.
- **Klienci i dostępy:** karta klienta (kontakty, domeny i SSL, notatki, historia, projekty),
  sejf dostępów (12 typów, historia wersji, załączniki, wpisy krytyczne ze step-upem), linki
  jednorazowe, prośby o dostęp od klientów, kondycja haseł, dziennik zdarzeń tylko do dopisywania.
- **Konta:** Better Auth — hasło, 2FA (TOTP), passkeys, logowanie Google/Microsoft, sesje.

Moduł klientów powstał jako osobny system „Dostępnik” i został włączony do Nexusa —
analiza, decyzje i instrukcja wdrożenia: [`docs/SCALENIE_CLIENTS.md`](docs/SCALENIE_CLIENTS.md),
specyfikacja modułu: [`docs/modul-klientow-specyfikacja.md`](docs/modul-klientow-specyfikacja.md).

## Stos

Next.js 16.4 (App Router, `proxy.ts`), React 19.3, TypeScript strict, Tailwind v4 + shadcn/ui,
**MongoDB + Prisma** (projekty i zadania), **PostgreSQL + Drizzle z Row Level Security**
(konta, klienci, sejf, dziennik), Better Auth, libsodium (Argon2id, XChaCha20-Poly1305, X25519),
TanStack Query, Zustand, next-intl, React Email, Redis (opcjonalnie), Vitest, Playwright.

## Uruchomienie lokalne

```bash
npm run setup     # .env z sekretami, zależności, MongoDB + PostgreSQL + Redis + Mailpit, schematy
npm run dev       # http://localhost:3000
```

Usługi z `docker-compose.yml`: MongoDB `27017`, PostgreSQL `5434`, Redis `6381`,
Mailpit SMTP `1027` / podgląd poczty http://localhost:8028.

| Polecenie | Opis |
|---|---|
| `npm run db:push` | schemat Prisma + indeksy częściowe w MongoDB |
| `npm run db:pg:migrate` | migracje PostgreSQL (właściciel schematu z `POSTGRES_MIGRATION_URL`) |
| `npm run db:pg:generate` | nowa migracja po zmianie `src/lib/db/schema.ts` |
| `npm run migrate:legacy [-- --purge]` | konta sprzed scalenia → Better Auth, import klientów do CRM |
| `npm run db:pg:seed` | dane demonstracyjne modułu klientów (tryb `saas` lub świeża instalacja) |
| `npm run lint` · `typecheck` · `test` · `build` | jakość, testy jednostkowe, build (`npm run ci` — wszystko) |
| `npm run test:e2e` | Playwright — kryteria akceptacji modułu klientów i test scalenia |

## Struktura

```
src/app/dashboard/…          moduł projektów (panel, zadania, projekty, raporty, ustawienia)
src/app/dashboard/(crm)/…    klienci, sejf, do przejrzenia, kondycja haseł, dziennik (bramka sejfu)
src/app/auth/…               logowanie, 2FA, rejestracja, hasło główne sejfu, odblokowanie
src/app/share|request|invite publiczne strony modułu klientów
src/lib/identity.ts          most kont: PostgreSQL (Better Auth) ↔ profil projektowy w MongoDB
src/lib/crm/…                klienci CRM w module projektów (katalog, projekty klienta)
src/lib/crypto, lib/vault    kryptografia i magazyn sejfu w przeglądarce (testy na wektorach RFC)
src/lib/dal, server/actions  warstwa danych modułu klientów (server-only, RLS, dziennik, step-up)
src/proxy.ts                 CSP z nonce, nagłówki bezpieczeństwa, przekierowanie niezalogowanych
```

Pozostałe dokumenty: [`SLACK_SCHEDULER_SETUP.md`](SLACK_SCHEDULER_SETUP.md),
[`AUTOMATYZACJE_GITHUB.txt`](AUTOMATYZACJE_GITHUB.txt), [`ANALIZA_PROJEKTU.md`](ANALIZA_PROJEKTU.md)
(analiza sprzed scalenia).
