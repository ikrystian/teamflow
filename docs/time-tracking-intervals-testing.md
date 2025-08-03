# Test interwałów czasowych 0.5 godziny - Śledzenie czasu pracy

## Zmiany wprowadzone

### 1. Aktualizacja interwałów czasowych
- ✅ Zmieniono z 15-minutowych na 30-minutowe interwały (0.5 godziny)
- ✅ Usunięto opcje 15 minut (0.25h) i 45 minut (0.75h)
- ✅ Dodano dodatkowe opcje 0.5-godzinne: 3.5h, 4.5h, 5.5h, 6.5h, 7.5h

### 2. Komponenty zaktualizowane
- ✅ **TimeTrackingSheet** - Główny arkusz śledzenia czasu
- ✅ **TimeTrackingDialog** - Dialog logowania czasu
- ✅ **QuickTimeEntry** - Szybkie dodawanie czasu w popoverach
- ✅ **TimePicker** - Komponent wyboru czasu (minuty: 00, 30)
- ✅ **DateTimePicker** - Komponent wyboru daty i czasu
- ✅ **TaskDetailsContent** - Szacowany czas w szczegółach zadania (już był poprawny)

### 3. Nowe opcje czasowe
```
0.5h  (30 minut)
1h    (1 godzina)
1.5h  (1.5 godziny)
2h    (2 godziny)
2.5h  (2.5 godziny)
3h    (3 godziny)
3.5h  (3.5 godziny)
4h    (4 godziny)
4.5h  (4.5 godziny)
5h    (5 godzin)
5.5h  (5.5 godziny)
6h    (6 godzin)
6.5h  (6.5 godziny)
7h    (7 godzin)
7.5h  (7.5 godziny)
8h    (8 godzin)
```

## Scenariusze testowe

### Test 1: TimeTrackingSheet (Arkusz śledzenia czasu)
1. Otwórz zadanie i kliknij "Śledzenie czasu"
2. Sprawdź dropdown "Spędzony czas"
3. Zweryfikuj że opcje zaczynają się od 30 minut (0.5h)
4. Sprawdź że nie ma opcji 15 minut i 45 minut
5. Sprawdź że są dostępne wszystkie opcje 0.5-godzinne
6. Zaloguj czas i sprawdź czy zapisuje się poprawnie

### Test 2: TimeTrackingDialog (Dialog logowania czasu)
1. Otwórz dialog śledzenia czasu z menu zadania
2. Sprawdź opcje w dropdown "Spędzony czas"
3. Wybierz różne wartości (np. 1.5h, 3.5h, 5.5h)
4. Sprawdź czy czas zapisuje się poprawnie
5. Sprawdź czy historia pokazuje poprawne wartości

### Test 3: QuickTimeEntry (Szybkie dodawanie czasu)
1. Otwórz popover zadania (w kalendarzu lub widoku tygodniowym)
2. Znajdź sekcję "Szybkie dodanie czasu"
3. Sprawdź opcje w dropdown czasu
4. Wybierz wartość (np. 2.5h) i dodaj opis
5. Zatwierdź i sprawdź powiadomienie
6. Sprawdź czy czas został dodany do zadania

### Test 4: TimePicker (Wybór czasu)
1. Otwórz formularz tworzenia/edycji zadania
2. Ustaw "Planowanie czasowe" na "Zaplanowane"
3. Kliknij w pole "Czas rozpoczęcia" lub "Czas zakończenia"
4. Sprawdź opcje minut - powinny być tylko 00 i 30
5. Wybierz różne kombinacje i sprawdź czy zapisują się poprawnie

### Test 5: Szacowany czas w szczegółach zadania
1. Otwórz szczegóły zadania
2. Kliknij w pole "Szacowany czas"
3. Sprawdź opcje w dropdown
4. Wybierz wartość i zatwierdź
5. Sprawdź czy wartość zapisuje się poprawnie

### Test 6: Kompatybilność z istniejącymi danymi
1. Sprawdź zadania z wcześniej zalogowanym czasem
2. Zweryfikuj czy stare wpisy czasu (np. 0.25h, 0.75h) wyświetlają się poprawnie
3. Sprawdź czy można dodawać nowy czas do zadań ze starymi wpisami
4. Sprawdź raporty czasowe - czy poprawnie sumują stary i nowy czas

## Struktura plików

### Zmodyfikowane pliki
- `src/components/tasks/time-tracking-sheet.tsx`
- `src/components/tasks/time-tracking-dialog.tsx`
- `src/components/tasks/quick-time-entry.tsx`
- `src/components/ui/time-picker.tsx`
- `src/components/ui/datetime-picker.tsx`
- `relacje.txt` - dokumentacja

### API endpoints (bez zmian)
- `POST /api/tasks/[taskId]/time-entries` - tworzenie wpisu czasu
- `GET /api/tasks/[taskId]/time-entries` - pobieranie wpisów czasu

## Uwagi techniczne

1. **Kompatybilność wsteczna**: Istniejące wpisy czasu z 15-minutowymi interwałami nadal działają
2. **Walidacja**: API akceptuje dowolne wartości liczbowe, więc stare dane pozostają ważne
3. **Formatowanie**: Funkcje formatujące czas obsługują wszystkie wartości dziesiętne
4. **Baza danych**: Pole `hours` w tabeli `TimeEntry` to `Float`, więc obsługuje 0.5-godzinne interwały
5. **UI/UX**: Wszystkie komponenty zachowują spójny wygląd i funkcjonalność

## Potencjalne problemy do sprawdzenia

1. **Migracja danych**: Sprawdź czy stare wpisy 0.25h i 0.75h wyświetlają się poprawnie
2. **Raporty**: Sprawdź czy raporty czasowe poprawnie sumują nowe interwały
3. **Eksport danych**: Sprawdź czy eksport do CSV/Excel obsługuje nowe wartości
4. **Wydajność**: Sprawdź czy zmiana nie wpływa na wydajność komponentów
5. **Responsywność**: Sprawdź czy dropdowny z nowymi opcjami działają na urządzeniach mobilnych

## Korzyści z implementacji

1. **Prostota**: Łatwiejsze obliczenia i planowanie czasu pracy
2. **Standardowość**: Zgodność z typowymi praktykami śledzenia czasu (0.5h interwały)
3. **Czytelność**: Mniej opcji w dropdownach, łatwiejszy wybór
4. **Precyzja**: Wystarczająca dokładność dla większości przypadków użycia
5. **Spójność**: Jednolite interwały we wszystkich komponentach czasowych
