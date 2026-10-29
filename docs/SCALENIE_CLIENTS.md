# Scalenie: Nexus + moduł klientów i sejfu (dawniej „Dostępnik”)

Dokument opisuje analizę obu systemów, przyjętą architekturę, mapę połączonych funkcji,
kroki wdrożenia na produkcji oraz problemy wykryte przy okazji. Specyfikacja modułu
klientów (rozdziały, na które powołują się komentarze w kodzie): [`modul-klientow-specyfikacja.md`](modul-klientow-specyfikacja.md).

## 1. Analiza wyjściowa

| | Nexus (host) | Clients / Dostępnik (moduł) |
|---|---|---|
| Przeznaczenie | Zarządzanie projektami: kanban, zadania, czas pracy, raporty, GitHub/AI, Slack, web push | CRM klientów + sejf dostępów szyfrowany end-to-end, udostępnianie, kondycja haseł, dziennik zdarzeń |
| Next.js / React | 16.2.7 / 19.2.7 | 16.4.3 / 19.3.0 |
| Baza | MongoDB (Prisma 6.19), 21 modeli | PostgreSQL 18 (Drizzle) z Row Level Security, dziennik tylko do dopisywania |
| Logowanie | NextAuth v4 (hasło, JWT, bcrypt) | Better Auth (hasło, TOTP, passkeys, Google/Microsoft, step-up) |
| UI | shadcn „new-york” (motyw w stylu Linear) | shadcn „radix-nova”, next-intl |
| Testy | brak | 126 testów jednostkowych, Playwright (kryteria akceptacji) |
| Stan | produkcja (MongoDB, PM2) | nigdy nie wdrożony, kod niezacommitowany |

**Części wspólne i konflikty:** dwa modele „klienta” (prosty `Client` w Mongo i pełny CRM w PG),
dwa systemy kont, kolizje tras (`/dashboard`, `/api/clients`, `/api/auth`), dwie palety
`Ctrl+K`, dwa zestawy ustawień, dwa mechanizmy powiadomień, ta sama zmienna `DATABASE_URL`
dla dwóch różnych baz, jawne „dane dostępowe” w projektach nexusa (HTML w Mongo, renderowany
bez sanitizacji) obok sejfu E2E.

## 2. Decyzje architektoniczne

1. **Nexus jest hostem, moduł klientów jest jego częścią** — jedna aplikacja Next.js 16.4.3,
   jeden proces, jeden design system (komponenty nexusa; dodane `checkbox`, `progress`,
   `toggle`, `toggle-group`, rozmiar przycisku `icon-sm`, `CommandDialog` z tytułem).
2. **Dwie bazy, każda do swojej roli (polyglot persistence).** Projekty i zadania zostają w
   MongoDB (produkcja nexusa, brak ryzykownej migracji danych). Konta, klienci, sejf, dziennik,
   przypomnienia i powiadomienia są w PostgreSQL — RLS i dziennik tylko do dopisywania są częścią
   modelu bezpieczeństwa sejfu, których MongoDB nie zapewnia. Migracja PM do PostgreSQL pozostaje
   możliwa później (Prisma obsługuje oba silniki).
3. **Jedno logowanie: Better Auth.** Konta w PostgreSQL są źródłem prawdy (hasło, 2FA, passkeys,
   sesje, rola systemowa `user.role`). Profil projektowy w Mongo (`User`) ma **to samo `id`**,
   więc zadania, komentarze i czas pracy działają bez zmian (`src/lib/identity.ts`).
   - konta sprzed scalenia migrują się **przy pierwszym logowaniu** (stary skrót bcrypt jest
     akceptowany i od razu przepisywany na scrypt); można też przenieść wszystkich naraz
     skryptem `bun run migrate:legacy`,
   - rejestracja na adres konta sprzed migracji jest blokowana (przejęcie projektów),
   - logowanie Google/Microsoft przejmuje identyfikator konta sprzed migracji (adres zweryfikowany).
4. **Jedna organizacja** (`DEPLOYMENT_MODE=single`, domyślnie): jedna przestrzeń klientów dla
   całej firmy. Administrator systemu (rola `admin` lub adres z `FALLBACK_ADMIN_EMAILS` w
   `src/lib/roles.ts`) zakłada ją raz; wszyscy użytkownicy dołączają automatycznie — admini jako
   administratorzy, pozostali jako członkowie **bez dostępu do żadnego klienta**, dopóki nie
   zostaną przypisani. Rola `manager` (osoby z zewnątrz) nie ma dostępu do modułu klientów.
   Nowe konta zakłada się z zaproszenia (poza pierwszym kontem nowej instalacji).
5. **Sejf tylko tam, gdzie jest potrzebny.** Moduł projektów nie wymaga hasła głównego. Bramka
   sejfu obejmuje sekcję „Klienci i dostępy” (`src/app/dashboard/(crm)`) oraz ustawienia zespołu
   i importu. Auto-blokada i synchronizacja sejfu działają w całym panelu.
6. **Adresy:** wszystko w `/dashboard/*`, logowanie w `/auth/*`; strony publiczne modułu
   (`/share`, `/request`, `/invite`, `/legal`) bez zmian.
7. **Cache Components wyłączone** — strony nexusa korzystają z sesji w komponentach serwerowych;
   CSP z nonce i tak wymaga renderowania na żądanie (nagłówki czytane w układzie głównym).

```
Przeglądarka ── proxy.ts (CSP z nonce, nagłówki, przekierowanie niezalogowanych)
   │
   ├─ /dashboard/* (projekty)  ── getSession() ─┐
   ├─ /dashboard/(crm)/*       ── DAL + RLS ────┤── Better Auth ── PostgreSQL: user, session,
   ├─ /auth/*                                   │                  account, two_factor, passkey,
   └─ /api/*                                    │                  clients, credentials (E2E),
                                                │                  key_grants, audit_events …
                                                └── Prisma ─────── MongoDB: User (profil, to samo id),
                                                                   Project.clientId → clients.id,
                                                                   Task, Todo, TimeEntry …
```

## 3. Co zostało połączone

| Obszar | Wynik scalenia |
|---|---|
| Klienci | Jeden CRM (PostgreSQL). Projekt wskazuje klienta CRM (`Project.clientId` = UUID); `/api/clients` to katalog klientów do przypisywania projektów (tylko metadane). Klienci z Mongo są importowani przy konfiguracji organizacji (kontakt, NIP, adres, notatki), a projekty przepinane na nowe identyfikatory. Usunięcie klienta w CRM odpina projekty (jak wcześniej). |
| Karta klienta | Nowa zakładka **Projekty** (postęp zadań, zaległości, zalogowany czas, członkowie) + karta na przeglądzie + „Nowy projekt” z wybranym klientem. |
| Projekt | Klient z linkiem do CRM; karta **Dane dostępowe** pokazuje wpisy z sejfu klienta (po odblokowaniu). Dawne jawne dane dostępowe projektu można jednym kliknięciem przenieść do sejfu jako bezpieczne notatki (kopia w Mongo jest usuwana). |
| Logowanie i konta | Better Auth dla wszystkich: 2FA (TOTP), passkeys, lista sesji, limit prób + CAPTCHA, e-mail o nowym urządzeniu, reset hasła. Profil, awatar i e-mail synchronizowane między bazami. |
| Panel | Jeden sidebar: Panel, Moje zadania, Projekty, Raporty, GitHub + **Klienci i dostępy** (Klienci, Sejf, Do przejrzenia, Kondycja haseł, Dziennik). Nagłówek: wyszukiwarka, dzwonek powiadomień, blokada sejfu. Strona główna ma sekcję alertów (domeny, SSL, hasła), przypiętych klientów i ostatnio używanych dostępów. |
| Paleta `Ctrl+K` | Projekty, nawigacja, klienci (z katalogu, gdy sejf zablokowany), dostępy i akcje „Dodaj dostęp FTP dla…” (gdy odblokowany). Na tablicy projektu `Ctrl+K` nadal dodaje zadanie; paleta otwiera się wtedy klawiszem `/`. |
| Ustawienia | Jedna nawigacja: Profil, Logowanie i sesje, Sejf, Powiadomienia, Prywatność, Wygląd · Statusy zadań, Tagi · Zespół i dostęp do klientów, Przestrzeń klientów, Import i eksport · SMTP, Użytkownicy. Stare adresy `?tab=` przekierowują. |
| Użytkownicy (admin) | Zmiana roli, e-maila i hasła trafia do konta (PostgreSQL) i profilu; usunięcie konta oznacza sejfy do rotacji klucza, a profil projektowy jest anonimizowany (historia zadań zostaje). |
| Powiadomienia | Jeden dzwonek i strona powiadomień; powiadomienia modułu klientów idą też jako web push nexusa (te same subskrypcje co przypomnienia o zadaniach). |
| E-mail | Jeden mechanizm (React Email; Resend lub SMTP); test SMTP w ustawieniach używa go. |
| Dziennik zdarzeń | Logowania wszystkich użytkowników (także modułu projektów), operacje na sejfie i klientach, import klientów. |

## 4. Bezpieczeństwo po scaleniu

- Sejf odszyfrowuje dane w tej samej domenie co edytor treści nexusa, więc **XSS ma teraz
  wyższą stawkę**: CSP z nonce i `strict-dynamic` obejmuje całą aplikację, a treści HTML od
  użytkowników (README projektu, opisy zadań, stare dane dostępowe) renderuje wyłącznie
  `src/components/ui/safe-html.tsx` (DOMPurify). ESLint blokuje `dangerouslySetInnerHTML`.
- Ze strony głównej nexusa usunięto inline’owy skrypt (byłby zablokowany przez CSP, nie miał efektu — żaden element nie używał animowanej klasy).
- Moduł projektów odrzuca sesje kont z TOTP, które nie przeszły drugiego składnika.
- Rejestracja w trybie jednej organizacji wymaga zaproszenia; członek domyślnie nie widzi klientów.

## 5. Wdrożenie na produkcji

1. **PostgreSQL** (16+, region UE): baza `nexus`, właściciel schematu (migracje) i rola aplikacji
   bez uprawnień do obchodzenia RLS:
   ```sql
   CREATE ROLE nexus_app LOGIN PASSWORD '…' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
   ```
   (migracja `0002` nadaje jej uprawnienia automatycznie, jeśli rola istnieje przed migracją).
2. **Zmienne w `.env` serwera** (zob. `env.example`): `APP_URL`, `BETTER_AUTH_SECRET` (min. 32
   znaki — `NEXTAUTH_SECRET` jest czytany zapasowo, jeśli jest dość długi), `POSTGRES_URL`,
   `POSTGRES_MIGRATION_URL`, `POSTGRES_SSL=require`, `CRON_SECRET`, `EMAIL_FROM`/SMTP lub
   `RESEND_API_KEY`, opcjonalnie `REDIS_URL`, `ORG_NAME`. `next build` waliduje te zmienne —
   muszą być ustawione **przed** wdrożeniem. `APP_URL` to dokładny adres z paska przeglądarki
   (schemat, domena, port): Better Auth odrzuca logowanie z innego adresu błędem
   „Invalid origin”. Linki udostępniania zadań i projektów też są budowane z `APP_URL`
   (`NEXTAUTH_URL` jest już tylko wartością zapasową).
3. **Deploy** (`.github/workflows/deploy.yml`): `bun install`, `bun run build`,
   `bun run db:pg:migrate` (dodane), `pm2 reload`. Wszyscy użytkownicy logują się ponownie
   (ciasteczka NextAuth przestają działać) — **dotychczasowymi hasłami**.
4. **Konfiguracja organizacji:** administrator wchodzi w **Klienci** → ustawia hasło główne
   sejfu i drukuje zestaw ratunkowy → tworzy przestrzeń organizacji. W tym momencie wszyscy
   użytkownicy dołączają, klienci z modułu projektów trafiają do CRM, a projekty są przepinane.
   Klucze sejfów zaimportowanych klientów tworzą się w jego przeglądarce przy odblokowaniu.
5. **Zespół:** w Ustawienia → Zespół i dostęp do klientów przypisz osoby do klientów. Każdy przy
   pierwszym wejściu w moduł klientów ustawia własne hasło główne; kopie kluczy nadaje
   automatycznie przeglądarka administratora z odblokowanym sejfem.
6. **Dane dostępowe projektów:** na stronie „Informacje o projekcie” użyj „Przenieś do sejfu”.
7. **Porządki:** `bun run migrate:legacy --purge` usuwa stare skróty bcrypt z MongoDB (konta są
   już w PostgreSQL). Dokumenty kolekcji `Client` w Mongo zostają jako kopia — po weryfikacji
   importu można je usunąć.
8. **Cron** (oprócz dotychczasowych `/api/cron/*`): raz dziennie
   `curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/daily`
   (przypomnienia o domenach, SSL, hostingu, kluczach API i starych hasłach; retencja dziennika).
9. **Kopie zapasowe:** obok MongoDB backupuj PostgreSQL (`pg_dump`) — sejf bez zestawu
   ratunkowego i bez bazy jest nie do odtworzenia.

Lokalnie: `npm run setup` (usługi z `docker-compose.yml`: MongoDB 27017, PostgreSQL 5434,
Redis 6381, Mailpit 1027/8028), potem `npm run dev`.

## 6. Testy

| Polecenie | Zakres | Wynik przy scaleniu |
|---|---|---|
| `bun run typecheck` | TypeScript (strict) | bez błędów |
| `bun run lint` | ESLint (reguły XSS/DAL z modułu) | 0 błędów; 100 ostrzeżeń (głównie `react-hooks` w dotychczasowym kodzie nexusa) |
| `bun run test` | Vitest: kryptografia (100% linii), uprawnienia, sejf, import, wyszukiwanie | 126/126 |
| `bun run build` | build produkcyjny | OK |
| `bun run test:e2e acceptance` | kryteria akceptacji modułu (rejestracja, FTP < 30 s, dziennik kopiowania, brak jawnych danych w zrzucie bazy, ruchu i logach, linki jednorazowe, step-up dla wpisów krytycznych, 404 dla nieprzypisanych, TOTP, auto-blokada) | 13/13 (tryb `saas`, serwer dev — hak testowy auto-blokady istnieje tylko w buildach deweloperskich) |
| `bun run test:e2e import` | import CSV (Bitwarden) | 1/1 |
| `E2E_MERGE=1 … bun run test:e2e merge` | scalenie na kopii danych nexusa: logowanie starym hasłem, konfiguracja organizacji, import klienta, projekty w karcie klienta, klucz sejfu zaimportowanego klienta, dostęp widoczny w projekcie | 5/5 (tryb `single`) |

Testy e2e wymagają działających baz (MongoDB z replica setem, PostgreSQL z rolą `nexus_app`)
i nie są uruchamiane w CI (`.github/workflows/ci.yml`: lint, typy, testy jednostkowe, build).

## 7. Problemy wykryte przy okazji (nie zmieniane — do decyzji)

1. **Deploy:** `scripts/db-backup.sh` / `db-restore.sh` obsługują SQLite, a `bunx prisma migrate deploy`
   nie wspiera MongoDB — po migracji nexusa na Mongo ten krok kończy się błędem i uruchamia
   „rollback”. Do weryfikacji na serwerze (np. zastąpić `prisma db push` + `mongodump`).
2. **`/uploads/*`** jest serwowane bez autoryzacji — załączniki zadań są dostępne dla każdego,
   kto zna adres.
3. **Kontrola dostępu do projektów:** w `GET`/`PATCH /api/projects/[projectId]` warunek
   `OR: [{}, …]` (pusty obiekt) dopasowuje każdy projekt — każdy zalogowany może czytać i
   edytować dowolny projekt.
4. Awaryjny adres administratora jest wpisany w kod (teraz w jednym miejscu:
   `FALLBACK_ADMIN_EMAILS` w `src/lib/roles.ts`).
5. Nieużywane modele `ChatRoom`/`Message`/`UserChatRoom` (zob. `ANALIZA_PROJEKTU.md`).

## 8. Ograniczenia i dalsze kroki

- Dwie bazy do utrzymania i backupu (MongoDB + PostgreSQL).
- Degradacja roli w nexusie (admin → user) nie obniża roli w przestrzeni klientów — role w CRM
  zmienia się w Ustawienia → Zespół (z ponownym potwierdzeniem tożsamości).
- Tryb `saas` działa (każdy zakłada własną przestrzeń), ale dane projektów nie są podzielone
  na przestrzenie — scalony system jest przeznaczony dla jednej organizacji.
- Część tekstów modułu jest wpisana w kod zamiast w `messages/pl.json` (next-intl).
- Ograniczenia kryptograficzne modułu (dystrybucja kluczy publicznych przez serwer, brak ochrony
  przed wycofaniem wersji wpisu, potrzeba zewnętrznego audytu) — zob. specyfikację, rozdział 6.
