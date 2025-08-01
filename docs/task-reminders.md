# System Przypomnień o Zadaniach

## Opis funkcjonalności

System przypomnień umożliwia użytkownikom ustawienie powiadomień push przeglądarki, które będą wysyłane przed terminem wykonania zadania.

## Komponenty systemu

### 1. Rozszerzenie modelu Task
- `reminderEnabled` - czy przypomnienie jest włączone
- `reminderTime` - dokładny czas wysłania przypomnienia
- `reminderType` - typ jednostki ("hours" lub "days")
- `reminderValue` - liczba godzin/dni przed terminem

### 2. Service Worker (`public/sw.js`)
- Obsługuje powiadomienia push przeglądarki
- Reaguje na kliknięcia w powiadomienia
- Przekierowuje do odpowiedniego zadania

### 3. Hook `usePushNotifications`
- Zarządza subskrypcjami push
- Sprawdza wsparcie przeglądarki
- Obsługuje uprawnienia

### 4. Komponent `ReminderSettings`
- Interfejs do konfiguracji przypomnień
- Walidacja uprawnień
- Podgląd czasu przypomnienia

### 5. API Endpoints

#### `/api/push/vapid-key` (GET)
Zwraca publiczny klucz VAPID do subskrypcji push.

#### `/api/push/subscribe` (POST)
Rejestruje nową subskrypcję push użytkownika.

#### `/api/push/unsubscribe` (POST)
Usuwa subskrypcję push użytkownika.

#### `/api/push/send` (POST)
Wysyła powiadomienie push do użytkownika (do testowania).

#### `/api/reminders/check` (POST/GET)
- POST: Sprawdza i wysyła zaplanowane przypomnienia
- GET: Zwraca status przypomnień (do debugowania)

### 6. Model PushSubscription
Przechowuje subskrypcje push użytkowników w bazie danych.

## Jak używać

### Dla użytkowników:
1. Utwórz nowe zadanie lub edytuj istniejące
2. Ustaw termin wykonania zadania
3. W sekcji "Przypomnienie o zadaniu" włącz przypomnienie
4. Wybierz ile godzin/dni przed terminem chcesz otrzymać powiadomienie
5. Zezwól na powiadomienia w przeglądarce (jeśli jeszcze nie zezwoliłeś)

### Dla administratorów:
1. Skonfiguruj cron job do wywoływania `/api/reminders/check` co minutę
2. Ustaw zmienną środowiskową `CRON_SECRET` dla bezpieczeństwa
3. Opcjonalnie skonfiguruj rzeczywiste klucze VAPID w `VAPID_PUBLIC_KEY` i `VAPID_PRIVATE_KEY`

## Bezpieczeństwo

- Endpoint `/api/reminders/check` jest chroniony tokenem autoryzacji
- Subskrypcje push są powiązane z konkretnymi użytkownikami
- Powiadomienia są wysyłane tylko do właścicieli zadań

## Ograniczenia

- Powiadomienia działają tylko gdy przeglądarka obsługuje Web Push API
- Użytkownik musi zezwolić na powiadomienia
- Przypomnienie jest wysyłane tylko raz (po wysłaniu zostaje wyłączone)
- Wymaga HTTPS w produkcji

## Przyszłe ulepszenia

- Integracja z rzeczywistą biblioteką web-push
- Możliwość ustawienia wielu przypomnień dla jednego zadania
- Przypomnienia cykliczne
- Powiadomienia email jako backup
- Ustawienia globalne dla przypomnień użytkownika
