# Testowanie funkcjonalności bezpieczeństwa konta

## Przegląd funkcjonalności

W dashboard/settings dodano nową zakładkę **"Bezpieczeństwo"** z następującymi funkcjonalnościami:

### 1. Zmiana hasła
- Formularz z walidacją obecnego hasła
- Wymagania dla nowego hasła (min. 8 znaków)
- Potwierdzenie nowego hasła
- Sprawdzenie czy nowe hasło różni się od obecnego

### 2. Zarządzanie aktywnymi sesjami
- Lista wszystkich aktywnych sesji użytkownika
- Informacje o urządzeniu, przeglądarce, IP i dacie logowania
- Możliwość zakończenia pojedynczej sesji
- Możliwość zakończenia wszystkich innych sesji

## Instrukcje testowania

### Przygotowanie
1. Uruchom aplikację: `npm run dev`
2. Zaloguj się na konto użytkownika
3. Przejdź do Dashboard → Ustawienia
4. Kliknij zakładkę "Bezpieczeństwo"

### Test 1: Zmiana hasła
1. **Walidacja formularza:**
   - Spróbuj wysłać pusty formularz - powinien pokazać błędy
   - Wprowadź nieprawidłowe obecne hasło - powinien pokazać błąd
   - Wprowadź nowe hasło krótsze niż 8 znaków - powinien pokazać błąd
   - Wprowadź różne hasła w polach "Nowe hasło" i "Potwierdź" - powinien pokazać błąd

2. **Pomyślna zmiana:**
   - Wprowadź prawidłowe obecne hasło
   - Wprowadź nowe hasło (min. 8 znaków)
   - Potwierdź nowe hasło
   - Kliknij "Zmień hasło"
   - Powinien pokazać komunikat o sukcesie

3. **Weryfikacja:**
   - Wyloguj się i spróbuj zalogować starym hasłem - powinno się nie udać
   - Zaloguj się nowym hasłem - powinno się udać

### Test 2: Aktywne sesje
1. **Wyświetlanie sesji:**
   - Sprawdź czy lista sesji się ładuje
   - Sprawdź czy wyświetlane są informacje o urządzeniu i przeglądarce
   - Sprawdź czy pokazana jest data logowania i wygaśnięcia

2. **Zakończenie pojedynczej sesji:**
   - Otwórz aplikację w innej przeglądarce i zaloguj się
   - Wróć do pierwszej przeglądarki i odśwież listę sesji
   - Powinieneś zobaczyć 2 sesje
   - Kliknij "Zakończ" przy jednej z sesji
   - Potwierdź w dialogu
   - Sprawdź czy sesja zniknęła z listy

3. **Zakończenie wszystkich innych sesji:**
   - Zaloguj się na kilku różnych przeglądarkach/urządzeniach
   - W jednej z przeglądarek kliknij "Zakończ wszystkie inne sesje"
   - Potwierdź w dialogu
   - Sprawdź czy inne przeglądarki zostały wylogowane

### Test 3: Bezpieczeństwo API
1. **Autoryzacja:**
   - Spróbuj wywołać API bez logowania: `GET /api/user/sessions`
   - Powinno zwrócić błąd 401 Unauthorized

2. **Walidacja danych:**
   - Spróbuj zmienić hasło z nieprawidłowymi danymi
   - API powinno zwrócić odpowiednie błędy walidacji

## Struktura plików

### API Endpoints
- `src/app/api/user/change-password/route.ts` - Zmiana hasła
- `src/app/api/user/sessions/route.ts` - Zarządzanie sesjami

### Komponenty UI
- `src/components/settings/password-change-form.tsx` - Formularz zmiany hasła
- `src/components/settings/active-sessions.tsx` - Lista aktywnych sesji
- `src/components/settings/settings-content.tsx` - Główny komponent ustawień (zmodyfikowany)

### Baza danych
- `prisma/schema.prisma` - Dodano modele NextAuth (Session, Account, VerificationToken)
- Migracja: `prisma/migrations/20250729231126_add_nextauth_models/`

## Uwagi techniczne

1. **Sesje JWT:** Aplikacja używa strategii JWT, więc śledzenie sesji odbywa się przez dodatkowe tabele w bazie danych.

2. **Bezpieczeństwo:** Wszystkie hasła są hashowane za pomocą bcrypt z salt rounds = 12.

3. **Walidacja:** Zarówno frontend jak i backend mają walidację danych wejściowych.

4. **User Agent parsing:** Informacje o urządzeniu i przeglądarce są parsowane z User-Agent header.

5. **IP tracking:** Adresy IP są zapisywane dla celów bezpieczeństwa (wymaga konfiguracji w produkcji).

## Możliwe rozszerzenia

1. **Dwuskładnikowe uwierzytelnianie (2FA)**
2. **Historia logowań**
3. **Powiadomienia o podejrzanej aktywności**
4. **Geolokalizacja sesji**
5. **Ograniczenia czasowe dla sesji**
