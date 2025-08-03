# Test kalendarza zadań - Wyświetl zadania według daty ich wykonania

## Zmiany wprowadzone

### 1. Wykluczenie niedziel z kalendarza
- ✅ Kalendarz wyświetla tylko 6 dni tygodnia (Pon-Sob)
- ✅ Nagłówki dni tygodnia zaktualizowane do 6 kolumn
- ✅ Siatka kalendarza zmieniona z `grid-cols-7` na `grid-cols-6`
- ✅ Logika pierwszego dnia miesiąca dostosowana do wykluczenia niedziel
- ✅ Dni będące niedzielami są pomijane w renderowaniu

### 2. Oznaczenie zadań kolorem projektu
- ✅ Zadania wyświetlane z lewą kolorową krawędzią (`border-l-4`)
- ✅ Kolor pobierany z `task.project?.color` lub domyślny `#3B82F6`
- ✅ Zmieniono styl z niebieskiego tła na białe tło z kolorową krawędzią

### 3. Wyświetlanie godziny rozpoczęcia zadania
- ✅ Dodano funkcję `formatStartTime()` formatującą czas w formacie HH:MM
- ✅ Godzina wyświetlana przed tytułem zadania (jeśli dostępna)
- ✅ Czas wyświetlany w formacie polskim (24-godzinnym)

### 4. Aktualizacja logiki filtrowania zadań
- ✅ Funkcja `getTasksForDate()` używa `startTime` lub `dueDate`
- ✅ Zadania sortowane według czasu rozpoczęcia lub terminu wykonania
- ✅ Pobieranie zadań uwzględnia zarówno `dueDate` jak i `startTime`

## Scenariusze testowe

### Test 1: Wykluczenie niedziel
1. Przejdź do kalendarza zadań
2. Sprawdź nagłówki dni tygodnia - powinny być tylko: Pon, Wt, Śr, Czw, Pt, Sob
3. Sprawdź czy siatka ma 6 kolumn zamiast 7
4. Nawiguj między miesiącami - niedziele nie powinny być wyświetlane

### Test 2: Kolory projektów
1. Utwórz zadania w różnych projektach z różnymi kolorami
2. Sprawdź czy zadania mają lewą kolorową krawędź odpowiadającą kolorowi projektu
3. Zadania bez projektu powinny mieć domyślny niebieski kolor (#3B82F6)

### Test 3: Godziny rozpoczęcia
1. Utwórz zadanie z ustawionym `startTime`
2. Sprawdź czy godzina wyświetla się przed tytułem zadania w formacie HH:MM
3. Utwórz zadanie bez `startTime` - godzina nie powinna się wyświetlać
4. Sprawdź czy format czasu jest polski (24-godzinny)

### Test 4: Pozycjonowanie zadań
1. Utwórz zadanie z `startTime` ale bez `dueDate`
2. Sprawdź czy zadanie pojawia się w dniu odpowiadającym `startTime`
3. Utwórz zadanie z `dueDate` ale bez `startTime`
4. Sprawdź czy zadanie pojawia się w dniu odpowiadającym `dueDate`
5. Sprawdź sortowanie zadań w ramach jednego dnia

### Test 5: Responsywność i UX
1. Sprawdź czy kalendarz działa na różnych rozmiarach ekranu
2. Sprawdź hover effects na zadaniach
3. Sprawdź czy kliknięcie w zadanie otwiera szczegóły
4. Sprawdź czy TaskPopover działa poprawnie

## Struktura plików

### Zmodyfikowane pliki
- `src/components/calendar/calendar-content.tsx` - główny komponent kalendarza
- `relacje.txt` - dokumentacja relacji między komponentami

### Funkcje dodane/zmodyfikowane
- `formatStartTime(startTime?: string)` - formatowanie czasu rozpoczęcia
- `getTasksForDate(date: Date)` - filtrowanie i sortowanie zadań dla daty
- `getFirstDayOfMonth(date: Date)` - obliczanie pierwszego dnia miesiąca bez niedziel

## Uwagi techniczne

1. **Kompatybilność wsteczna**: Zadania bez `startTime` nadal działają z `dueDate`
2. **Sortowanie**: Zadania sortowane według `startTime` lub `dueDate` w ramach dnia
3. **Kolory**: Używane są kolory projektów z bazy danych (`project.color`)
4. **Format czasu**: Polski format 24-godzinny (HH:MM)
5. **Responsywność**: Kalendarz zachowuje responsywność na urządzeniach mobilnych

## Potencjalne problemy do sprawdzenia

1. **Strefy czasowe**: Sprawdź czy `startTime` jest poprawnie interpretowany
2. **Wydajność**: Sprawdź czy filtrowanie zadań nie spowalnia kalendarza
3. **Długie tytuły**: Sprawdź jak zachowują się długie tytuły zadań z godziną
4. **Brak projektu**: Sprawdź czy zadania bez projektu mają domyślny kolor
5. **Migracja danych**: Sprawdź czy istniejące zadania nadal działają poprawnie
