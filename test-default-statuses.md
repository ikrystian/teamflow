# Test Scenariuszy Domyślnych Statusów

## Problem
Gdy użytkownik dodawał nowy status lub edytował istniejący w ustawieniach projektu, znikały domyślne statusy ("To Do", "In Progress", "Done").

## Rozwiązanie
1. **Automatyczne tworzenie domyślnych statusów** przy tworzeniu nowego projektu
2. **Migracja istniejących projektów** - domyślne statusy są tworzone przy pierwszym pobraniu jeśli nie istnieją
3. **Usunięcie logiki tymczasowych statusów** - wszystkie statusy są teraz zapisywane w bazie danych

## Scenariusze testowe

### 1. Nowy projekt
- [ ] Utwórz nowy projekt
- [ ] Sprawdź czy automatycznie utworzono 3 domyślne statusy:
  - "To Do" (domyślny, kolor: #6B7280)
  - "In Progress" (kolor: #3B82F6)
  - "Done" (kolor: #10B981)

### 2. Dodawanie nowego statusu
- [ ] Przejdź do ustawień projektu
- [ ] Dodaj nowy status (np. "Review")
- [ ] Sprawdź czy wszystkie 4 statusy są widoczne (3 domyślne + 1 nowy)
- [ ] Sprawdź czy domyślne statusy nie zniknęły

### 3. Edycja istniejącego statusu
- [ ] Edytuj jeden z domyślnych statusów (np. zmień kolor "To Do")
- [ ] Sprawdź czy wszystkie statusy nadal są widoczne
- [ ] Sprawdź czy zmiany zostały zapisane

### 4. Istniejący projekt (migracja)
- [ ] Sprawdź projekt który istniał przed zmianami
- [ ] Przejdź do ustawień projektu
- [ ] Sprawdź czy automatycznie utworzono domyślne statusy

### 5. Tworzenie zadania
- [ ] Utwórz nowe zadanie
- [ ] Sprawdź czy domyślny status "To Do" jest automatycznie wybrany
- [ ] Sprawdź czy wszystkie statusy są dostępne w dropdown

## Zmiany w kodzie

### 1. `src/app/api/projects/route.ts`
- Dodano transakcję przy tworzeniu projektu
- Automatyczne tworzenie domyślnych statusów w bazie danych

### 2. `src/app/api/projects/[projectId]/task-statuses/route.ts`
- Usunięto logikę zwracania tymczasowych domyślnych statusów
- Dodano migrację dla istniejących projektów

### 3. `src/components/projects/project-settings-content.tsx`
- Zaktualizowano komunikat gdy brak statusów

### 4. `relationships.txt`
- Dodano dokumentację nowego zachowania domyślnych statusów
