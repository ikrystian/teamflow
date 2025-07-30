# Naprawa liczenia zadań w TasksTable - Nexus

## Problem

W komponencie TasksTable w dashboard występowały następujące problemy:

1. **Nieprawidłowe liczenie zadań** - Footer tabeli pokazywał nieprawidłową liczbę zadań (np. "0 z 5 zadań wybranych" gdy było 4 zadania w bazie)
2. **Liczenie nagłówków grup jako zadań** - Funkcja `table.getFilteredRowModel().rows.length` liczyła wszystkie wiersze włącznie z nagłówkami grup statusów
3. **Możliwość zaznaczania nagłówków grup** - Nagłówki grup mogły być zaznaczane jako wiersze, co powodowało nieprawidłowe liczenie
4. **Mylący tekst** - "zadań wybranych" nie był jasny dla użytkownika

## Rozwiązanie

### 1. Dodanie funkcji pomocniczych do liczenia rzeczywistych zadań

**Plik:** `src/components/dashboard/tasks-table.tsx`

Dodano funkcje pomocnicze które filtrują nagłówki grup i liczą tylko rzeczywiste zadania:

```typescript
// Helper functions to count actual tasks (excluding group headers)
const getActualTasksCount = (rows: { original: TableRow }[]) => {
  return rows.filter(row => !('isGroupHeader' in row.original)).length
}

const getSelectedTasksCount = (rows: { original: TableRow }[]) => {
  return rows.filter(row => !('isGroupHeader' in row.original)).length
}
```

### 2. Zapobieganie selekcji nagłówków grup

Dodano konfigurację `enableRowSelection` w tabeli aby zapobiec zaznaczaniu nagłówków grup:

```typescript
const table = useReactTable({
  // ... inne opcje
  enableRowSelection: (row) => {
    // Disable selection for group headers
    return !('isGroupHeader' in row.original)
  },
  // ... reszta konfiguracji
})
```

### 3. Poprawa footer tabeli

Zaktualizowano footer aby używał nowych funkcji pomocniczych i pokazywał prawidłowe liczby:

```typescript
<div className="flex-1 text-sm text-muted-foreground">
  {getSelectedTasksCount(table.getFilteredSelectedRowModel().rows)} z{" "}
  {getActualTasksCount(table.getFilteredRowModel().rows)} zadań zaznaczonych.
</div>
```

**Zmiany:**
- Użycie `getActualTasksCount()` zamiast `table.getFilteredRowModel().rows.length`
- Użycie `getSelectedTasksCount()` zamiast `table.getFilteredSelectedRowModel().rows.length`
- Zmiana tekstu z "zadań wybranych" na "zadań zaznaczonych" dla lepszej jasności

## Struktura danych tabeli

### Przed poprawką:
```
tableData = [
  { isGroupHeader: true, statusName: "To Do", count: 2 },    // Liczony jako wiersz
  { id: "task1", title: "Zadanie 1", ... },                 // Rzeczywiste zadanie
  { id: "task2", title: "Zadanie 2", ... },                 // Rzeczywiste zadanie
  { isGroupHeader: true, statusName: "In Progress", count: 2 }, // Liczony jako wiersz
  { id: "task3", title: "Zadanie 3", ... },                 // Rzeczywiste zadanie
  { id: "task4", title: "Zadanie 4", ... },                 // Rzeczywiste zadanie
]
// table.getFilteredRowModel().rows.length = 6 (4 zadania + 2 nagłówki)
```

### Po poprawce:
```
tableData = [
  { isGroupHeader: true, statusName: "To Do", count: 2 },    // Ignorowany w liczeniu
  { id: "task1", title: "Zadanie 1", ... },                 // Liczony
  { id: "task2", title: "Zadanie 2", ... },                 // Liczony
  { isGroupHeader: true, statusName: "In Progress", count: 2 }, // Ignorowany w liczeniu
  { id: "task3", title: "Zadanie 3", ... },                 // Liczony
  { id: "task4", title: "Zadanie 4", ... },                 // Liczony
]
// getActualTasksCount() = 4 (tylko rzeczywiste zadania)
```

## Możliwe przyczyny różnicy między bazą a wyświetlaniem

Jeśli nadal występuje różnica między liczbą zadań w bazie a wyświetlanymi, może to być spowodowane:

1. **Filtrowanie zarchiwizowanych projektów:**
   ```typescript
   const activeTasks = optimisticTasks.filter(task => !task.project?.archived)
   ```

2. **Uprawnienia użytkownika** - API endpoint `/api/tasks` filtruje zadania według uprawnień użytkownika

3. **Optimistic updates** - Komponent używa `optimisticTasks` zamiast bezpośrednio `tasks` z props

## Testowanie

### Scenariusze testowe:

1. **Sprawdzenie liczenia zadań:**
   - Zaloguj się do aplikacji
   - Przejdź do dashboard
   - Sprawdź czy liczba zadań w footer odpowiada rzeczywistej liczbie wyświetlanych zadań

2. **Sprawdzenie selekcji:**
   - Spróbuj zaznaczyć nagłówki grup - nie powinno być możliwe
   - Zaznacz rzeczywiste zadania - licznik powinien się aktualizować

3. **Sprawdzenie z różnymi statusami:**
   - Utwórz zadania z różnymi statusami
   - Sprawdź czy wszystkie są prawidłowo liczone

### Debugowanie:

Jeśli problem nadal występuje, można dodać tymczasowe logowanie:

```typescript
console.log('TasksTable Debug:', {
  totalOptimisticTasks: optimisticTasks.length,
  activeTasks: activeTasks.length,
  archivedTasks: optimisticTasks.filter(task => task.project?.archived).length,
  tasksWithoutProject: optimisticTasks.filter(task => !task.project).length
})
```

## Pliki zmodyfikowane

1. `src/components/dashboard/tasks-table.tsx` - główne poprawki liczenia i selekcji

## Rezultat

- Footer tabeli pokazuje prawidłową liczbę zadań (bez nagłówków grup)
- Nagłówki grup nie mogą być zaznaczane
- Tekst jest bardziej jasny dla użytkownika
- Liczenie zadań jest spójne z rzeczywistą liczbą wyświetlanych zadań
