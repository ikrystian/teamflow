# TeamFlow - Team Project Management Platform

TeamFlow to nowoczesna aplikacja internetowa do zarządzania zadaniami i projektami dla zespołów. Inspirowana funkcjonalnością systemu Asana, ma na celu usprawnienie współpracy, centralizację komunikacji i zwiększenie produktywności.

## 🚀 Funkcjonalności

### ✅ Zaimplementowane (MVP)
- **Uwierzytelnianie użytkowników** - Rejestracja i logowanie z NextAuth.js
- **Zarządzanie zespołami** - Tworzenie zespołów, edycja nazw zespołów i pełne zarządzanie członkami
- **Zarządzanie projektami** - Tworzenie projektów w ramach zespołów
- **Zarządzanie zadaniami** - Pełna funkcjonalność CRUD dla zadań z szacowanym czasem, edycją i usuwaniem
- **Widok tablicy Kanban w stylu Trello** - Nowoczesna tablica z uproszczonymi kartami, drag & drop i szczegółami po kliknięciu
- **Konfigurowalne statusy zadań** - Możliwość definiowania własnych statusów dla każdego projektu
- **Ustawienia projektu** - Zarządzanie statusami zadań z kolorami i kolejnością
- **Time tracking** - Logowanie czasu pracy nad zadaniami, śledzenie postępu względem szacowanego czasu
- **Załączniki obrazków** - Możliwość dodawania obrazków do zadań podczas tworzenia i edycji
- **Dokumenty projektów** - Upload i zarządzanie dokumentami projektów (PDF, DOC, itp.) z kategoryzacją
- **Lista todos** - Funkcjonalność checklist w zadaniach z możliwością dodawania, edycji i usuwania elementów
- **Dashboard** - Przegląd statystyk i ostatnich aktywności
- **Widok kalendarza** - Wyświetlanie zadań według terminów wykonania
- **Dark mode** - Tryb ciemny jako domyślny z możliwością przełączania (jasny/ciemny/systemowy)
- **Mono theme** - Monochromatyczny motyw z wykorzystaniem najnowszej wersji shadcn/ui
- **Responsywny interfejs** - Zbudowany z shadcn/ui i Tailwind CSS

### 🔄 Planowane funkcjonalności
- Zaproszenia do zespołów przez email
- Powiadomienia w aplikacji
- ✅ ~~Załączniki plików (dokumenty, PDF, itp.)~~ - **ZAIMPLEMENTOWANE**
- Zaawansowane raporty i analityka
- Wyszukiwarka globalna
- Szablony projektów z predefiniowanymi statusami

## 🛠 Technologie

- **Framework**: Next.js 15 (React) z App Router
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **Motywy**: next-themes (dark mode jako domyślny)
- **ORM**: Prisma
- **Baza danych**: SQLite (łatwa migracja na PostgreSQL)
- **Uwierzytelnianie**: NextAuth.js
- **Ikony**: Lucide React
- **TypeScript**: Pełne wsparcie typów

## 📦 Instalacja i uruchomienie

### Wymagania
- Node.js 18+
- npm/yarn/pnpm

### Kroki instalacji

1. **Sklonuj repozytorium**
```bash
git clone <repository-url>
cd teamflow
```

2. **Zainstaluj zależności**
```bash
npm install
```

3. **Skonfiguruj bazę danych**
```bash
# Wygeneruj klienta Prisma
npx prisma generate

# Utwórz bazę danych
npx prisma db push
```

4. **Skonfiguruj zmienne środowiskowe**
Plik `.env` jest już skonfigurowany z podstawowymi ustawieniami:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

5. **Uruchom aplikację**
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000)

**Status**: ✅ Aplikacja została naprawiona i działa poprawnie z Next.js 15

## 🎯 Nowe funkcjonalności

### Dane dostępowe i dokumentacja projektów ✅
- **Zarządzanie danymi dostępowymi** - Możliwość zapisywania linków do:
  - Repozytorium kodu (GitHub, GitLab, itp.)
  - Serwera aplikacji
  - API endpoints
  - Panelu administracyjnego
  - Środowiska testowego i produkcyjnego
  - Bazy danych
- **System dokumentacji** - Załączanie plików do projektów:
  - Obsługa różnych formatów (PDF, DOC, TXT, obrazy, itp.)
  - Kategoryzacja dokumentów (specyfikacja, projekt, instrukcja, inne)
  - Dodawanie opisów do plików
  - Drag & drop interface
  - Walidacja rozmiaru plików (max 10MB)
- **Rozszerzona strona informacji o projekcie** - Nowe sekcje:
  - Przegląd danych dostępowych z linkami
  - Galeria dokumentów z możliwością pobierania
  - Edycja danych dostępowych w ustawieniach projektu

### Ujednolicony system ładowania stron
- **Spójne stany ładowania** - Jednolity wygląd ładowania na wszystkich stronach dashboardu
- **Komponenty szkieletowe** - Zaawansowane animowane szkielety ładowania dopasowane do zawartości
- **Warianty układów** - Dedykowane układy dla różnych typów stron:
  - `dashboard` - dla strony głównej z statystykami i kartami
  - `list` - dla stron z listami (zespoły, projekty, zadania)
  - `details` - dla stron szczegółów z kartami informacyjnymi
  - `calendar` - dla widoku kalendarza z siatką dni
  - `minimal` - dla prostych stanów ładowania
- **Elastyczna konfiguracja** - Możliwość dostosowania liczby elementów, kolumn i wyglądu
- **Lepsza UX** - Płynne przejścia między stanami ładowania a zawartością

### Tablica Kanban w stylu Trello

### Nowy wygląd tablicy Kanban
- **Widok tablicy** - Przełączanie między widokiem listy a tablicą Kanban w szczegółach projektu
- **Filtrowanie zadań** - Możliwość filtrowania zadań według przypisania:
  - Wszystkie zadania w projekcie
  - Moje zadania (przypisane do zalogowanego użytkownika)
  - Zadania konkretnej osoby z zespołu
  - Liczniki zadań dla każdej opcji filtrowania
- **Karty w stylu Trello** - Uproszczone karty pokazujące tylko najważniejsze informacje:
  - Tytuł zadania
  - Avatar przypisanej osoby
  - Etykiety priorytetu (kolorowe badges)
  - Licznik subtasków (jeśli istnieją)
  - Data deadline z ostrzeżeniem o przeterminowaniu
- **Szczegóły po kliknięciu** - Kliknięcie na kartę otwiera modal z pełnymi szczegółami zadania
- **Przeciąganie zadań** - Intuicyjne przenoszenie zadań między kolumnami statusów z animacjami
- **Wizualne kolumny** - Kolumny w stylu Trello z szarym tłem i białymi kartami
- **Animacje i efekty** - Płynne animacje hover, drag & drop z wizualnym feedbackiem

### Konfigurowalne statusy zadań
- **Ustawienia projektu** - Dostęp przez przycisk "Settings" w szczegółach projektu
- **Własne statusy** - Tworzenie niestandardowych statusów (np. "Review", "Testing", "Blocked")
- **Kolory statusów** - Wybór kolorów z palety lub własny kolor hex
- **Kolejność statusów** - Przeciąganie statusów w ustawieniach aby zmienić kolejność na tablicy
- **Status domyślny** - Oznaczanie statusu jako domyślny dla nowych zadań
- **Zarządzanie statusami** - Edycja i usuwanie statusów (z ochroną przed usunięciem używanych)

### Szczegóły implementacji tablicy Trello
- **TaskBoardFilters** - Nowy komponent do filtrowania zadań z dropdown menu
- **TaskDetailsDialog** - Komponent do wyświetlania pełnych szczegółów zadania
- **Uproszczone karty** - Karty pokazują tylko kluczowe informacje, reszta dostępna po kliknięciu
- **Filtrowanie w czasie rzeczywistym** - Natychmiastowe filtrowanie zadań bez przeładowania strony
- **Liczniki zadań** - Wyświetlanie liczby zadań dla każdej opcji filtrowania
- **Optimistic updates** - Natychmiastowe aktualizacje UI podczas przeciągania z rollback w przypadku błędu
- **Responsywny design** - Kolumny przewijane poziomo, karty dostosowują się do szerokości
- **Accessibility** - Obsługa klawiatury, tooltips, odpowiednie kontrasty kolorów

### Lista todos w zadaniach
- **Checklist w zadaniach** - Każde zadanie może mieć listę elementów do zrobienia (todos)
- **Zarządzanie todos** - Dodawanie, edycja, usuwanie i oznaczanie jako ukończone
- **Progress tracking** - Pasek postępu pokazujący procent ukończonych todos
- **Liczniki** - Wyświetlanie liczby ukończonych/wszystkich todos
- **Integracja z API** - Pełna obsługa CRUD przez REST API
- **Real-time updates** - Natychmiastowe aktualizacje UI po zmianach

### Kompatybilność wsteczna
- Istniejące zadania zachowują swoje statusy
- Domyślne statusy (To Do, In Progress, Done) są dostępne gdy nie skonfigurowano własnych
- Płynne przejście między starym a nowym systemem statusów

### Jak używać komponentów ładowania
```tsx
// Importowanie komponentów
import { PageLoadingLayout } from "@/components/ui/page-loading-layout";
import { LoadingSkeleton, LoadingCard, LoadingGrid } from "@/components/ui/loading-skeleton";
import { LoadingSpinner, LoadingOverlay } from "@/components/ui/loading-spinner";

// Podstawowy układ ładowania strony
if (loading) {
  return <PageLoadingLayout variant="list" />;
}

// Dostosowany układ ładowania
if (loading) {
  return (
    <PageLoadingLayout
      variant="dashboard"
      showTopBar={true}
      showStats={true}
      gridColumns={3}
      gridItems={6}
    />
  );
}

// Pojedyncze komponenty szkieletowe
<LoadingSkeleton className="h-8 w-32" />
<LoadingCard headerLines={2} contentLines={3} />
<LoadingGrid columns={3} items={6} />

// Spinnery ładowania
<LoadingSpinner size="md" text="Ładowanie..." />
<LoadingOverlay text="Przetwarzanie danych..." />
```

## 📱 Jak korzystać z aplikacji

### Pierwsze kroki
1. **Rejestracja** - Utwórz konto na stronie `/auth/signup`
2. **Logowanie** - Zaloguj się na stronie `/auth/signin`
3. **Utwórz zespół** - Przejdź do sekcji "Teams" i utwórz swój pierwszy zespół
4. **Edytuj zespół** - Kliknij przycisk Settings (⚙️) w karcie zespołu, aby zmienić nazwę i zarządzać członkami
5. **Zarządzaj członkami** - W dialogu edycji zespołu dodawaj i usuwaj członków zespołu
6. **Utwórz projekt** - W sekcji "Projects" utwórz projekt przypisany do zespołu
7. **Dodaj zadania** - W sekcji "Tasks" lub w projekcie dodaj zadania z szacowanym czasem
8. **Edytuj zadania** - Kliknij menu (⋯) na karcie zadania i wybierz "Edit Task" (tylko autor lub przypisana osoba)
9. **Loguj czas** - Kliknij menu (⋯) na karcie zadania i wybierz "Log Time" aby zalogować czas pracy

10. **Generuj raporty** - Przejdź do sekcji "Reports" aby wygenerować szczegółowe raporty:
    - **Time Tracking Report** - Raport czasu pracy z podziałem na użytkowników i projekty
    - **Project Progress Report** - Raport postępu projektów z analizą zadań i efektywności
    - Eksport do PDF, Excel lub CSV

### Nawigacja
- **Dashboard** - Przegląd statystyk i ostatnich aktywności
- **My Tasks** - Zadania przypisane do Ciebie z możliwością edycji i logowania czasu
- **Teams** - Zarządzanie zespołami (tworzenie, edycja nazw, zarządzanie członkami)
- **Projects** - Zarządzanie projektami
- **Reports** - Szczegółowe raporty i analizy czasu pracy oraz postępu projektów
- **Calendar** - Widok kalendarza z zadaniami według terminów wykonania
- **Ustawienia** - Dostępne przez menu użytkownika (kliknij avatar w prawym górnym rogu)
- **Calendar** - Widok kalendarza z zadaniami

## 📊 System raportów

TeamFlow oferuje zaawansowany system raportów umożliwiający szczegółową analizę pracy zespołu:

### Rodzaje raportów

#### 1. Time Tracking Report (Raport czasu pracy)
- **Podsumowanie** - Łączny czas pracy, liczba wpisów, aktywni użytkownicy
- **Statystyki użytkowników** - Czas pracy każdego członka zespołu z podziałem na projekty
- **Statystyki projektów** - Czas poświęcony na każdy projekt z listą współtwórców
- **Analiza dzienna** - Wykres czasu pracy w poszczególnych dniach
- **Wykresy** - Wizualizacja rozkładu czasu między użytkownikami i projektami

#### 2. Project Progress Report (Raport postępu projektów)
- **Wskaźniki ukończenia** - Procent ukończonych zadań w każdym projekcie
- **Analiza zadań** - Podział zadań według statusu (To Do, In Progress, Done)
- **Analiza terminów** - Zadania przeterminowane i zbliżające się terminy
- **Efektywność** - Porównanie szacowanego vs rzeczywistego czasu pracy
- **Wkład zespołu** - Udział poszczególnych członków w projektach

### Filtry i opcje
- **Zakres czasowy** - Filtrowanie według daty (dzień, tydzień, miesiąc, niestandardowy)
- **Projekt** - Ograniczenie do wybranych projektów
- **Zespół** - Filtrowanie według zespołu
- **Użytkownik** - Analiza pracy konkretnej osoby

### Eksport danych
- **PDF** - Sformatowane raporty z wykresami i tabelami
- **Excel** - Szczegółowe dane w arkuszu kalkulacyjnym
- **CSV** - Dane w formacie CSV do dalszej analizy

## 🗄 Struktura bazy danych

```prisma
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  password  String
  avatarUrl String?
  teams     Team[]   @relation("TeamMembers")
  assignedTasks Task[]
  comments  Comment[]
}

model Team {
  id        String    @id @default(cuid())
  name      String
  members   User[]    @relation("TeamMembers")
  projects  Project[]
}

model Project {
  id          String @id @default(cuid())
  name        String
  description String?
  status      String @default("In Progress")

  // Access credentials fields
  repositoryUrl     String?  // URL do repozytorium kodu
  databaseUrl       String?  // URL do bazy danych
  serverUrl         String?  // URL do serwera
  apiUrl            String?  // URL do API
  adminPanelUrl     String?  // URL do panelu administracyjnego
  stagingUrl        String?  // URL do środowiska testowego
  productionUrl     String?  // URL do środowiska produkcyjnego
  credentials       String?  // JSON z zaszyfrowanymi danymi dostępowymi

  teamId      String
  team        Team   @relation(fields: [teamId], references: [id])
  tasks       Task[]
  documents   ProjectDocument[]
}

model Task {
  id            String      @id @default(cuid())
  title         String
  description   String?
  status        String      @default("To Do")
  priority      String?
  dueDate       DateTime?
  estimatedHours Float?     // Szacowany czas w godzinach
  projectId     String
  project       Project     @relation(fields: [projectId], references: [id])
  assigneeId    String?
  assignee      User?       @relation(fields: [assigneeId], references: [id])
  createdById   String      // Autor zadania
  createdBy     User        @relation("TaskCreator", fields: [createdById], references: [id])
  subtasks      Subtask[]
  comments      Comment[]
  timeEntries   TimeEntry[] // Wpisy czasu pracy
  todos         Todo[]      // Lista do zrobienia
}

model Todo {
  id          String   @id @default(cuid())
  title       String
  isCompleted Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model TimeEntry {
  id          String   @id @default(cuid())
  hours       Float    // Czas w godzinach
  description String?  // Opis pracy
  date        DateTime @default(now())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
}

model ProjectDocument {
  id          String   @id @default(cuid())
  filename    String   // Oryginalna nazwa pliku
  url         String   // Ścieżka do zapisanego dokumentu
  mimeType    String   // Typ MIME dokumentu
  size        Int      // Rozmiar pliku w bajtach
  description String?  // Opcjonalny opis dokumentu
  category    String?  // Kategoria (specification, design, manual, other)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploadedById String  // Kto przesłał dokument
  uploadedBy  User     @relation(fields: [uploadedById], references: [id])
}
```

## 🔧 Komendy deweloperskie

```bash
# Uruchomienie w trybie deweloperskim
npm run dev

# Budowanie aplikacji
npm run build

# Uruchomienie produkcyjne
npm start

# Linting
npm run lint

# Resetowanie bazy danych
npx prisma db push --force-reset

# Przeglądanie bazy danych
npx prisma studio

# Dodawanie danych testowych
npm run db:seed
```

## 📁 Struktura projektu

```
teamflow/
├── src/
│   ├── app/                 # App Router (Next.js 13+)
│   │   ├── api/            # API endpoints
│   │   │   ├── auth/       # Autentykacja NextAuth
│   │   │   ├── reports/    # API raportów
│   │   │   ├── tasks/      # API zadań
│   │   │   ├── teams/      # API zespołów
│   │   │   └── projects/   # API projektów
│   │   ├── auth/           # Strony uwierzytelniania
│   │   ├── dashboard/      # Główne strony aplikacji
│   │   │   ├── reports/    # Strona raportów
│   │   │   ├── tasks/      # Strona zadań
│   │   │   ├── teams/      # Strona zespołów
│   │   │   ├── projects/   # Strona projektów
│   │   │   └── calendar/   # Strona kalendarza
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Komponenty React
│   │   ├── ui/            # Komponenty shadcn/ui + loading components
│   │   │   ├── loading-skeleton.tsx    # Komponenty szkieletów ładowania
│   │   │   ├── loading-spinner.tsx     # Komponenty spinnerów ładowania
│   │   │   └── page-loading-layout.tsx # Główny komponent układu ładowania
│   │   ├── dashboard/     # Komponenty dashboardu
│   │   ├── reports/       # Komponenty raportów
│   │   ├── teams/         # Komponenty zespołów
│   │   ├── projects/      # Komponenty projektów
│   │   ├── tasks/         # Komponenty zadań
│   │   └── calendar/      # Komponenty kalendarza
│   └── lib/               # Utilities i konfiguracja
│       ├── auth.ts        # Konfiguracja NextAuth
│       ├── prisma.ts      # Klient Prisma
│       ├── pdf-export.ts  # Eksport do PDF
│       └── utils.ts       # Pomocnicze funkcje
├── prisma/                # Schema bazy danych
│   ├── schema.prisma      # Definicja modeli
│   ├── seed.ts           # Dane testowe
│   └── migrations/       # Migracje bazy danych
├── public/                # Pliki statyczne
└── package.json
```

## 🚀 Deployment

Aplikacja jest gotowa do wdrożenia na platformach takich jak:
- **Vercel** (zalecane dla Next.js)
- **Netlify**
- **Railway**
- **Heroku**

Przed wdrożeniem pamiętaj o:
1. Ustawieniu zmiennych środowiskowych
2. Migracji na bazę danych produkcyjną (np. PostgreSQL)
3. Wygenerowaniu bezpiecznego `NEXTAUTH_SECRET`

## 🔧 Rozwiązywanie problemów

### PDF Export - "doc.autoTable is not a function"
Jeśli napotkasz błąd związany z eksportem PDF, upewnij się że:
- jsPDF i jsPDF-AutoTable są poprawnie zainstalowane
- Import autoTable jest wykonany jako: `import autoTable from 'jspdf-autotable'`
- Funkcja autoTable jest wywoływana jako: `autoTable(doc, options)`

### Problemy z bazą danych
```bash
# Resetowanie bazy danych
npx prisma db push --force-reset
npx prisma db seed
```

### Problemy z uwierzytelnianiem
Sprawdź czy zmienne środowiskowe są poprawnie ustawione w pliku `.env.local`

## 🔌 API Endpoints

### Projekty (Projects)

#### Zarządzanie danymi dostępowymi
```
PATCH /api/projects/[projectId]
```

**Parametry**:
- `repositoryUrl` - URL do repozytorium kodu
- `databaseUrl` - URL do bazy danych
- `serverUrl` - URL do serwera
- `apiUrl` - URL do API
- `adminPanelUrl` - URL do panelu administracyjnego
- `stagingUrl` - URL do środowiska testowego
- `productionUrl` - URL do środowiska produkcyjnego

#### Dokumenty projektu
```
GET /api/projects/[projectId]/documents
POST /api/projects/[projectId]/documents
DELETE /api/projects/[projectId]/documents?documentId=[id]
```

**POST parametry**:
- `file` - Plik do przesłania (FormData)
- `description` - Opcjonalny opis dokumentu
- `category` - Kategoria (specification, design, manual, other)

**Ograniczenia**:
- Maksymalny rozmiar pliku: 10MB
- Obsługiwane formaty: wszystkie typy plików
- Pliki są zapisywane w `public/uploads/projects/{projectId}/documents/`

### Zadania (Tasks)

#### Usuwanie zadania
```
DELETE /api/tasks/[taskId]
```

**Uprawnienia**: Użytkownik może usunąć zadanie jeśli:
- Jest autorem zadania (createdBy)
- Jest przypisany do zadania (assignee)
- Jest członkiem zespołu projektu

**Odpowiedź**:
- `200` - Zadanie zostało usunięte
- `401` - Brak autoryzacji
- `403` - Brak uprawnień do usunięcia
- `404` - Zadanie nie zostało znalezione
- `500` - Błąd serwera

**Kaskadowe usuwanie**: Automatycznie usuwa powiązane:
- Podzadania (subtasks)
- Komentarze (comments)
- Wpisy czasu (timeEntries)
- Załączone obrazy (taskImages)

### Todos
- `GET /api/tasks/[taskId]/todos` - Lista todos dla zadania
- `POST /api/tasks/[taskId]/todos` - Tworzenie nowego todo
- `PATCH /api/tasks/[taskId]/todos/[todoId]` - Aktualizacja todo (title, isCompleted)
- `DELETE /api/tasks/[taskId]/todos/[todoId]` - Usuwanie todo

### Inne endpoints
- `GET /api/tasks` - Lista zadań
- `POST /api/tasks` - Tworzenie zadania
- `GET /api/tasks/[taskId]` - Szczegóły zadania
- `PATCH /api/tasks/[taskId]` - Aktualizacja zadania

## 🤝 Rozwój

Projekt jest otwarty na współpracę. Aby dodać nowe funkcjonalności:

1. Utwórz fork repozytorium
2. Utwórz branch dla nowej funkcjonalności
3. Zaimplementuj zmiany
4. Dodaj testy (jeśli dotyczy)
5. Utwórz Pull Request

## 🔧 Rozwiązane problemy

### Kompatybilność z Next.js 15
- Zaktualizowano parametry API routes do obsługi Promise-based params
- Poprawiono importy NextAuth dla Next.js 15
- Dodano właściwe typy TypeScript dla sesji użytkownika

### Konfiguracja NextAuth.js
- Poprawiono importy `getServerSession` z `next-auth/next`
- Dodano deklaracje typów dla rozszerzenia Session i User
- Usunięto nieprawidłową opcję `signUp` z konfiguracji

### Prisma
- Wygenerowano aktualnego klienta Prisma
- Poprawiono typy w komponentach React

### Pliki konfiguracyjne
- `relationships.txt` - Dokumentacja relacji między elementami systemu
- Zaktualizowano typy TypeScript dla lepszej kompatybilności

### Nowa funkcjonalność - Informacje o projekcie
- Dodano przycisk "Informacje o projekcie" w szczegółach projektu
- Utworzono nową stronę `/dashboard/projects/[projectId]/info`
- Przeniesiono sekcje informacyjne z głównego widoku projektu:
  - Team (nazwa zespołu i liczba członków)
  - Tasks Progress (postęp zadań)
  - Overdue Tasks (przeterminowane zadania)
  - Team Members (szczegółowa lista członków zespołu)
- Dodano dodatkowe sekcje:
  - Project Overview (podstawowe informacje o projekcie)
  - Task Summary (szczegółowe statystyki zadań)
- Przycisk umieszczony między "Settings" a "Add Task" dla lepszej organizacji interfejsu

### Refaktoryzacja komponentów - TopBarUser
- Wydzielono komponent użytkownika z górnego paska nawigacji do osobnego komponentu
- Utworzono `TopBarUser` component w `src/components/dashboard/top-bar-user.tsx`
- Przeniesiono funkcjonalność zarządzania sesją użytkownika i dropdown menu z `DashboardLayout`
- Poprawiono separację odpowiedzialności i możliwość ponownego użycia komponentu
- Zachowano pełną funkcjonalność: avatar użytkownika, dropdown menu, wylogowanie

### Aktualizacja do najnowszej wersji shadcn/ui
- Wszystkie komponenty dashboardu używają najnowszej wersji shadcn/ui
- Zaimplementowano nowoczesne funkcje:
  * Atrybuty data-slot dla identyfikacji komponentów
  * Nowoczesne stylowanie Tailwind z poprawioną dostępnością
  * Ulepszone stany focus z ring styling
  * Automatyczne rozmiary ikon ([&_svg]:size-4)
  * Wsparcie dla prop asChild dla kompozycji komponentów
- Zaktualizowano komponenty: Card, Button, DropdownMenu, Avatar, Badge, Switch, LoadingSkeleton
- Poprawiono Button + Link kompozycję używając asChild prop w DashboardContent
- Wszystkie komponenty następują najnowsze wzorce i najlepsze praktyki shadcn/ui

### Aktualizacja strony Teams (/dashboard/teams)
- Zaktualizowano TeamsContent do najnowszych wzorców shadcn/ui
- Zastąpiono hardkodowane kolory tokenami semantycznymi:
  * text-gray-900 → text-foreground (lepszy kontrast i wsparcie dla dark mode)
  * text-gray-500 → text-muted-foreground (semantyczny kolor dla tekstu pomocniczego)
  * bg-white → bg-background (automatyczne wsparcie dla motywów)
  * bg-gray-100 → bg-muted (semantyczny kolor dla tła elementów)
  * border-gray-200 → border (używa zmiennych CSS)
- Zaktualizowano dialogi CreateTeamDialog i EditTeamDialog:
  * Komunikaty błędów używają text-destructive zamiast text-red-500
  * Poprawione stany hover z semantycznymi kolorami
  * Lepsza dostępność z właściwym kontrastem kolorów
- Wszystkie komponenty związane z zespołami używają najnowszego systemu projektowania shadcn/ui

### Poprawka układu strony - Project Settings
- Naprawiono stronę Project Settings aby wyświetlała się z lewym menu jak inne podstrony
- Dodano brakujący wrapper `DashboardLayout` do strony ustawień projektu
- Dodano sprawdzanie uwierzytelniania i przekierowanie dla niezalogowanych użytkowników
- Strona teraz jest spójna z innymi stronami dashboardu (szczegóły projektu, informacje o projekcie)

### Ulepszenia interfejsu mobilnego - Lewy sidebar
- Lewy sidebar jest teraz zawsze widoczny na urządzeniach mobilnych
- Na mobile wyświetlane są tylko ikony (szerokość 64px) aby zaoszczędzić miejsce
- Na desktop wyświetlane są ikony + etykiety tekstowe (szerokość 256px)
- Komponent użytkownika przeniesiony do sidebar na mobile, pozostaje w górnym pasku na desktop
- Dodano tooltips do elementów nawigacji na mobile dla lepszej dostępności
- Usunięto menu hamburger i funkcjonalność overlay na mobile
- Dostosowano padding głównej zawartości: 64px na mobile, 256px na desktop

### Poprawka domyślnych statusów zadań
- **Problem**: Przy dodawaniu nowego statusu lub edycji istniejącego znikały domyślne statusy ("To Do", "In Progress", "Done")
- **Rozwiązanie**: Automatyczne tworzenie domyślnych statusów w bazie danych przy tworzeniu nowego projektu
- Domyślne statusy są teraz trwale zapisywane w bazie danych zamiast być zwracane jako tymczasowe dane
- Dodano migrację dla istniejących projektów - domyślne statusy są tworzone przy pierwszym pobraniu jeśli nie istnieją
- Domyślne statusy: "To Do" (domyślny, #6B7280), "In Progress" (#3B82F6), "Done" (#10B981)
- Zaktualizowano dokumentację w `relationships.txt` i utworzono plik testowy `test-default-statuses.md`

### Funkcjonalność usuwania zadań
- **Dodano**: Kompletna funkcjonalność usuwania zadań z odpowiednimi sprawdzeniami uprawnień
- **Endpoint API**: `DELETE /api/tasks/[taskId]` z kaskadowym usuwaniem powiązanych danych
- **UI**: Opcja usuwania w dropdown menu zadań, przycisk w oknie szczegółów zadania
- **Bezpieczeństwo**: Sprawdzenie uprawnień - tylko autor, przypisana osoba lub członek zespołu może usunąć zadanie
- **UX**: Dialog potwierdzenia z ostrzeżeniem o nieodwracalności operacji
- **Komponenty**: Nowy komponent AlertDialog do potwierdzania operacji usuwania
- **Dokumentacja**: Zaktualizowano `relations.txt` z opisem uprawnień i relacji

### Przeniesienie linku ustawień do menu użytkownika
- **Zmiana**: Link do ustawień przeniesiony z bocznego menu nawigacyjnego do menu użytkownika
- **Lokalizacja**: Ustawienia dostępne przez kliknięcie avatara użytkownika w prawym górnym rogu
- **UI**: Dodano funkcjonalny link "Ustawienia" w dropdown menu użytkownika
- **Nawigacja**: Usunięto "Ustawienia" z głównego menu bocznego dla lepszej organizacji
- **Spójność**: Zachowano polskie nazwy i ikony dla lepszego UX
- **Komponenty**: Zaktualizowano TopBarUser i DashboardLayout

### Poprawka funkcjonalności todos
- **Problem**: Dane z listy todo nie dodawały się do bazy danych i nie były wyświetlane
- **Przyczyna**: Brak `todos: true` w include API endpoint `/api/tasks`, brak odświeżania danych w TaskDetailsDialog
- **Rozwiązanie**:
  - Dodano `todos: true` w include dla GET /api/tasks aby todos były pobierane z bazy danych
  - Dodano pobieranie aktualnych danych zadania w TaskDetailsDialog przy otwieraniu
  - Dodano onTaskUpdated callback do odświeżania listy zadań po zmianach todos
- **Komponenty**: TaskTodos, TaskDetailsDialog, TasksContent
- **API**: Pełna obsługa CRUD dla todos z odpowiednimi endpoint'ami
- **Dokumentacja**: Utworzono `RELACJE_TODOS.txt` z szczegółowym opisem relacji i rozwiązania

### Implementacja Mono Theme i ulepszenia UI
- **Mono Theme**: Zaimplementowano monochromatyczny motyw wykorzystujący najnowszą wersję shadcn/ui
- **Kolory**: Zaktualizowano CSS variables dla spójnego, minimalistycznego wyglądu w trybach jasnym i ciemnym
- **Dialog dodawania zadania**: Znaczące ulepszenia UI:
  - Zwiększona szerokość i lepsze przewijanie (max-w-[700px], max-h-[90vh])
  - Ulepszone etykiety z oznaczeniami wymaganych pól (*)
  - Większe pola wyboru (h-10) dla lepszej dostępności
  - Dodano ikony priorytetów (kolorowe kropki) i awatary członków zespołu
  - Ulepszona sekcja załączników z efektami hover i lepszym układem
  - Responsywne przyciski z animowanym spinnerem ładowania
  - Lepsze wyświetlanie błędów z tłem i obramowaniem
- **Theme Toggle**: Dodano ikony dla każdej opcji motywu
- **Dokumentacja**: Utworzono `MONO_THEME_IMPLEMENTATION.txt` z szczegółowym opisem zmian

### Stylowanie strony "Moje zadania" według standardów shadcn/ui
- **Refaktoryzacja layoutu**: Zastąpiono sticky top bar prostszym flex layout z `flex-1 space-y-4`
- **Semantic color system**: Użycie `text-muted-foreground`, `text-destructive` zamiast hardcoded colors
- **Ulepszone typography**: `text-3xl font-bold tracking-tight` dla nagłówków, lepsze hierarchie
- **Task cards**: Dodano border-left accent na hover, lepsze visual feedback
- **Empty states**: Większe ikony (h-16), lepsze centrum layout, semantic colors
- **Badges**: Użycie `variant="outline"` i `variant="secondary"`, polskie tłumaczenia
- **Responsive design**: Mobile-first approach z lepszymi breakpoints
- **Component structure**: Proper shadcn/ui patterns z CardHeader, CardContent
- **Spacing system**: Consistent spacing z `space-y-*`, `gap-*`, `py-*`
- **Dokumentacja**: Utworzono `TASKS_PAGE_SHADCN_STYLING.txt` z szczegółowym opisem wzorców

### Redesign podglądu zadania według najnowszych wzorców shadcn/ui
- **Struktura z Tabs**: Podział na 4 sekcje - Przegląd, Zadania, Komentarze, Aktywność
- **Card-based Layout**: Każda sekcja w osobnej karcie dla lepszej organizacji
- **Semantic Color System**: `text-muted-foreground`, `text-destructive` zamiast hardcoded colors
- **Enhanced Typography**: `text-2xl font-bold` dla tytułów, lepsze hierarchie
- **Improved Dialog**: `max-w-5xl` szerokość, `overflow-hidden` dla lepszego UX
- **Better Task Details**: Grid layout, większe avatary, progress bar dla czasu pracy
- **Enhanced Subtasks**: Card wrapper, lepsze styling z borders, większe ikony
- **Activity Tab**: Nowa sekcja z historią zadania i wpisami czasu
- **Responsive Design**: Mobile-first approach z proper overflow handling
- **Polish Translations**: Wszystkie teksty przetłumaczone na język polski
- **Dokumentacja**: Utworzono `TASK_DETAILS_SHADCN_REDESIGN.txt` z szczegółowym opisem

### Implementacja Dark Mode
- **Biblioteka**: Zainstalowano i skonfigurowano `next-themes` dla zarządzania motywami
- **Domyślny motyw**: Dark mode ustawiony jako domyślny dla lepszego doświadczenia użytkownika
- **Przełączanie motywów**:
  - Przycisk toggle w górnym pasku nawigacji (obok menu użytkownika)
  - Funkcjonalne przyciski w ustawieniach aplikacji (zakładka "Wygląd")
  - Obsługa trzech trybów: jasny, ciemny, systemowy
- **CSS Variables**: Wykorzystano istniejące zmienne CSS dla dark mode w `globals.css`
- **Komponenty**:
  - Utworzono `ThemeToggle` component z dropdown menu
  - Zaktualizowano `TopBarUser` o przełącznik motywu
  - Zintegrowano `useTheme` hook w ustawieniach
- **Provider**: Dodano `ThemeProvider` do głównego layoutu aplikacji
- **Hydration**: Dodano `suppressHydrationWarning` dla poprawnej obsługi SSR
- **Kolory**: Zamieniono wszystkie hardcoded kolory Tailwind na CSS variables w komponentach dashboardu
- **Layout**: Sidebar, top bar i wszystkie główne komponenty obsługują dark mode
- **Funkcje kolorów**: Priority i status badges używają CSS variables z fallback dla dark mode

## 📋 Ostatnie aktualizacje

### Naprawa liczby zadań z todolist (2025-01-17)
- **Problem**: Nieprawidłowa liczba zadań w szczegółach projektu - nie uwzględniała todos
- **Rozwiązanie**:
  - Naprawiono API endpoint `/api/projects/[projectId]` - dodano `todos: true` do include
  - Poprawiono komponent `project-details-content.tsx` - naprawiono przypisanie stats
  - Dodano wyświetlanie statystyk zadań w formie kart (wszystkie, ukończone, w toku, zaległe)
  - Utworzono test weryfikacyjny `test-todos-count.js`
- **Pliki zmienione**:
  - `src/app/api/projects/[projectId]/route.ts`
  - `src/components/projects/project-details-content.tsx`
  - `test-todos-count.js` (nowy)
  - `TODOS_COUNT_FIX.txt` (dokumentacja)

## 📄 Licencja

Ten projekt jest dostępny na licencji MIT.
