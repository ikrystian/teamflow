# 🔍 Analiza projektu Nexus (TeamFlow) — Alternatywa dla Asana/Trello

**Data analizy:** 8 czerwca 2026
**Wersja:** 0.1.0
**Stack:** Next.js 16, React 19, Prisma 5, SQLite, Socket.IO, NextAuth

---

## 📋 Spis treści

1. [Podsumowanie projektu](#podsumowanie)
2. [Krytyczne problemy do naprawy](#krytyczne-problemy)
3. [Problemy w bazie danych](#baza-danych)
4. [Problemy w API](#api)
5. [Problemy w frontendzie](#frontend)
6. [Problemy z bezpieczeństwem](#bezpieczenstwo)
7. [Brakujące funkcje (vs Asana/Trello)](#brakujace-funkcje)
8. [Problemy z architekturą i kodem](#architektura)
9. [Rekomendacje priorytetowe](#rekomendacje)

---

## <a id="podsumowanie"></a>1. Podsumowanie projektu

Nexus to aplikacja do zarządzania projektami zbudowana na Next.js z Prisma ORM i SQLite. Posiada:
- ✅ Zarządzanie projektami i zadaniami
- ✅ Tablicę Kanban z drag & drop
- ✅ Śledzenie czasu (time tracking)
- ✅ Komentarze do zadań
- ✅ System tagów
- ✅ Chat w czasie rzeczywistym (Socket.IO)
- ✅ Powiadomienia push
- ✅ Raporty i analityka
- ✅ Webhook do commitów (AI-powered)
- ✅ Integracja ze Slack
- ✅ Zarządzanie użytkownikami (admin)

---

## <a id="krytyczne-problemy"></a>2. 🚨 Krytyczne problemy do naprawy

### 2.1. Hardcoded DONE_STATUS_ID
**Plik:** `src/app/api/tasks/[taskId]/route.ts`, linia 11
```typescript
const DONE_STATUS_ID = "cmq52n2wu0004fyk33tyehmwj"
```
Hardcoded ID statusu "Done" — to się zepsuje na każdej innej instancji bazy danych. Powinno być dynamicznie wyszukiwane po nazwie statusu.

### 2.2. Hardcoded email admina
**Plik:** `src/lib/admin.ts`, linia 25
```typescript
if (session.user.email === 'krystian@bpcoders.pl') {
  return true
}
```
Email admina jest hardcoded. Powinien być pobierany z konfiguracji/zmiennych środowiskowych lub oparty wyłącznie na roli w bazie.

### 2.3. SQLite jako baza produkcyjna
SQLite nie nadaje się do aplikacji wieloużytkownikowej z real-time chat i współbieżnym dostępem. Brak wsparcia dla:
- Współbieżnych zapisów (write locking)
- Skalowania na wiele procesów
- `mode: "insensitive"` w wyszukiwaniu (użyte w `admin/users/route.ts` — nie działa na SQLite!)

### 2.4. Puste obiekty OR w zapytaniach Prisma
**Pliki:** `src/app/api/projects/[projectId]/route.ts`, wiele miejsc
```typescript
OR: [
  {
    // pusty obiekt - matchuje WSZYSTKIE rekordy!
  },
  {
    members: { some: { userId: session.user.id } }
  },
```
Puste obiekty `{}` w tablicy `OR` oznaczają, że warunek zawsze jest spełniony — każdy użytkownik ma dostęp do wszystkich projektów!

### 2.5. Bug w walidacji przypisania użytkownika
**Plik:** `src/app/api/tasks/[taskId]/route.ts`, linie 286-298
```typescript
if (existingTask.project) {
  return NextResponse.json(
    { error: "Project exists but has no associated team..." },
    { status: 400 }
  )
}
```
Jeśli zadanie ma projekt, **zawsze** zwraca błąd 400 przy próbie przypisania użytkownika. To sprawia, że nie można zmienić assignee na zadaniach w projektach!

### 2.6. Brak kaskadowego usuwania w niektórych relacjach
**Model Subtask** nie ma `onDelete: Cascade` — usunięcie taska spowoduje błąd klucza obcego. Podobnie z `TimeEntry`.

---

## <a id="baza-danych"></a>3. 🗄️ Problemy w bazie danych (Prisma Schema)

### 3.1. Brakujące indeksy
```
- Task.projectId — brak indeksu (częste filtrowanie)
- Task.assigneeId — brak indeksu
- Task.createdById — brak indeksu
- Task.statusId — brak indeksu
- TimeEntry.taskId — brak indeksu
- TimeEntry.userId — brak indeksu
- TimeEntry.date — brak indeksu (używane w raportach)
- Comment.taskId — brak indeksu
- Comment.authorId — brak indeksu
- ProjectDocument.projectId — brak indeksu
```
**Wpływ:** Wolne zapytania przy większej ilości danych.

### 3.2. Redundancja Subtask vs Todo
Istnieją dwa modele do tego samego celu:
- **Subtask** — `title`, `isCompleted`
- **Todo** — `title`, `isCompleted`, `timeSpent`

Powinny być zmergowane w jeden model (Todo ma więcej funkcji).

### 3.3. Brak soft-delete na taskach
Taski są usuwane bezpowrotnie (`DELETE`). Brak mechanizmu kosza/archiwum dla zadań (jest tylko dla projektów).

### 3.4. Brak pola `updatedAt` na `TaskAttachment` i `TaskImage`
Brak możliwości śledzenia kiedy załącznik/obraz został zaktualizowany.

### 3.5. Status zadania jako osobny model globalny
`TaskStatus` jest globalny (nie per-projekt). Asana/Trello pozwalają na różne workflowy per projekt/board. To ogranicza elastyczność.

### 3.6. Priorytet jako string bez walidacji
`Task.priority` to `String?` bez enum/walidacji — można wpisać dowolną wartość.

### 3.7. Brak modelu ActivityLog / HistoriaZmian
Nie ma żadnego logowania zmian na taskach (kto zmienił status, kto przypisał). Pole `changes` w Task to coś innego (webhook commit changes).

### 3.8. Brak relacji Task -> Task (zależności)
Nie ma możliwości definiowania zależności między zadaniami (`blocks`, `blocked by`, `relates to`). Migracja `remove_blocking_and_system_changes` sugeruje, że to kiedyś istniało i zostało usunięte.

---

## <a id="api"></a>4. 🔌 Problemy w API

### 4.1. Brak paginacji na liście zadań
`GET /api/tasks` zwraca **WSZYSTKIE** zadania naraz z pełnymi `include` (komentarze, time entries, attachments). Przy 1000+ zadaniach to będzie bardzo wolne.

### 4.2. Brak paginacji na liście projektów
`GET /api/projects` zwraca wszystkie projekty ze wszystkimi taskami. N+1 problem i ogromne payloady.

### 4.3. Brak rate limiting
Żadne endpointy nie mają rate limitingu. Podatne na brute-force (login), DDoS, spam komentarzy.

### 4.4. Brak walidacji inputu
- Brak walidacji Zod (mimo że jest w dependencies!) na body requestów
- `title` jest jedynym walidowanym polem przy tworzeniu tasku
- Brak walidacji długości stringów
- Brak sanityzacji HTML w opisach (XSS przez `dangerouslySetInnerHTML`)

### 4.5. Webhook bez uwierzytelniania
**Plik:** `src/app/api/webhook-commit/route.ts`
Endpoint webhookowy nie weryfikuje podpisu/tokenu. Każdy może wysłać POST i tworzyć taski w dowolnym projekcie.

### 4.6. Brak API do masowych operacji
- Brak bulk update statusów
- Brak bulk delete
- Brak bulk assign

### 4.7. Niespójne odpowiedzi API
Niektóre endpointy zwracają `{ tasks }`, inne `{ task }`, inne `{ success: true }`. Brak standardowego formatu odpowiedzi/błędów.

### 4.8. Console.log w produkcji
**Plik:** `src/components/tasks/tasks-content.tsx`, linia 148
```typescript
console.log(data.tasks)
```
Debug logi pozostawione w kodzie.

### 4.9. Brak API wersjonowania
Endpointy nie mają wersji (`/api/v1/...`), co utrudni przyszłe breaking changes.

---

## <a id="frontend"></a>5. 🖥️ Problemy w frontendzie

### 5.1. Ustawienia powiadomień nie są persystowane
**Plik:** `src/components/settings/settings-content.tsx`
Ustawienia powiadomień, prywatności i wyglądu istnieją tylko jako lokalny state React — nie są zapisywane nigdzie (brak API, brak tabeli w bazie). Wiele switchów jest `disabled`.

### 5.2. Język/strefa czasowa nie działają
Przyciski "Polski"/"English" i strefy czasowe są `disabled`. Mimo że `i18next` jest w dependencies, nie jest zintegrowany.

### 5.3. Brak responsywności w ustawieniach
`TabsList` z 10 tabami w jednym wierszu `grid-cols-10` nie zmieści się na mobilnych ekranach.

### 5.4. Duplikacja logiki isOverdue
Funkcja `isOverdue` jest zduplikowana w wielu komponentach:
- `kanban-board.tsx`
- `tasks-content.tsx`
- Powinna być w `lib/date-utils.ts`

### 5.5. Duplikacja formatowania czasu
`formatHours` jest zduplikowane w wielu komponentach zamiast być w shared utility.

### 5.6. Brak error boundaries
Żaden komponent nie ma error boundary — crash jednego komponentu zabija całą stronę.

### 5.7. Brak potwierdzeń w destrukcyjnych akcjach
Niektóre akcje (np. usunięcie komentarza, usunięcie time entry) mogą nie mieć potwierdzenia.

### 5.8. Brak stanu pustego/onboardingowego
Dashboard nie ma sensownego onboardingu dla nowych użytkowników — po rejestracji widzi puste karty bez wskazówek co robić.

### 5.9. Hack z pointer-events
**Plik:** `src/components/tasks/tasks-content.tsx`, linie 92-100
```typescript
document.body.style.pointerEvents = ''
```
Bezpośrednia manipulacja DOM body w React — wskazuje na nierozwiązany bug z dialogami.

### 5.10. Fałszywe statystyki w mailu powitalnym
**Plik:** `src/lib/email.ts`
```html
<div>10,000+ Aktywni użytkownicy</div>
<div>50,000+ Ukończone projekty</div>
<div>98% Zadowolenie</div>
```
Hardcoded fałszywe statystyki marketingowe w szablonie maila.

---

## <a id="bezpieczenstwo"></a>6. 🔒 Problemy z bezpieczeństwem

### 6.1. XSS przez dangerouslySetInnerHTML
**Plik:** `src/components/tasks/tasks-content.tsx`, linia 649
```tsx
<div dangerouslySetInnerHTML={{ __html: task.description }} />
```
Opisy zadań renderowane są jako raw HTML bez sanityzacji. Atakujący może wstrzyknąć `<script>` w opisie.

### 6.2. Brak CSRF protection
Middleware nie zawiera ochrony przed CSRF. Formularze POST mogą być sfałszowane z zewnętrznych stron.

### 6.3. Credentials w bazie jako plain text
**Model Project:** `credentials String?` — dane logowania do projektów przechowywane jako czysty tekst. Powinny być szyfrowane.

### 6.4. Pliki uploadowane do public/
Pliki są zapisywane bezpośrednio w katalogu `public/uploads/` — dostępne dla każdego bez autentykacji. Powinny być servowane przez API z kontrolą dostępu.

### 6.5. Brak limitu rozmiaru plików
API uploadów nie sprawdza rozmiaru plików — duże pliki mogą wypełnić dysk.

### 6.6. JWT secret w env.sample jest placeholder
```
NEXTAUTH_SECRET="your-secret-key-here"
```
Jeśli ktoś nie zmieni tego — podpisywane tokeny będą podatne.

### 6.7. Brak ochrony endpointów API
Middleware pozwala na dostęp do wszystkich endpointów `/api/` które nie są w `/api/auth/`:
```typescript
// For dashboard routes, require authentication
if (req.nextUrl.pathname.startsWith("/dashboard")) {
  return !!token
}
// Allow public routes
return true
```
AI: Endpointy jak `/api/tasks`, `/api/projects` itp. **nie są chronione** przez middleware. Polegają na wewnętrznym `getServerSession`, ale middleware powinno to odrzucać wcześniej.

### 6.8. Socket.IO bez autentykacji
**Plik:** `server.js`
Socket.IO nie weryfikuje tokenów sesji — każdy może nasłuchiwać na wiadomości chat i live updates.

---

## <a id="brakujace-funkcje"></a>7. 📊 Brakujące funkcje (porównanie z Asana/Trello)

### Zarządzanie zadaniami
| Funkcja | Asana | Trello | Nexus | Status |
|---|---|---|---|---|
| Podzadania (subtasks) | ✅ | ✅ (via checklists) | ⚠️ (redundantne Subtask+Todo) | Wymaga refaktoru |
| Zależności między zadaniami | ✅ | ❌ | ❌ | **Brak** |
| Recurring tasks (powtarzalne) | ✅ | ✅ | ❌ | **Brak** |
| Custom fields | ✅ | ✅ (power-ups) | ❌ | **Brak** |
| Task templates | ✅ | ✅ | ❌ | **Brak** |
| Multiple assignees | ✅ | ✅ | ❌ (tylko 1) | **Brak** |
| Task dependencies / blocking | ✅ | ❌ | ❌ (usunięte!) | **Brak** |
| Due date ranges (start+end) | ✅ | ✅ | ⚠️ (jest startTime/endTime) | Częściowo |
| Milestones | ✅ | ❌ | ❌ | **Brak** |
| Approval workflows | ✅ | ❌ | ❌ | **Brak** |

### Widoki i nawigacja
| Funkcja | Asana | Trello | Nexus | Status |
|---|---|---|---|---|
| Board (Kanban) | ✅ | ✅ | ✅ | ✅ |
| List view | ✅ | ❌ | ✅ | ✅ |
| Calendar view | ✅ | ✅ | ✅ | ✅ |
| Timeline / Gantt chart | ✅ | ❌ | ❌ | **Brak** |
| Workload view | ✅ | ❌ | ❌ | **Brak** |
| Dashboard/overview | ✅ | ❌ | ✅ | ✅ |
| Portfolio view (multi-project) | ✅ | ❌ | ❌ | **Brak** |
| Sortowanie/filtrowanie zaawansowane | ✅ | ✅ | ⚠️ (podstawowe) | Wymaga rozbudowy |
| Wyszukiwanie globalne | ✅ | ✅ | ❌ | **Brak** |
| Widok "Mój dzień" / Focus mode | ✅ | ❌ | ❌ | **Brak** |

### Współpraca
| Funkcja | Asana | Trello | Nexus | Status |
|---|---|---|---|---|
| Komentarze | ✅ | ✅ | ✅ | ✅ |
| @mentions | ✅ | ✅ | ❌ | **Brak** |
| Followers / watchers | ✅ | ✅ | ❌ | **Brak** |
| Activity feed / historia zmian | ✅ | ✅ | ❌ | **Brak** |
| Real-time updates na taskach | ✅ | ✅ | ❌ (tylko chat) | **Brak** |
| Reactions na komentarzach | ❌ | ✅ | ❌ | **Brak** |
| File attachments | ✅ | ✅ | ✅ | ✅ |
| Proofing / review | ✅ | ❌ | ❌ | **Brak** |

### Automatyzacja i integracje
| Funkcja | Asana | Trello | Nexus | Status |
|---|---|---|---|---|
| Automation rules | ✅ | ✅ (Butler) | ❌ | **Brak** |
| Email integration | ✅ | ✅ | ⚠️ (tylko SMTP) | Podstawowe |
| Slack integration | ✅ | ✅ | ⚠️ (jednokierunkowa) | Częściowo |
| GitHub/Git integration | ✅ | ✅ | ⚠️ (webhook AI) | Częściowo |
| API publiczne / Webhooks | ✅ | ✅ | ❌ | **Brak** |
| Zapier / Make | ✅ | ✅ | ❌ | **Brak** |
| Import/Export danych | ✅ | ✅ | ⚠️ (tylko raporty) | Częściowo |

### Administracja
| Funkcja | Asana | Trello | Nexus | Status |
|---|---|---|---|---|
| Role i uprawnienia | ✅ | ✅ | ⚠️ (admin/user) | Podstawowe |
| Guest access | ✅ | ✅ | ❌ | **Brak** |
| Audit log | ✅ | ✅ | ❌ | **Brak** |
| SSO / OAuth providers | ✅ | ✅ | ❌ (tylko credentials) | **Brak** |
| Two-factor auth (2FA) | ✅ | ✅ | ❌ | **Brak** |
| Project templates | ✅ | ✅ | ❌ | **Brak** |
| Data export (GDPR) | ✅ | ✅ | ❌ | **Brak** |
| Backup / restore | ✅ | ✅ | ❌ | **Brak** |

---

## <a id="architektura"></a>8. 🏗️ Problemy z architekturą i kodem

### 8.1. Global state w server.js
```javascript
global.socketServer = io
global.userSockets = userSockets
global.onlineUsers = onlineUsers
```
Użycie `global` do przechowywania stanu Socket.IO nie skaluje się na wiele procesów/workerów.

### 8.2. Brak testów
Zero testów jednostkowych, integracyjnych ani E2E. Brak konfiguracji test runnera (Jest, Vitest, Playwright).

### 8.3. Mieszanie języków PL/EN
Komentarze i komunikaty mieszają polski i angielski:
- UI w całości po polsku
- Komentarze w kodzie mieszane
- Nazwy zmiennych po angielsku
Brak spójnej strategii i18n.

### 8.4. Brak Docker / docker-compose
Brak konfiguracji konteneryzacji co utrudnia deployment i development.

### 8.5. Brak CI/CD
Brak konfiguracji GitHub Actions, GitLab CI ani innego CI/CD pipeline.

### 8.6. Brak seed data
Brak pliku `prisma/seed.ts` z domyślnymi danymi (np. statusy zadań, admin user).

### 8.7. Fat components
Wiele komponentów ma 600+ linii (kanban-board, tasks-content, settings-content, project-details-content). Powinny być rozbite na mniejsze.

### 8.8. Duplikacja include/select w Prisma
Zapytania Prisma powtarzają te same `include` i `select` w wielu endpointach. Powinny być wyekstrahowane do współdzielonych obiektów.

### 8.9. Brak loading states dla wielu operacji
Wiele akcji nie pokazuje stanu ładowania (np. zmiana statusu w liście vs kanban).

### 8.10. Brak proper error handling
Większość catch bloków robi `console.error` + generyczny "Internal server error" bez szczegółów przydatnych dla debugowania.

### 8.11. Brak TypeScript strict mode
Liczne użycia `any` w callbackach auth:
```typescript
async jwt({ token, user }: { token: any; user: any })
```

### 8.12. Unused imports i zmienne
```typescript
const [, setUsers] = useState<User[]>([])
const [, setTaskStatuses] = useState<TaskStatus[]>([])
```
State jest ustawiany, ale nigdy odczytywany (dashboard content).

---

## <a id="rekomendacje"></a>9. 🎯 Rekomendacje priorytetowe

### 🔴 Priorytet KRYTYCZNY (zrobić natychmiast)
1. **Naprawić puste obiekty OR w zapytaniach Prisma** — każdy widzi wszystkie projekty
2. **Naprawić bug z assigneem (linia 286-298)** — nie można przypisywać użytkowników do zadań w projektach
3. **Usunąć hardcoded DONE_STATUS_ID** — dynamiczne wyszukiwanie statusu
4. **Dodać sanityzację HTML** — zapobiec XSS przez `dangerouslySetInnerHTML`
5. **Dodać uwierzytelnianie webhook** — token/signature verification
6. **Zabezpieczyć Socket.IO** — autentykacja połączeń

### 🟠 Priorytet WYSOKI (w następnych sprintach)
7. Migracja z SQLite na PostgreSQL
8. Dodać paginację na listach zadań i projektów
9. Dodać walidację Zod na wszystkie endpointy
10. Dodać indeksy do bazy danych
11. Zmergować Subtask i Todo w jeden model
12. Dodać Activity Log / historia zmian
13. Dodać globalne wyszukiwanie
14. Dodać @mentions w komentarzach
15. Persystować ustawienia użytkownika (powiadomienia, prywatność)

### 🟡 Priorytet ŚREDNI (budowanie wartości)
16. Dodać Timeline/Gantt view
17. Dodać zależności między zadaniami
18. Dodać recurring tasks
19. Dodać custom fields
20. Dodać task templates i project templates
21. Dodać multiple assignees
22. Dodać SSO (Google, GitHub OAuth)
23. Dodać 2FA
24. Implementacja i18n (polski + angielski)
25. Dodać testy (unit + E2E)

### 🟢 Priorytet NISKI (nice to have)
26. Dodać Gantt chart / Workload view
27. Dodać Portfolio view
28. Dodać publiczne API z dokumentacją
29. Dodać Zapier/Make integrację
30. Dodać audit log
31. Docker + CI/CD
32. Data export (GDPR compliance)
33. Guest access / public boards
34. Automation rules (Trello Butler-like)

---

## 📈 Ocena ogólna

| Kategoria | Ocena | Komentarz |
|---|---|---|
| **Funkcjonalność** | 5/10 | Podstawy są, ale brakuje wielu kluczowych funkcji |
| **Bezpieczeństwo** | 3/10 | Krytyczne luki (XSS, auth bypass, brak auth na webhookach) |
| **Jakość kodu** | 5/10 | Spójny stack, ale dużo duplikacji i brak testów |
| **Baza danych** | 4/10 | SQLite, brak indeksów, redundancja modeli |
| **UX/UI** | 6/10 | Ładny UI z Radix/Tailwind, ale brak onboardingu i sporo disabled features |
| **Skalowalność** | 3/10 | SQLite + global state + brak paginacji = problemy przy wzroście |
| **DevOps** | 2/10 | Brak testów, CI/CD, Docker, monitoring |

**Ogólna gotowość do produkcji: 4/10**

Projekt ma solidny fundament (Next.js, Prisma, Socket.IO, Radix UI) i wiele dobrych pomysłów (webhook AI, kanban, time tracking), ale wymaga znacznej pracy nad bezpieczeństwem, skalowalnością i dokończeniem wielu rozpoczętych funkcji zanim będzie stanowił realną alternatywę dla Asana/Trello.
