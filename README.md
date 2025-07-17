# TeamFlow - Team Project Management Platform

TeamFlow to nowoczesna aplikacja internetowa do zarządzania zadaniami i projektami dla zespołów. Inspirowana funkcjonalnością systemu Asana, ma na celu usprawnienie współpracy, centralizację komunikacji i zwiększenie produktywności.

## 🚀 Funkcjonalności

### ✅ Zaimplementowane (MVP)
- **Uwierzytelnianie użytkowników** - Rejestracja i logowanie z NextAuth.js
- **Zarządzanie zespołami** - Tworzenie zespołów, edycja nazw zespołów i pełne zarządzanie członkami
- **Zarządzanie projektami** - Tworzenie projektów w ramach zespołów
- **Zarządzanie zadaniami** - Pełna funkcjonalność CRUD dla zadań z szacowanym czasem i edycją
- **Time tracking** - Logowanie czasu pracy nad zadaniami, śledzenie postępu względem szacowanego czasu
- **Dashboard** - Przegląd statystyk i ostatnich aktywności
- **Widok kalendarza** - Wyświetlanie zadań według terminów wykonania
- **Responsywny interfejs** - Zbudowany z shadcn/ui i Tailwind CSS

### 🔄 Planowane funkcjonalności
- Widok tablicy Kanban dla projektów
- System komentarzy i podzadań
- Zaproszenia do zespołów przez email
- Powiadomienia w aplikacji
- Załączniki do zadań
- Zaawansowane raporty i analityka
- Wyszukiwarka globalna

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

### Nawigacja
- **Dashboard** - Przegląd statystyk i ostatnich aktywności
- **My Tasks** - Zadania przypisane do Ciebie z możliwością edycji i logowania czasu
- **Teams** - Zarządzanie zespołami (tworzenie, edycja nazw, zarządzanie członkami)
- **Projects** - Zarządzanie projektami
- **Calendar** - Widok kalendarza z zadaniami

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
```

## 📁 Struktura projektu

```
teamflow/
├── src/
│   ├── app/                 # App Router (Next.js 13+)
│   │   ├── api/            # API endpoints
│   │   ├── auth/           # Strony uwierzytelniania
│   │   ├── dashboard/      # Główne strony aplikacji
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Komponenty React
│   │   ├── ui/            # Komponenty shadcn/ui
│   │   ├── dashboard/     # Komponenty dashboardu
│   │   ├── teams/         # Komponenty zespołów
│   │   ├── projects/      # Komponenty projektów
│   │   └── tasks/         # Komponenty zadań
│   └── lib/               # Utilities i konfiguracja
├── prisma/                # Schema bazy danych
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

## 📄 Licencja

Ten projekt jest dostępny na licencji MIT.
