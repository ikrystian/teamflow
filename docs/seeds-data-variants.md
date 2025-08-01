# Seeds - Warianty Danych Testowych

## Przegląd

Plik `prisma/seed.ts` zawiera kompleksowe dane testowe obejmujące wszystkie aspekty aplikacji Nexus. Dane zostały zaprojektowane tak, aby pokazać różnorodne scenariusze użycia i stany aplikacji.

## Użytkownicy (6 osób)

### Administrator
- **Email:** krystian@bpcoders.pl
- **Hasło:** admin123
- **Rola:** admin
- **Profil:** System Administrator z BP Coders, Warszawa
- **Uprawnienia:** Pełny dostęp do wszystkich funkcji systemu

### Team Lead
- **Email:** john@example.com
- **Hasło:** password123
- **Rola:** user
- **Profil:** Team Lead & Senior Developer z TechCorp, Kraków
- **Specjalizacja:** Zarządzanie zespołem i programowanie

### Frontend Developer
- **Email:** jane@example.com
- **Hasło:** password123
- **Rola:** user
- **Profil:** Frontend Developer z TechCorp, Gdańsk
- **Specjalizacja:** UI/UX, React, TypeScript

### UI/UX Designer
- **Email:** bob@example.com
- **Hasło:** password123
- **Rola:** user
- **Profil:** UI/UX Designer z DesignStudio, Wrocław
- **Specjalizacja:** Design mobilny i webowy

### Backend Developer
- **Email:** alice@example.com
- **Hasło:** password123
- **Rola:** user
- **Profil:** Backend Developer z TechCorp, Poznań
- **Specjalizacja:** Architektury systemów, bazy danych

### DevOps Engineer
- **Email:** charlie@example.com
- **Hasło:** password123
- **Rola:** user
- **Profil:** DevOps Engineer z CloudTech, Łódź
- **Specjalizacja:** Automatyzacja, infrastruktura chmurowa

## Zespoły (3 zespoły)

### Main Development Team
- **Członkowie:** Admin, John (Team Lead), Jane (Frontend), Alice (Backend)
- **Fokus:** Główny rozwój platformy Nexus

### Design & UX Team
- **Członkowie:** Jane (Frontend), Bob (Designer)
- **Fokus:** Design i doświadczenie użytkownika

### DevOps & Infrastructure
- **Członkowie:** Alice (Backend), Charlie (DevOps)
- **Fokus:** Infrastruktura i automatyzacja

## Projekty (4 projekty)

### 1. Nexus - Project Management Platform
- **Status:** In Progress
- **Zespół:** Main Development Team
- **Opis:** Główna platforma zarządzania projektami
- **Konfiguracja:** Pełna (repo, API, staging, production)
- **Kolor:** Niebieski (#3B82F6)
- **Ikona:** 🚀

### 2. Nexus Mobile App
- **Status:** Planning
- **Zespół:** Design & UX Team
- **Opis:** Aplikacja mobilna z funkcjami offline
- **Kolor:** Zielony (#10B981)
- **Ikona:** 📱

### 3. Analytics Dashboard
- **Status:** In Progress
- **Zespół:** Main Development Team
- **Opis:** Dashboard analityczny z raportami
- **Kolor:** Fioletowy (#8B5CF6)
- **Ikona:** 📊

### 4. Cloud Infrastructure
- **Status:** Maintenance
- **Zespół:** DevOps & Infrastructure
- **Opis:** Infrastruktura chmurowa i automatyzacja
- **Kolor:** Pomarańczowy (#F59E0B)
- **Ikona:** ☁️

## Statusy Zadań (6 statusów)

1. **To Do** - Szary (#6B7280) - Domyślny
2. **In Progress** - Niebieski (#3B82F6)
3. **In Review** - Pomarańczowy (#F59E0B)
4. **Testing** - Fioletowy (#8B5CF6)
5. **Done** - Zielony (#10B981)
6. **Blocked** - Czerwony (#EF4444)

## Zadania (15 zadań)

### Przykłady różnych stanów:
- **Ukończone:** Implementacja autentykacji, wireframes mobilne, Docker setup
- **W trakcie:** Dashboard, API, wykresy analityczne
- **W review:** API, CI/CD pipeline
- **W testowaniu:** Prototyp mobilny
- **Do zrobienia:** Time tracking, notyfikacje, monitoring
- **Zablokowane:** Integracja płatności (czeka na zgodę prawną)

### Różne priorytety:
- **High:** Autentykacja, API, CI/CD, płatności
- **Medium:** Dashboard, time tracking, notyfikacje, monitoring
- **Low:** Raporty analityczne

### Terminy wykonania (dueDate):
- Wszystkie zadania mają precyzyjne terminy z godziną (datetime)
- Różne godziny zakończenia: 14:00, 15:00, 16:00, 17:00, 18:00
- Realistyczne terminy uwzględniające czas pracy zespołu

## Scenariusze Testowe

### 1. Kompletny Workflow
- Zadanie przechodzi przez wszystkie statusy
- Śledzenie czasu od rozpoczęcia do zakończenia
- Komentarze i feedback zespołu

### 2. Współpraca Zespołowa
- Zadania przypisane do różnych osób
- Komentarze między członkami zespołu
- Subtaski z podziałem odpowiedzialności

### 3. Zarządzanie Projektami
- Projekty w różnych fazach
- Różne konfiguracje (URLs, credentials)
- Dokumentacja projektowa

### 4. Problemy i Blokady
- Zadanie zablokowane z powodem
- Historia blokowania/odblokowania
- Komunikacja o problemach

### 5. Śledzenie Czasu
- Realistyczne wpisy czasu (1-6h dziennie)
- Szczegółowe opisy pracy
- Historia dla różnych zadań i użytkowników

## Uruchomienie

```bash
# Dodanie danych (zachowuje istniejące)
npm run db:seed

# Pełny reset i świeże dane
npm run db:reset
```

## Testowanie Funkcjonalności

Po uruchomieniu seeds można przetestować:
- Logowanie różnymi kontami
- Przegląd zadań w różnych statusach
- Śledzenie czasu pracy
- Komentowanie i współpracę
- Zarządzanie projektami
- Funkcje administracyjne
- Responsywność i UI/UX
