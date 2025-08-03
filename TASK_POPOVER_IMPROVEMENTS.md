# Ulepszenia Task Popover - Edytowalne pola i szybkie dodawanie czasu

## Opis zmian

Zaimplementowano ulepszenia w komponencie `TaskPopover` zgodnie z wymaganiami:

1. **Edytowalne pola w szczegółach zadania** - analogiczne do tych z "Przegląd wszystkich zadań z całego systemu"
2. **Szybkie dodawanie czasu pracy** - prosty komponent do raportowania czasu bezpośrednio w popover
3. **Aktualizacja danych na onChange** z wyświetlaniem powiadomień Sonner

## Nowe komponenty

### QuickTimeEntry (`src/components/tasks/quick-time-entry.tsx`)
- Prosty komponent do szybkiego dodawania czasu pracy
- Dropdown z predefiniowanymi wartościami (15 min - 8h)
- Opcjonalny opis wpisu czasu
- Automatyczne wyświetlanie powiadomień Sonner
- Kompaktowy interfejs idealny do popover

### TaskDetailsForm (`src/components/tasks/task-details-form.tsx`)
- Kompletny formularz do edycji szczegółów zadania
- Wszystkie pola w jednym miejscu (przypisana osoba, termin, priorytet, status, szacowany czas)
- Walidacja i sprawdzanie zmian przed zapisem
- Kompaktowy design dostosowany do popover
- Automatyczne powiadomienia o sukcesie/błędzie

### Zaktualizowany TaskPopover (`src/components/tasks/task-popover.tsx`)
- **Formularz szczegółów zadania**:
  - Przycisk "Edytuj" otwiera kompletny formularz
  - Wszystkie pola w jednym miejscu dla szybkiej edycji
  - Przypisana osoba (dropdown z avatarami)
  - Termin wykonania (calendar picker)
  - Priorytet (dropdown z kolorami)
  - Status (dropdown z kolorami)
  - Szacowany czas (input numeryczny)

- **Edytowalne pola nagłówka**:
  - Tytuł zadania (inline editing)
  - Opis zadania (inline editing)
  - Priorytet (inline dropdown)
  - Status (inline dropdown)

- **Optimistic Updates**:
  - Natychmiastowa aktualizacja UI
  - Powiadomienia Sonner o statusie operacji
  - Rollback w przypadku błędu

- **Kontrola uprawnień**:
  - Edycja tylko dla twórcy zadania lub przypisanej osoby
  - Automatyczne sprawdzanie uprawnień na podstawie sesji
  - Przycisk "Edytuj" widoczny tylko dla uprawnionych użytkowników

## Zmiany w istniejących komponentach

### TasksWeeklyCalendar
- Dodano props: `onTaskUpdate`, `teamMembers`
- Funkcja `canEditTask` do sprawdzania uprawnień
- Przekazywanie nowych props do TaskPopover

### CalendarContent
- Dodano pobieranie użytkowników i sesji
- Funkcja `handleTaskUpdate` do aktualizacji zadań
- Funkcja `handleTimeLogged` do odświeżania danych po dodaniu czasu

### TasksContent
- Funkcja `handleTaskUpdate` do aktualizacji pojedynczych zadań
- Przekazywanie `teamMembers` do komponentów potomnych

## Nowe typy TypeScript

### TaskUpdateData (`src/types/index.ts`)
```typescript
export interface TaskUpdateData extends Partial<Task> {
  assigneeId?: string;
  statusId?: string;
  projectId?: string;
}
```

## Funkcjonalności

### Formularz szczegółów zadania
- **Przycisk "Edytuj"** - otwiera kompletny formularz edycji
- **Wszystkie pola w jednym miejscu**:
  - Przypisana osoba (select z avatarami)
  - Termin wykonania (calendar picker)
  - Priorytet (select z kolorami)
  - Status (select z kolorami)
  - Szacowany czas (number input)
- **Walidacja zmian** - zapisuje tylko zmienione pola
- **Przyciski akcji** - Zapisz/Anuluj z loading states

### Edytowalne pola nagłówka
- **Inline editing** - kliknięcie w pole aktywuje tryb edycji
- **Różne typy pól**:
  - Text input (tytuł, opis)
  - Select dropdown (priorytet, status)
  - User dropdown (przypisana osoba)
  - Date picker (termin)
  - Number input (szacowany czas)

### Szybkie dodawanie czasu
- **Predefiniowane wartości**: 15min, 30min, 45min, 1h, 1.5h, 2h, 2.5h, 3h, 4h, 6h, 8h
- **Opcjonalny opis** wpisu czasu
- **Automatyczna data** - dzisiejsza data
- **Walidacja** - tylko wartości > 0
- **Powiadomienia** o sukcesie/błędzie

### Optimistic Updates
- **Natychmiastowa aktualizacja** UI przed wysłaniem do serwera
- **Loading states** z powiadomieniami Sonner
- **Error handling** z rollback do poprzedniego stanu
- **Success feedback** po pomyślnej aktualizacji

## Uprawnienia

### Edycja zadań
Użytkownik może edytować zadanie jeśli:
- Jest twórcą zadania (`task.createdBy.id === session.user.id`)
- Jest przypisany do zadania (`task.assignee.id === session.user.id`)

### Dodawanie czasu
- Dostępne dla wszystkich użytkowników z uprawnieniami do edycji
- Automatyczne przypisanie wpisu czasu do aktualnego użytkownika

## API Integration

### Aktualizacja zadań
- `PATCH /api/tasks/[taskId]` - aktualizacja pól zadania
- Obsługa częściowych aktualizacji (Partial<Task>)

### Dodawanie czasu
- `POST /api/tasks/[taskId]/time-entries` - dodanie wpisu czasu
- Automatyczne przypisanie do aktualnego użytkownika

## Powiadomienia Sonner

### Typy powiadomień
- **Loading**: "Aktualizowanie zadania..."
- **Success**: "Zadanie zostało zaktualizowane"
- **Error**: "Nie udało się zaktualizować zadania"
- **Time logged**: "Czas został zalogowany"

## Użycie

### W TasksWeeklyCalendar
```tsx
<TaskPopover
  task={task}
  onTaskClick={handleTaskClick}
  onTaskUpdate={onTaskUpdate}
  onTimeLogged={onTaskUpdated}
  users={teamMembers}
  canEdit={canEditTask(task)}
  side="right"
  align="start"
>
```

### W CalendarContent
```tsx
<TaskPopover
  task={task}
  onTaskClick={handleTaskDetails}
  onTaskUpdate={handleTaskUpdate}
  onTimeLogged={handleTimeLogged}
  users={users}
  canEdit={canEditTask(task)}
  side="bottom"
  align="start"
>
```

## Relacje między komponentami

```
TaskPopover
├── EditableCell (dla edytowalnych pól)
├── QuickTimeEntry (dla szybkiego dodawania czasu)
└── TaskDetailsSheet (dla pełnego widoku zadania)

TasksContent
├── TasksWeeklyCalendar
│   └── TaskPopover (z edytowalnymi polami)
└── TaskDetailsSheet

CalendarContent
├── TaskPopover (z edytowalnymi polami)
└── TaskDetailsSheet
```

## Testowanie

Aby przetestować nowe funkcjonalności:

1. **Edytowalne pola**:
   - Otwórz popover zadania w kalendarzu lub widoku tygodniowym
   - Kliknij w dowolne pole (tytuł, opis, priorytet, etc.)
   - Wprowadź zmiany i zatwierdź
   - Sprawdź powiadomienie Sonner

2. **Szybkie dodawanie czasu**:
   - W popover zadania znajdź sekcję "Szybkie dodanie czasu"
   - Wybierz czas z dropdown
   - Opcjonalnie dodaj opis
   - Kliknij przycisk zatwierdzenia
   - Sprawdź powiadomienie o sukcesie

3. **Uprawnienia**:
   - Sprawdź czy pola są edytowalne tylko dla właściciela/przypisanej osoby
   - Przetestuj z różnymi użytkownikami

## Uwagi techniczne

- Wszystkie zmiany są kompatybilne wstecz
- Komponenty używają najnowszej wersji shadcn/ui
- Implementacja jest responsywna i dostępna
- Kod jest w pełni typowany TypeScript
- Usunięto nieużywane referencje do `slackUserId` (pole nie istnieje w modelu User)
