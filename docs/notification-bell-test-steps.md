# Test Notification Bell - Kroki do sprawdzenia

## ✅ Problemy zostały naprawione:
1. Usunięto duplikaty funkcji `formatTime` i `getChatRoomDisplayName`
2. Aplikacja kompiluje się bez błędów
3. NotificationBell jest zintegrowany z DashboardLayout

## 🧪 Kroki testowania Notification Bell:

### 1. Sprawdzenie czy notification bell jest widoczny
1. Otwórz `http://localhost:3001`
2. Zaloguj się do aplikacji
3. Przejdź do Dashboard
4. **Sprawdź**: Czy w prawym górnym rogu header jest ikona dzwonka (Bell)

### 2. Sprawdzenie czy notification bell reaguje na kliknięcie
1. Kliknij w ikonę dzwonka
2. **Sprawdź**: Czy otwiera się popover z napisem "Powiadomienia"
3. **Sprawdź**: Czy jest przycisk "Włącz powiadomienia push" (jeśli nie masz subskrypcji)

### 3. Test real-time powiadomień (potrzebujesz 2 użytkowników)

#### Przygotowanie:
- **Użytkownik A**: Zalogowany w głównej karcie
- **Użytkownik B**: Zalogowany w innej karcie/przeglądarce

#### Kroki:
1. **Użytkownik A**: Pozostań na Dashboard (nie wchodź do Chat)
2. **Użytkownik B**: Przejdź do Chat
3. **Użytkownik B**: Wyślij wiadomość do Użytkownika A
4. **Użytkownik A**: Sprawdź notification bell

#### Oczekiwany rezultat:
- Ikona dzwonka powinna zmienić się z `Bell` na `BellRing`
- Powinien pojawić się czerwony badge z liczbą (1)
- Po kliknięciu w dzwonek powinna być lista z nową wiadomością

### 4. Test oznaczania jako przeczytane
1. Mając nieprzeczytane powiadomienia, kliknij notification bell
2. Kliknij na powiadomienie w liście
3. **Sprawdź**: Czy zostałeś przeniesiony do chatu
4. **Sprawdź**: Czy powiadomienie zniknęło z listy
5. **Sprawdź**: Czy licznik się zmniejszył

### 5. Test "Oznacz wszystkie jako przeczytane"
1. Mając kilka nieprzeczytanych powiadomień
2. Kliknij notification bell
3. Kliknij "Oznacz wszystkie jako przeczytane"
4. **Sprawdź**: Czy wszystkie powiadomienia zniknęły
5. **Sprawdź**: Czy licznik zresetował się do 0

### 6. Test włączania powiadomień push
1. Kliknij notification bell
2. Jeśli widzisz prompt o push notifications, kliknij "Włącz powiadomienia push"
3. Zaakceptuj uprawnienia w przeglądarce
4. **Sprawdź**: Czy prompt zniknął
5. **Sprawdź**: Czy pojawił się toast "Powiadomienia push zostały włączone!"

## 🔍 Debugowanie jeśli coś nie działa:

### Notification bell nie jest widoczny:
1. Sprawdź console przeglądarki - czy są błędy JavaScript
2. Sprawdź czy jesteś zalogowany
3. Sprawdź czy jesteś na stronie z DashboardLayout

### Powiadomienia nie pojawiają się:
1. Sprawdź console - czy są błędy Socket.IO
2. Sprawdź Network tab - czy API calls są wysyłane
3. Sprawdź czy Socket.IO connection jest aktywne (powinno być w console: "Connected to Socket.IO server")

### Real-time updates nie działają:
1. Sprawdź czy oba użytkownicy są online (sprawdź logi serwera)
2. Sprawdź czy Socket.IO events są wysyłane (logi serwera)
3. Sprawdź czy useNotifications hook jest prawidłowo zainicjalizowany

## 📋 Logi do sprawdzenia:

### Console przeglądarki:
- Brak błędów JavaScript
- "Connected to Socket.IO server"
- Brak błędów z useNotifications

### Logi serwera (terminal):
- "User [id] registered with socket [socketId]"
- "User [id] ([name]) is now online"
- "Message received: [data]" (gdy wysyłasz wiadomość)

### Network tab:
- GET /api/notifications/chat (status 200)
- POST /api/notifications/chat/[roomId]/read (status 200)

## ✅ Jeśli wszystko działa poprawnie:

Notification bell powinien:
- ✅ Być widoczny w header
- ✅ Pokazywać licznik nieprzeczytanych wiadomości
- ✅ Aktualizować się w czasie rzeczywistym
- ✅ Pozwalać na nawigację do chatu
- ✅ Oznaczać wiadomości jako przeczytane
- ✅ Oferować włączenie push notifications

## 🚀 Następne kroki:

Po potwierdzeniu, że notification bell działa:
1. Przetestuj push notifications (gdy karta nie jest aktywna)
2. Przetestuj nawigację z push notifications
3. Przetestuj różne typy pokojów (direct, group, project)

---

**Aplikacja działa na**: `http://localhost:3001`
**Status**: Notification bell zaimplementowany i gotowy do testowania
