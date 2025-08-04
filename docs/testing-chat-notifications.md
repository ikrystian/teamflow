# Testowanie Systemu Powiadomień Chatu

## Przygotowanie do testów

### 1. Uruchomienie aplikacji
```bash
npm run dev
```

### 2. Logowanie do aplikacji
- Przejdź do `http://localhost:3000`
- Zaloguj się na swoje konto
- Upewnij się, że masz dostęp do dashboard

### 3. Sprawdzenie VAPID keys
- Upewnij się, że w pliku `.env` są ustawione:
  ```env
  VAPID_PUBLIC_KEY="BC5wbM6dZONh0cTtwsu-H4TrWbqBmYzFsRXLi_-eNNzg10IwbASqc6vmNXlTGpy1xfzeO9Pq4tULAsKXdzFOjDs"
  VAPID_PRIVATE_KEY="_NNnjQseqe4GCKFtdKyV5oGgFGiNTO46trQlDIqM55o"
  VAPID_EMAIL="mailto:fasolqa@gmail.com"
  ```

## Testy Notification Bell

### Test 1: Wyświetlanie notification bell
1. **Cel**: Sprawdzenie czy notification bell pojawia się w header
2. **Kroki**:
   - Zaloguj się do aplikacji
   - Sprawdź header aplikacji
3. **Oczekiwany rezultat**: 
   - Ikona dzwonka powinna być widoczna w prawym górnym rogu header
   - Bez licznika jeśli brak nieprzeczytanych wiadomości

### Test 2: Włączanie powiadomień push przez notification bell
1. **Cel**: Sprawdzenie czy można włączyć powiadomienia push z notification bell
2. **Kroki**:
   - Kliknij w notification bell
   - Sprawdź czy pojawia się prompt o włączeniu powiadomień push
   - Kliknij "Włącz powiadomienia push"
   - Zaakceptuj uprawnienia w przeglądarce
3. **Oczekiwany rezultat**:
   - Prompt o powiadomieniach push powinien zniknąć
   - Toast z sukcesem: "Powiadomienia push zostały włączone!"

### Test 3: Włączanie powiadomień push przez ustawienia
1. **Cel**: Sprawdzenie czy można włączyć powiadomienia push w ustawieniach
2. **Kroki**:
   - Przejdź do Dashboard → Ustawienia
   - Kliknij zakładkę "Powiadomienia"
   - Włącz switch "Powiadomienia push"
   - Zaakceptuj uprawnienia w przeglądarce
3. **Oczekiwany rezultat**:
   - Switch powinien się włączyć
   - Toast z sukcesem: "Powiadomienia push zostały włączone"

## Testy Real-time Notifications

### Test 4: Powiadomienia w aktywnej karcie
1. **Cel**: Sprawdzenie czy notification bell aktualizuje się w czasie rzeczywistym
2. **Przygotowanie**: Potrzebujesz dwóch użytkowników lub dwóch przeglądarek
3. **Kroki**:
   - Użytkownik A: Zaloguj się i przejdź do Dashboard
   - Użytkownik B: Zaloguj się i przejdź do Chat
   - Użytkownik B: Wyślij wiadomość do użytkownika A
   - Użytkownik A: Sprawdź notification bell
4. **Oczekiwany rezultat**:
   - Notification bell użytkownika A powinien pokazać licznik (1)
   - Ikona powinna zmienić się na BellRing

### Test 5: Lista powiadomień
1. **Cel**: Sprawdzenie czy lista powiadomień działa poprawnie
2. **Kroki**:
   - Mając nieprzeczytane wiadomości, kliknij notification bell
   - Sprawdź listę powiadomień
   - Kliknij na powiadomienie
3. **Oczekiwany rezultat**:
   - Lista powiadomień powinna pokazać nieprzeczytane wiadomości
   - Kliknięcie powinno przenieść do odpowiedniego chatu
   - Powiadomienie powinno zniknąć z listy

### Test 6: Oznaczanie wszystkich jako przeczytane
1. **Cel**: Sprawdzenie funkcji "Oznacz wszystkie jako przeczytane"
2. **Kroki**:
   - Mając kilka nieprzeczytanych wiadomości, kliknij notification bell
   - Kliknij "Oznacz wszystkie jako przeczytane"
3. **Oczekiwany rezultat**:
   - Wszystkie powiadomienia powinny zniknąć
   - Licznik powinien zresetować się do 0
   - Ikona powinna zmienić się na zwykły Bell

## Testy Push Notifications

### Test 7: Push notifications w nieaktywnej karcie
1. **Cel**: Sprawdzenie czy push notifications działają gdy karta nie jest aktywna
2. **Przygotowanie**: 
   - Włącz powiadomienia push (Test 2 lub 3)
   - Potrzebujesz dwóch użytkowników
3. **Kroki**:
   - Użytkownik A: Zaloguj się i przejdź do innej karty/aplikacji
   - Użytkownik B: Wyślij wiadomość do użytkownika A
   - Sprawdź czy pojawia się powiadomienie push
4. **Oczekiwany rezultat**:
   - Powiadomienie push powinno pojawić się w systemie
   - Tytuł: "Nowa wiadomość od [nazwa użytkownika]"
   - Treść: Treść wiadomości (skrócona do 100 znaków)

### Test 8: Nawigacja z push notification
1. **Cel**: Sprawdzenie czy kliknięcie w push notification przenosi do chatu
2. **Kroki**:
   - Otrzymaj push notification (Test 7)
   - Kliknij "Zobacz wiadomość" w powiadomieniu
3. **Oczekiwany rezultat**:
   - Aplikacja powinna się otworzyć/aktywować
   - Użytkownik powinien zostać przeniesiony do odpowiedniego chatu
   - Wiadomość powinna być oznaczona jako przeczytana

## Testy Automatycznego Oznaczania jako Przeczytane

### Test 9: Oznaczanie przy wejściu do chatu
1. **Cel**: Sprawdzenie czy wiadomości są automatycznie oznaczane jako przeczytane
2. **Kroki**:
   - Miej nieprzeczytane wiadomości w notification bell
   - Przejdź do Chat
   - Wejdź do pokoju z nieprzeczytanymi wiadomościami
   - Sprawdź notification bell
3. **Oczekiwany rezultat**:
   - Licznik w notification bell powinien się zmniejszyć
   - Powiadomienie dla tego pokoju powinno zniknąć

### Test 10: Oznaczanie przy otrzymaniu nowej wiadomości w aktywnym pokoju
1. **Cel**: Sprawdzenie czy nowe wiadomości w aktywnym pokoju są od razu oznaczane jako przeczytane
2. **Kroki**:
   - Użytkownik A: Wejdź do konkretnego pokoju chatu
   - Użytkownik B: Wyślij wiadomość do tego pokoju
   - Użytkownik A: Sprawdź notification bell
3. **Oczekiwany rezultat**:
   - Notification bell nie powinien pokazać nowego powiadomienia
   - Wiadomość powinna być od razu oznaczona jako przeczytana

## Testy Błędów i Edge Cases

### Test 11: Brak wsparcia dla powiadomień push
1. **Cel**: Sprawdzenie zachowania gdy przeglądarka nie obsługuje push notifications
2. **Kroki**:
   - Symuluj brak wsparcia (wyłącz w dev tools)
   - Spróbuj włączyć powiadomienia push
3. **Oczekiwany rezultat**:
   - Switch powinien być disabled
   - Komunikat: "Twoja przeglądarka nie obsługuje powiadomień push"

### Test 12: Odmowa uprawnień
1. **Cel**: Sprawdzenie zachowania gdy użytkownik odmówi uprawnień
2. **Kroki**:
   - Spróbuj włączyć powiadomienia push
   - Odmów uprawnień w przeglądarce
3. **Oczekiwany rezultat**:
   - Toast z błędem: "Musisz zezwolić na powiadomienia..."
   - Switch powinien pozostać wyłączony

### Test 13: Błąd sieci
1. **Cel**: Sprawdzenie zachowania przy błędach API
2. **Kroki**:
   - Wyłącz sieć
   - Spróbuj włączyć powiadomienia push
3. **Oczekiwany rezultat**:
   - Toast z błędem: "Nie udało się skonfigurować powiadomień push"

## Debugowanie

### Sprawdzanie logów
1. **Console przeglądarki**:
   - Sprawdź logi Service Worker
   - Sprawdź błędy Socket.IO
   - Sprawdź błędy API

2. **Network tab**:
   - Sprawdź czy API calls są wysyłane
   - Sprawdź status codes odpowiedzi

3. **Application tab**:
   - Sprawdź czy Service Worker jest zarejestrowany
   - Sprawdź Push Subscriptions

### Typowe problemy
1. **Brak powiadomień push**: Sprawdź VAPID keys w .env
2. **401 Unauthorized**: Sprawdź czy użytkownik jest zalogowany
3. **Socket.IO nie działa**: Sprawdź czy server.js jest uruchomiony
4. **Service Worker nie działa**: Sprawdź czy /sw.js jest dostępny

## Wyniki testów

Po przeprowadzeniu wszystkich testów, system powiadomień chatu powinien:
- ✅ Wyświetlać notification bell w header
- ✅ Pozwalać na włączenie powiadomień push
- ✅ Pokazywać real-time powiadomienia
- ✅ Wysyłać push notifications w nieaktywnych kartach
- ✅ Automatycznie oznaczać wiadomości jako przeczytane
- ✅ Obsługiwać błędy gracefully
