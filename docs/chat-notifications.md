# System Powiadomień Chatu

## Opis funkcjonalności

System powiadomień chatu umożliwia użytkownikom otrzymywanie powiadomień o nowych wiadomościach w czasie rzeczywistym. Składa się z notification bell w header aplikacji oraz push notifications przeglądarki gdy karta nie jest aktywna.

## Komponenty systemu

### 1. NotificationBell (komponent dzwonka)
- **Lokalizacja**: `src/components/notifications/notification-bell.tsx`
- **Odpowiedzialność**: Wyświetlanie liczby nieprzeczytanych wiadomości, lista powiadomień
- **Funkcje**:
  - Wyświetlanie licznika nieprzeczytanych wiadomości
  - Lista powiadomień w popover
  - Nawigacja do konkretnego pokoju chatu
  - Oznaczanie wiadomości jako przeczytane

### 2. useNotifications (hook)
- **Lokalizacja**: `src/hooks/useNotifications.ts`
- **Odpowiedzialność**: Zarządzanie stanem powiadomień, integracja z API i Socket.io
- **Funkcje**:
  - `fetchNotifications()` - pobieranie powiadomień z API
  - `markAsRead(chatRoomId)` - oznaczanie pokoju jako przeczytany
  - `markAllAsRead()` - oznaczanie wszystkich jako przeczytane
  - Real-time aktualizacje przez Socket.io

### 3. API Endpoints

#### `/api/notifications/chat` (GET)
- Pobieranie wszystkich powiadomień użytkownika
- Zwraca listę pokojów z nieprzeczytanymi wiadomościami
- Oblicza łączną liczbę nieprzeczytanych wiadomości

#### `/api/notifications/chat/[roomId]` (GET)
- Pobieranie powiadomienia dla konkretnego pokoju
- Używane do aktualizacji powiadomień w czasie rzeczywistym

#### `/api/notifications/chat/[roomId]/read` (POST)
- Oznaczanie pokoju jako przeczytany
- Aktualizuje pole `lastReadAt` w tabeli `UserChatRoom`

#### `/api/notifications/chat/read-all` (POST)
- Oznaczanie wszystkich pokojów jako przeczytane
- Aktualizuje `lastReadAt` dla wszystkich pokojów użytkownika

#### `/api/notifications/push` (POST)
- Wysyłanie push notifications
- Obsługuje zarówno powiadomienia o chacie jak i zadaniach
- Automatyczne usuwanie nieważnych subskrypcji

### 4. Push Notifications

#### Service Worker (`public/sw.js`)
- Obsługa powiadomień push przeglądarki
- Reaguje na kliknięcia w powiadomienia
- Nawigacja do odpowiedniej sekcji aplikacji
- Obsługa różnych typów powiadomień (chat, zadania)

#### Konfiguracja VAPID
- Zmienne środowiskowe: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Generowanie kluczy: `npx web-push generate-vapid-keys`
- Endpoint dla klucza publicznego: `/api/push/vapid-key`

### 5. Automatyczne oznaczanie jako przeczytane

#### W komponencie ChatRoom
- `markRoomAsRead()` przy wejściu do pokoju
- `markRoomAsRead()` przy otrzymaniu nowej wiadomości (jeśli nie od siebie)
- Integracja z useCallback dla optymalizacji

#### W komponencie Chat
- Obsługa URL parametru `?room=ID` dla bezpośredniej nawigacji
- Obsługa wiadomości z service worker dla nawigacji z powiadomień

### 6. Integracja z Socket.io

#### Real-time aktualizacje
- Nasłuchiwanie event'u `new-message`
- Automatyczne aktualizacje notification bell
- Sprawdzanie widoczności strony (`document.hidden`)
- Wysyłanie push notifications dla nieaktywnych kart

#### Rozszerzenie server.js
- Komentarze w obsłudze `send-message`
- Przygotowanie do przyszłych rozszerzeń

## Model bazy danych

### Tabela UserChatRoom
- `lastReadAt` - timestamp ostatniego przeczytania wiadomości
- Używane do obliczania liczby nieprzeczytanych wiadomości

### Obliczanie nieprzeczytanych wiadomości
```sql
SELECT COUNT(*) FROM Message 
WHERE chatRoomId = ? 
  AND senderId != ? 
  AND createdAt > lastReadAt
```

## Konfiguracja

### Zmienne środowiskowe
```env
# Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
```

### Generowanie kluczy VAPID
```bash
npx web-push generate-vapid-keys
```

## Użycie

### Podstawowe użycie
1. Notification bell automatycznie pojawia się w header aplikacji
2. Licznik pokazuje liczbę nieprzeczytanych wiadomości
3. Kliknięcie w dzwonek otwiera listę powiadomień
4. Kliknięcie w powiadomienie przenosi do konkretnego chatu

### Push Notifications
1. Użytkownik musi wyrazić zgodę na powiadomienia
2. Powiadomienia wysyłane automatycznie gdy karta nie jest aktywna
3. Kliknięcie w powiadomienie otwiera aplikację i przenosi do chatu

### Automatyczne oznaczanie jako przeczytane
1. Wejście do pokoju chatu automatycznie oznacza jako przeczytane
2. Otrzymanie nowej wiadomości w aktywnym pokoju oznacza jako przeczytane
3. Ręczne oznaczanie przez przycisk "Oznacz wszystkie jako przeczytane"

## Optymalizacja wydajności

### Caching
- Wykorzystanie React.useCallback dla funkcji
- Optymalizacja re-renderów komponentów
- Debouncing dla częstych aktualizacji

### Real-time updates
- Efektywne nasłuchiwanie Socket.io events
- Minimalizacja niepotrzebnych API calls
- Optimistic updates dla lepszego UX

### Memory management
- Automatyczne czyszczenie event listeners
- Proper cleanup w useEffect hooks
- Ograniczenie liczby przechowywanych powiadomień

## Bezpieczeństwo

### Autoryzacja
- Wszystkie API endpoints wymagają uwierzytelnienia
- Sprawdzanie członkostwa w pokojach chatu
- Walidacja uprawnień do oznaczania jako przeczytane

### Push Notifications
- Bezpieczne przechowywanie kluczy VAPID
- Automatyczne usuwanie nieważnych subskrypcji
- Walidacja payloadów powiadomień

## Rozwiązywanie problemów

### Brak powiadomień
1. Sprawdź czy VAPID keys są skonfigurowane
2. Sprawdź czy użytkownik wyraził zgodę na powiadomienia
3. Sprawdź czy Socket.io connection jest aktywne

### Nieprawidłowe liczniki
1. Sprawdź czy `lastReadAt` jest aktualizowane
2. Sprawdź czy Socket.io events są prawidłowo obsługiwane
3. Sprawdź czy nie ma duplikacji wiadomości

### Problemy z nawigacją
1. Sprawdź czy URL parametry są prawidłowo obsługiwane
2. Sprawdź czy service worker jest zarejestrowany
3. Sprawdź czy message handlers są prawidłowo skonfigurowane
