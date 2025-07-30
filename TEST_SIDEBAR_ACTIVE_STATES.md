# Test Aktywnych Stanów Sidebar

## Checklist testów

### ✅ Główne menu nawigacyjne
- [ ] Panel (/dashboard) - aktywny stan gdy na stronie głównej
- [ ] Moje zadania (/dashboard/tasks) - aktywny stan na stronie zadań
- [ ] Zespoły (/dashboard/teams) - aktywny stan na stronie zespołów
- [ ] Raporty (/dashboard/reports) - aktywny stan na stronie raportów
- [ ] Kalendarz (/dashboard/calendar) - aktywny stan na stronie kalendarza
- [ ] Projekty (/dashboard/projects) - aktywny stan na stronie projektów

### ✅ Projekty w sidebar
- [ ] Aktywne projekty - zaznaczenie gdy jesteś w konkretnym projekcie
- [ ] Archiwizowane projekty - zaznaczenie gdy jesteś w zarchiwizowanym projekcie

### ✅ Style wizualne
- [ ] Aktywne pozycje mają niebieskie tło (primary)
- [ ] Aktywne pozycje mają biały tekst (primary-foreground)
- [ ] Aktywne pozycje mają pogrubioną czcionkę (font-semibold)
- [ ] Aktywne pozycje mają subtelny cień (shadow-sm)

## Instrukcje testowania

1. **Uruchom aplikację:**
   ```bash
   npm run dev
   ```

2. **Zaloguj się do aplikacji**

3. **Testuj główne menu:**
   - Kliknij na każdą pozycję w głównym menu
   - Sprawdź czy aktywna pozycja jest wyraźnie zaznaczona
   - Sprawdź czy poprzednia pozycja przestaje być aktywna

4. **Testuj projekty:**
   - Przejdź do listy projektów
   - Kliknij na konkretny projekt
   - Sprawdź czy projekt jest zaznaczony w sidebar
   - Przejdź do innego projektu i sprawdź zmianę aktywnego stanu

5. **Testuj archiwizowane projekty:**
   - Kliknij "Więcej" aby rozwinąć archiwizowane projekty
   - Kliknij na zarchiwizowany projekt
   - Sprawdź czy jest poprawnie zaznaczony

## Oczekiwane rezultaty

- Aktywne pozycje powinny być wyraźnie widoczne z niebieskim tłem
- Tylko jedna pozycja powinna być aktywna w danym momencie
- Przejścia między pozycjami powinny być płynne
- Style powinny być zgodne z designem shadcn/ui dashboard-01

## Rozwiązywanie problemów

Jeśli aktywne stany nie działają:
1. Sprawdź console przeglądarki pod kątem błędów JavaScript
2. Sprawdź czy `usePathname` zwraca poprawną ścieżkę
3. Sprawdź czy funkcje `isActive` i `isProjectActive` działają poprawnie
4. Sprawdź czy CSS classes są poprawnie aplikowane w DevTools
