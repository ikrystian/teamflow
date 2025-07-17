# TeamFlow - Team Project Management Platform

TeamFlow to nowoczesna aplikacja internetowa do zarządzania zadaniami i projektami dla zespołów. Inspirowana funkcjonalnością systemu Asana, ma na celu usprawnienie współpracy, centralizację komunikacji i zwiększenie produktywności.

## 🚀 Funkcjonalności

### ✅ Zaimplementowane (MVP)
- **Uwierzytelnianie użytkowników** - Rejestracja i logowanie z NextAuth.js
- **Zarządzanie zespołami** - Tworzenie zespołów, edycja nazw zespołów i pełne zarządzanie członkami
- **Zarządzanie projektami** - Tworzenie projektów w ramach zespołów
- **Zarządzanie zadaniami** - Pełna funkcjonalność CRUD dla zadań z szacowanym czasem i edycją
- **Widok tablicy Kanban** - Przeciąganie zadań między kolumnami statusów z konfigurowalnymi statusami
- **Konfigurowalne statusy zadań** - Możliwość definiowania własnych statusów dla każdego projektu
- **Ustawienia projektu** - Zarządzanie statusami zadań z kolorami i kolejnością
- **Time tracking** - Logowanie czasu pracy nad zadaniami, śledzenie postępu względem szacowanego czasu
- **Dashboard** - Przegląd statystyk i ostatnich aktywności
- **Widok kalendarza** - Wyświetlanie zadań według terminów wykonania
- **Responsywny interfejs** - Zbudowany z shadcn/ui i Tailwind CSS

### 🔄 Planowane funkcjonalności
- System komentarzy i podzadań
- Zaproszenia do zespołów przez email
- Powiadomienia w aplikacji
- Załączniki do zadań
- Zaawansowane raporty i analityka
- Wyszukiwarka globalna
- Szablony projektów z predefiniowanymi statusami

## 🛠 Technologie

- **Framework**: Next.js 15 (React) z App Router
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
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

## 🎯 Nowe funkcjonalności - Tablica Kanban i konfigurowalne statusy

### Tablica Kanban
- **Widok tablicy** - Przełączanie między widokiem listy a tablicą Kanban w szczegółach projektu
- **Przeciąganie zadań** - Intuicyjne przenoszenie zadań między kolumnami statusów
- **Wizualne kolumny** - Każdy status ma swoją kolumnę z kolorowym oznaczeniem
- **Liczniki zadań** - Wyświetlanie liczby zadań w każdej kolumnie

### Konfigurowalne statusy zadań
- **Ustawienia projektu** - Dostęp przez przycisk "Settings" w szczegółach projektu
- **Własne statusy** - Tworzenie niestandardowych statusów (np. "Review", "Testing", "Blocked")
- **Kolory statusów** - Wybór kolorów z palety lub własny kolor hex
- **Kolejność statusów** - Przeciąganie statusów w ustawieniach aby zmienić kolejność na tablicy
- **Status domyślny** - Oznaczanie statusu jako domyślny dla nowych zadań
- **Zarządzanie statusami** - Edycja i usuwanie statusów (z ochroną przed usunięciem używanych)

### Kompatybilność wsteczna
- Istniejące zadania zachowują swoje statusy
- Domyślne statusy (To Do, In Progress, Done) są dostępne gdy nie skonfigurowano własnych
- Płynne przejście między starym a nowym systemem statusów

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
  teamId      String
  team        Team   @relation(fields: [teamId], references: [id])
  tasks       Task[]
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
│   │   ├── ui/            # Komponenty shadcn/ui
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

## 📄 Licencja

Ten projekt jest dostępny na licencji MIT.
