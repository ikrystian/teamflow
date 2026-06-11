# 🔍 Dokładna Analiza Systemu TeamFlow/Nexus

**Data analizy:** 2026-06-11  
**Pliki źródłowe:** 184 plików TS/TSX  
**Łączna ilość kodu:** ~34,312 linii  
**Stack:** Next.js 16, React 19, Prisma 5.22 (SQLite), NextAuth v4, TailwindCSS v4, shadcn/ui

---

## 📊 1. Statystyki Projektu

| Metryka | Wartość |
|---------|---------|
| Modele Prisma | 16 |
| API Routes | ~30+ endpointów |
| Komponenty UI (shadcn) | 35 |
| Komponenty aplikacji | ~45 |
| Hooki niestandardowe | 3 |
| Konteksty React | 2 |
| Pliki lib/ | 16 |
| GitHub Workflows | 2 |
| Skrypty bash | 5 |

### Największe pliki (kompleksowość):
| Plik | Linie |
|------|-------|
| `task-form-content.tsx` | 1,679 |
| `kanban-board.tsx` | 1,085 |
| `project-details-content.tsx` | 884 |
| `github-webhook-logs.tsx` | 835 |
| `sidebar.tsx` | 750 |
| `settings-content.tsx` | 737 |
| `project-settings-content.tsx` | 721 |
| `public/task/[token]/page.tsx` | 700 |
| `merge-request/route.ts` | 623 |

---

## 🗑️ 2. Martwy Kod i Nieużywane Elementy

### 2.1 Nieużywane modele w Prisma Schema

| Model | Problem |
|-------|---------|
| **`ChatRoom`** | Zdefiniowany w schema, ale **nigdzie w `src/` nie jest używany** — żaden komponent ani API go nie referencjuje |
| **`Message`** | j.w. — powiązany z ChatRoom, nieużywany |
| **`UserChatRoom`** | j.w. — tabela pośrednia, nieużywana |
| **`PushSubscription`** | Model istnieje w schemacie, ale **brak API route** `/api/push/subscribe` ani `/api/push/unsubscribe` ani `/api/push/vapid-key` — hook `usePushNotifications` wywołuje te endpointy, ale **nie istnieją** |

> **⚠️ UWAGA:** Modele ChatRoom/Message/UserChatRoom zajmują miejsce w bazie i schema, ale system czatu **nie został zaimplementowany**. Jeśli nie planujesz go wdrażać w najbliższym czasie, powinny zostać usunięte.

### 2.2 Nieużywane pliki i katalogi

| Element | Ścieżka | Problem |
|---------|---------|---------|
| **`webhook-git/`** | `src/app/api/webhook-git/` | **Pusty katalog** — brak pliku `route.ts` |
| **`sample.json`** | `/sample.json` | Plik testowy z hardcoded `projectId` i commitami — powinien być w `.gitignore` lub usunięty |
| **`env.sample`** | `/env.sample` | Duplikat — istnieje już `.env.example` z bardziej kompletną listą zmiennych |
| **`proxy.ts`** | `src/proxy.ts` | Plik middleware, ale Next.js szuka `middleware.ts` w katalogu głównym lub `src/` — **ten plik może nie być aktywny** jako middleware! |

> **🚨 KRYTYCZNE:** `src/proxy.ts` jako middleware — Next.js wymaga, aby plik middleware nazywał się `middleware.ts` (nie `proxy.ts`). Plik prawdopodobnie **NIE jest aktywnie ładowany** przez Next.js. Oznacza to, że **ochrona tras dashboard nie działa** na poziomie middleware!

### 2.3 Nieużywane eksporty i typy

| Element | Plik | Problem |
|---------|------|---------|
| `TaskUpdateData` | `types/index.ts` | Typ zdefiniowany, ale **nieużywany nigdzie** poza definicją |
| `formatTaskDueDate` | `lib/date-utils.ts` | Funkcja lokalna (nie eksportowana), ale `formatEstimatedHours` ma zbędną logikę (ternary `hours % 1 === 0 ? hours.toString() : hours.toString()` — obie gałęzie robią to samo) |
| `Subtask` vs `Todo` | `types/index.ts` | W `Task` interface istnieją **oba** pola `subtasks: Subtask[]` i `todos?: Subtask[]` — duplikacja typów |

### 2.4 Nieużywane/niedokończone funkcjonalności

| Funkcjonalność | Stan |
|----------------|------|
| **Push Notifications** | Hook `usePushNotifications` istnieje, `ServiceWorkerProvider` jest w layout, `sw.js` jest minimalny (passthrough), ale brak API routes: `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/vapid-key` |
| **Service Worker** | Rejestrowany globalnie w `layout.tsx`, ale **robi absolutnie nic** (passthrough fetch) |
| **Chat/Messaging** | 3 modele w DB (ChatRoom, Message, UserChatRoom), ale **zero implementacji** w frontend i backend |
| **Project README** | Pole `readme` w modelu `Project` — używane tylko w 2 miejscach (`project-info-content.tsx` i API), ale **brak edytora README** |
| **Project Share Token** | Pole `shareToken` w modelu `Project` — istnieje logika generowania, ale prawdopodobnie niedokończona |
| **Reminders** | Pola `reminderEnabled/Time/Type/Value` na Task — istnieje `reminder-settings.tsx`, ale **brak mechanizmu CRON** który faktycznie wysyła przypomnienia |

---

## ⚠️ 3. Problemy z Kodem i Jakość

### 3.1 Zduplikowany kod

| Duplikacja | Pliki | Problem |
|-----------|-------|---------|
| **`callOpenRouterJson()`** | `webhook-commit/route.ts` i `merge-request/route.ts` | **Identyczna funkcja** (~40 linii) zduplikowana w dwóch plikach |
| **`fetchCommitContent()` / `fetchGithubDiff()`** | j.w. | Prawie identyczne funkcje do pobierania diffów z GitHub |
| **Logika Done status** | `github-webhook/route.ts` vs `merge-request/route.ts` | Różne implementacje szukania statusu "Done" — github-webhook używa `OR` z hardcoded wariantami, merge-request używa tablicy `DONE_STATUS_NAMES` |
| **`createProjectSchema` / `editProjectSchema`** | `project-validations.ts` | Oba schematy są **identyczne** — powinien być jeden bazowy schemat |
| **`createClientSchema` / `editClientSchema`** | `client-validations.ts` | j.w. — obie definicje to `z.object(clientFields)` |

> **💡 TIP:** Stwórz wspólny moduł `lib/openrouter.ts` z `callOpenRouterJson()` i `fetchGithubDiff()` aby wyeliminować duplikację.

### 3.2 `@ts-ignore` i TypeScript safety

```
src/app/api/admin/users/[userId]/route.ts:
  Linia 70:  // @ts-ignore - role field exists in database but Prisma types are not updated
  Linia 180: // @ts-ignore - role field exists in database but Prisma types are not updated  
  Linia 223: // @ts-ignore - role field exists in database but Prisma types are not updated
```

> **ℹ️ WAŻNE:** 3 użycia `@ts-ignore` — pole `role` **jest** w schema Prisma, więc po `prisma generate` powinno być widoczne. Sugeruje to, że klient Prisma nie jest aktualny.

### 3.3 ESLint disable'y

- **13 wystąpień** `eslint-disable` w kodzie
- Najczęstszy: `react-hooks/exhaustive-deps` (5x) — sugeruje problemy z zarządzaniem zależnościami w hookach
- `@typescript-eslint/ban-ts-comment` (3x) — maskuje problemy TypeScript
- `@typescript-eslint/no-unused-vars` (1x) — zmienne zadeklarowane, ale nieużywane

### 3.4 Hardcoded wartości

| Wartość | Plik | Problem |
|---------|------|---------|
| Email admina | `lib/admin.ts` | `krystian@bpcoders.pl` hardcoded jako fallback admin |
| Pusher email map | `webhook-commit/route.ts` | `PUSHER_EMAIL_MAP = { ikrystian: "krystian@bpcoders.pl" }` — powinno być w konfiguracji |
| OpenRouter model | `webhook-commit/route.ts`, `merge-request/route.ts` | `"deepseek/deepseek-v4-flash"` — powinien być w env |
| `allowedDevOrigins` | `next.config.ts` | Jeden specyficzny dev origin hardcoded |

### 3.5 Nazewnictwo niespójne

| Problem | Przykład |
|---------|---------|
| **Nazwa projektu** | `package.json` → `"name": "Nexus"`, tytuł → `"Nexus - Project Management"`, folder → `teamflow`, dokumentacja → `TeamFlow` |
| **Konwencja hooków** | `usePushNotifications.ts` (camelCase) vs `use-mobile.ts` (kebab-case) vs `use-project-view-preferences.ts` (kebab-case) |
| **Komentarze** | Mieszanka polskiego i angielskiego — `// Pobierz ustawienia SMTP`, `// Check if user is admin` |
| **Plik middleware** | Nazwany `proxy.ts` zamiast `middleware.ts` |

---

## 🔐 4. Bezpieczeństwo

### 4.1 Krytyczne problemy

| Problem | Priorytet | Opis |
|---------|----------|------|
| **Middleware może nie działać** | 🔴 KRYTYCZNY | `src/proxy.ts` — Next.js wymaga `middleware.ts` w `src/` lub głównym katalogu. Plik `proxy.ts` prawdopodobnie **nie jest automatycznie ładowany**, co oznacza brak ochrony tras |
| **Brak rate limiting** | 🔴 WYSOKI | Żaden endpoint API nie ma rate limitingu — podatność na brute force na login, abuse webhooków |
| **`.env.example` zawiera secret** | 🟡 ŚREDNI | `NEXTAUTH_SECRET="LQKhD5l9kA1vCpKc593EdHqngsRFgV1yD6k/xoQfyVY="` — prawdziwy secret w pliku przykładowym |
| **Brak CSRF protection** | 🟡 ŚREDNI | Webhook endpointy (`merge-request`, `webhook-commit`) nie mają walidacji CSRF ani tokenu — ktoś kto zna `projectId` może tworzyć/modyfikować taski |
| **`webhook-commit` bez auth** | 🟡 ŚREDNI | Endpoint `/api/webhook-commit` nie wymaga żadnej autoryzacji — każdy może wysłać payload i stworzyć taski |
| **SQLite w produkcji** | 🟡 ŚREDNI | SQLite nie nadaje się do aplikacji produkcyjnej z wieloma użytkownikami — brak concurrent writes |
| **`localStorage.clear()` w logout** | 🟢 NISKI | Czyści CAŁY localStorage, nie tylko dane aplikacji — może usunąć dane innych aplikacji na tej samej domenie |

### 4.2 Brakujące zabezpieczenia

- Brak **Content Security Policy** (CSP) headers
- Brak **X-Frame-Options** / clickjacking protection
- Brak walidacji **CORS** na API routes
- Brak **input sanitization** na webhook payloadach (raw body parsowany bez walidacji schematu)
- Brak **token expiration** na share tokenach (raz wygenerowany, ważny na zawsze)

---

## 🚀 5. Wydajność

### 5.1 Problemy z wydajnością

| Problem | Plik | Wpływ |
|---------|------|-------|
| **N+1 queries** | `tasks/route.ts` GET | Pobiera WSZYSTKIE taski z pełnymi relacjami (todos, comments, timeEntries, images, attachments, tags) — brak paginacji |
| **Over-fetching** | `tasks/route.ts` GET | Ładuje kompletne dane tasków na liście, mimo że kanban potrzebuje tylko tytuł, status, priorytet |
| **Brak cache'owania** | Wszystkie API | Żaden endpoint nie ustawia `Cache-Control` headers — każde odświeżenie strony = pełne zapytania do DB |
| **Ciężkie komponenty** | `task-form-content.tsx` (1,679 linii) | Mega-komponent — powinien być rozbity na mniejsze |
| **ProjectsContext fetchuje globalnie** | `projects-context.tsx` | Projekty pobierane na każdej stronie dashboardu, nawet gdy nie są potrzebne |
| **OpenRouter sequential calls** | `merge-request/route.ts` | Diffy commitów pobierane sekwencyjnie w `buildMergeDiff`, model wywoływany wielokrotnie |
| **`getSMTPSettings()` jest async bez potrzeby** | `lib/email.ts` | Czyta sync zmienne środowiskowe, ale oznaczona jako `async` — wywoływana 2x w `sendWelcomeEmail` (raz dla transportera, raz dla ustawień) |

### 5.2 Brakujące optymalizacje Next.js

| Brak | Wpływ |
|------|-------|
| **`loading.tsx`** | Brak jakiegokolwiek pliku `loading.tsx` — użytkownik widzi białą stronę podczas ładowania |
| **`error.tsx`** | Brak error boundaries — nieobsłużone błędy powodują biały ekran |
| **`not-found.tsx`** | Brak custom 404 strony |
| **`generateMetadata()`** | Brak dynamicznych meta tagów na podstronach (projekty, taski) |
| **React Suspense** | Brak użycia Suspense boundaries dla ciężkich komponentów |
| **`revalidatePath()`/`revalidateTag()`** | Brak ISR/revalidation — każde żądanie jest dynamiczne |

---

## 🏗️ 6. Architektura i Struktura

### 6.1 Problemy architektoniczne

| Problem | Opis |
|---------|------|
| **Brak warstwy serwisowej** | Logika biznesowa bezpośrednio w route handlerach (np. `merge-request/route.ts` ma 624 linie logiki) |
| **Brak middleware auth** | `proxy.ts` nie jest prawidłowym middleware (zła nazwa pliku) |
| **Monolityczne komponenty** | `task-form-content.tsx` (1,679 linii), `kanban-board.tsx` (1,085 linii) — trudne w utrzymaniu |
| **Brak React Query/SWR** | Cały data fetching ręczny przez `fetch()` + `useState` — brak cache'owania, refetching, optimistic updates na poziomie biblioteki |
| **Kontekst zamiast data fetching** | `ProjectsContext` zarządza stanem globalnym projektów — lepiej byłoby użyć React Query |
| **Brak error handling pattern** | Każdy API endpoint powtarza ten sam try/catch z `console.error` — brak centralnego error handling |
| **Mieszane odpowiedzialności** | `merge-request/route.ts` — obsługuje HTTP, parsuje payload, wywołuje AI, zarządza DB, loguje czas, tworzy subtaski — wszystko w jednym pliku |

### 6.2 Konfiguracja Tailwind v3 vs v4

> **🚨 UWAGA:** Projekt ma **tailwind.config.js** (format v3) ale w devDependencies jest `"tailwindcss": "^4"` i `"@tailwindcss/postcss": "^4"`. TailwindCSS v4 używa `@theme` w CSS (co jest w `globals.css`), ale `tailwind.config.js` jest artefaktem z v3. Konfiguracja jest **zduplikowana** — kolory zdefiniowane i w config.js i w globals.css.

---

## 📦 7. Zależności

### 7.1 Potencjalnie nieużywane dependencies

| Pakiet | Status |
|--------|--------|
| `@tiptap/extension-image` | Użyty w `rich-text-editor.tsx` |
| `cmdk` | Użyty w `command.tsx` |
| `react-day-picker` | Użyty w `calendar.tsx` |
| `react-is` | Peer dependency Recharts — zainstalowany jako workaround |

### 7.2 Brakujące devDependencies

| Pakiet | Do czego |
|--------|----------|
| `prettier` | Formatowanie kodu — brak konfiguracji formatowania |
| `husky` / `lint-staged` | Pre-commit hooks — brak automatycznego lintingu |
| `@testing-library/*` | Testy — **brak jakichkolwiek testów** w projekcie |

### 7.3 Wersjonowanie

| Problem | Opis |
|---------|------|
| `prisma` w `dependencies` | `"prisma": "5.22.0"` powinno być w `devDependencies` — CLI narzędzie, nie runtime dependency |
| `@prisma/client` | Wersja `5.22.0` jest mocno przestarzała (obecna to 6.x+) |
| `next-auth` v4 | Używany z Next.js 16 — NextAuth v4 nie jest oficjalnie kompatybilny z React 19 / Next.js 16. Powinno być Auth.js v5 |

---

## 🗄️ 8. Problemy z Bazą Danych

### 8.1 Schema issues

| Problem | Model/Pole | Opis |
|---------|-----------|------|
| **Brak indeksów** | Task: `projectId`, `assigneeId`, `statusId` | Foreign keys bez indeksów — wolne filtrowanie i joiny |
| **Brak cascade na Task.projectId** | Task → Project | `onDelete` nie jest ustawione — usunięcie projektu nie usuwa tasków |
| **Brak cascade na Task.assigneeId** | Task → User | j.w. — usunięcie użytkownika nie czyści przypisań |
| **Brak soft delete** | Wszystkie modele | Usuwanie jest hard delete — brak możliwości odzyskania danych |
| **`key` na Task opcjonalny** | `Task.key` | Unikalny ale nullable — pozwala na taski bez klucza |
| **Brak `updatedAt` na `GithubWebhookLog`** | | Logi nie mają `updatedAt` |
| **SQLite ograniczenia** | Cały system | Brak concurrent writes, brak full-text search, brak JSON queries, limit na rozmiar DB |
| **`dev.db` w repozytorium** | `prisma/dev.db` | Baza danych znajduje się w katalogu repozytorium — nie powinna być commitowana |

### 8.2 Relacje bez zastosowania

| Relacja | Model | Status |
|---------|-------|--------|
| `createdChatRooms` | User → ChatRoom | Nigdzie nie używana |
| `sentMessages` | User → Message | Nigdzie nie używana |
| `chatRooms` | User → UserChatRoom | Nigdzie nie używana |
| `pushSubscriptions` | User → PushSubscription | Tylko w hooku bez backend API |

---

## 🧪 9. Brakujące Testy

> **⚠️ UWAGA:** **W projekcie nie ma żadnych testów** — ani unit, ani integration, ani e2e.

Rekomendowane minimum:
- Unit testy dla `lib/` utilities (`task-key.ts`, `github.ts`, `date-utils.ts`, `task-format-utils.ts`)
- Integration testy dla kluczowych API routes (`tasks/route.ts`, `merge-request/route.ts`)
- E2E testy dla krytycznych flows (login, tworzenie tasków, kanban drag & drop)

---

## 🛠️ 10. Rzeczy Do Poprawienia (Priorytetyzowane)

### 🔴 Priorytet KRYTYCZNY

1. **Naprawić middleware** — zmienić nazwę `src/proxy.ts` → `src/middleware.ts` lub zweryfikować, że jest poprawnie ładowany
2. **Dodać rate limiting** — przynajmniej na `/api/auth/*` i webhook endpoints
3. **Usunąć secret z `.env.example`** — zamienić na placeholder
4. **Zabezpieczyć `/api/webhook-commit`** — dodać token/secret validation

### 🟡 Priorytet WYSOKI

5. **Wyodrębnić `callOpenRouterJson`** do `lib/openrouter.ts`
6. **Dodać `loading.tsx`, `error.tsx`, `not-found.tsx`** do route grup
7. **Dodać paginację** do `GET /api/tasks`
8. **Usunąć modele ChatRoom/Message/UserChatRoom** z schema (lub je zaimplementować)
9. **Naprawić `@ts-ignore`** — uruchomić `prisma generate` i naprawić typy
10. **Przenieść `prisma` do `devDependencies`**

### 🟢 Priorytet NORMALNY

11. **Rozbić `task-form-content.tsx`** na mniejsze komponenty (tabs, sekcje)
12. **Zunifikować konwencję nazewnictwa** plików (kebab-case)
13. **Dodać React Query** / TanStack Query zamiast ręcznego fetch
14. **Wyczyścić `tailwind.config.js`** — zostawić konfigurację w `globals.css` (v4)
15. **Usunąć `env.sample`** (duplikat `.env.example`)
16. **Usunąć pusty `src/app/api/webhook-git/`**
17. **Usunąć `sample.json`** lub przenieść do `scripts/examples/`
18. **Dodać indeksy DB** na foreign keys
19. **Zunifikować język komentarzy** — albo PL albo EN
20. **Dodać `onDelete: Cascade`** na relacji Task → Project

---

## ✨ 11. Rekomendowane Nowe Funkcjonalności

### 11.1 Szybkie Wygrane (Low Effort, High Impact)

| Funkcjonalność | Opis |
|----------------|------|
| **Global search** (`⌘K`) | Szukanie tasków, projektów, użytkowników z jednego miejsca |
| **Activity log/Feed** | Timeline aktywności na projekcie (kto co zmienił) |
| **Notification center** | Centrum powiadomień (in-app) — nowe komentarze, przypisania, zmiany statusu |
| **Task templates** | Szablony tasków dla powtarzalnych zadań |
| **Bulk actions** | Zaznaczanie wielu tasków i masowe operacje (zmiana statusu, przypisanie) |
| **Quick filters** | Preset filtrów na kanban (moje taski, overdue, dziś) |
| **Keyboard shortcuts** | Nawigacja klawiaturowa po kanban |

### 11.2 Średni Nakład Pracy

| Funkcjonalność | Opis |
|----------------|------|
| **Dashboard z metrykami** | Wykresy: velocity, burn-down, lead time, task distribution |
| **Eksport raportów** | PDF/CSV export raportów i time entries |
| **File preview** | Podgląd załączników (obrazy, PDF) bezpośrednio w tassku |
| **Task dependencies** | Relacje blocked/blocking między taskami |
| **Sprint/Milestone** | Grupowanie tasków w sprinty/kamienie milowe |
| **Email notifications** | Powiadomienia mailowe o zmianach w przypisanych taskach |
| **Audit log** | Kto co zmienił, kiedy — pełna historia zmian |
| **User preferences** | Język interfejsu, timezone, notification preferences |

### 11.3 Wyższy Nakład Pracy

| Funkcjonalność | Opis |
|----------------|------|
| **Real-time updates** | WebSocket/SSE dla live updates na kanban |
| **API keys management** | Panel do zarządzania kluczami API |
| **Role-based access control** | Granularne uprawnienia (viewer, editor, admin per project) |
| **Import/Export** | Import tasków z Jira, Trello, GitHub Issues |
| **Mobile PWA** | Pełna obsługa mobilna z offline mode |
| **Multi-tenant** | Wsparcie dla wielu organizacji/workspace'ów |
| **Migracja do PostgreSQL** | Wsparcie dla produkcyjnej bazy danych |

---

## 🔧 12. Szczegółowa Checklista Porządkowa

```
Pliki do usunięcia/przeniesienia:
  ❌ src/app/api/webhook-git/     (pusty katalog)
  ❌ sample.json                   (plik testowy)
  ❌ env.sample                    (duplikat .env.example)
  
Pliki do zmiany nazwy:
  📝 src/proxy.ts → src/middleware.ts
  📝 usePushNotifications.ts → use-push-notifications.ts

Kod do wyodrębnienia:
  📦 callOpenRouterJson → lib/openrouter.ts
  📦 fetchGithubDiff → lib/openrouter.ts
  📦 Done status finding → lib/task-status.ts
  📦 Task form sections → components/tasks/form/*.tsx

Pliki do wyczyszczenia:
  🧹 .env.example — usunąć hardcoded secret
  🧹 tailwind.config.js — rozważyć usunięcie (v4 używa @theme)
  🧹 types/index.ts — usunąć TaskUpdateData, zunifikować subtasks/todos
  🧹 lib/date-utils.ts — wyeksportować formatTaskDueDate
  🧹 lib/task-format-utils.ts — naprawić formatEstimatedHours ternary

Modele DB do usunięcia (jeśli nie planowane):
  ❌ ChatRoom
  ❌ Message  
  ❌ UserChatRoom
  ❌ PushSubscription (+ usunąć usePushNotifications hook)

Brakujące pliki Next.js:
  ➕ src/app/loading.tsx
  ➕ src/app/error.tsx
  ➕ src/app/not-found.tsx
  ➕ src/app/dashboard/loading.tsx
  ➕ src/app/dashboard/error.tsx
```

---

> **ℹ️ NOTA:** Ta analiza obejmuje cały kod źródłowy projektu. Rekomenduje rozpoczęcie od priorytetów krytycznych (middleware, bezpieczeństwo), następnie porządkowanie martwego kodu, a na końcu wdrażanie nowych funkcjonalności.
