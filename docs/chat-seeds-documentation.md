# Chat Seeds Documentation

## Przegląd

Dodano nowe seedy dla funkcjonalności chatu w aplikacji TeamFlow. Seedy zawierają realistyczne dane testowe dla pokojów czatu, wiadomości i relacji użytkowników.

## Struktura Seedów Chatu

### 1. Chat Rooms (5 pokojów)

#### Ogólny Chat (`chat-general`)
- **Typ**: group
- **Członkowie**: Wszyscy użytkownicy (6 osób)
- **Opis**: Główny kanał komunikacji zespołu
- **Utworzony przez**: Admin (Krystian)

#### Nexus Project Chat (`chat-nexus-project`)
- **Typ**: project
- **Projekt**: Nexus - Project Management Platform
- **Członkowie**: Główny zespół (Admin, John, Jane, Alice)
- **Opis**: Dyskusja dotycząca projektu Nexus
- **Utworzony przez**: Admin (Krystian)

#### Mobile App Chat (`chat-mobile-app`)
- **Typ**: project
- **Projekt**: Mobile App Development
- **Członkowie**: Zespół mobilny (John, Jane, Bob)
- **Opis**: Sprint planning dla aplikacji mobilnej
- **Utworzony przez**: John (Team Lead)

#### Design Team Chat (`chat-design-team`)
- **Typ**: group
- **Członkowie**: Zespół design (Bob, Jane, Admin)
- **Opis**: Kanał dla designerów i kwestii UI/UX
- **Utworzony przez**: Bob (UI/UX Designer)

#### Direct Chat (`chat-direct-admin-john`)
- **Typ**: direct
- **Członkowie**: Admin i John
- **Opis**: Prywatna rozmowa między administratorem a team leadem
- **Utworzony przez**: Admin (Krystian)

### 2. Chat Messages (47 wiadomości)

#### Funkcjonalności w wiadomościach:
- **@mentions**: Tagowanie użytkowników w formacie `@[userId]`
- **Emoji**: Używanie emotikon w komunikacji (👋, 🚀, ✨, 🎨, etc.)
- **Linki**: Przykłady udostępniania linków (Figma, dokumentacja)
- **Różne typy konwersacji**:
  - Powitania i przedstawianie się
  - Pytania techniczne i odpowiedzi
  - Updates projektowe
  - Feedback i współpraca
  - Planowanie i organizacja

#### Przykłady wiadomości z mentions:
```
"Cześć @[adminUserId]! Dziękuję za ciepłe powitanie."
"@[userId] Dokumentacja jest w repozytorium w folderze /docs."
"Dzięki @[userId]! To będzie bardzo pomocne 🙏"
```

### 3. User Chat Room Relations

#### Członkostwo w pokojach:
- **joinedAt**: Data dołączenia do pokoju
- **lastReadAt**: Ostatni czas przeczytania wiadomości
- **Różne poziomy aktywności**: Symulacja rzeczywistego użytkowania

#### Przykładowe scenariusze:
- Użytkownicy dołączają do pokojów w różnym czasie
- Różne poziomy aktywności (niektórzy czytają częściej)
- Realistyczne timestampy dla ostatniej aktywności

## Chronologia Wiadomości

### 25 lipca 2025 - Pierwsze dni zespołu
- Powitania w kanale ogólnym
- Przedstawianie się członków zespołu
- Pierwsze ustalenia organizacyjne

### 26-28 lipca 2025 - Rozpoczęcie projektów
- Dyskusje o architekturze Nexus
- Planowanie aplikacji mobilnej
- Tworzenie design systemu

### 29 lipca - 2 sierpnia 2025 - Aktywna praca
- Updates projektowe
- Rozwiązywanie problemów technicznych
- Współpraca między zespołami
- Prywatne rozmowy o strategii

## Testowanie Funkcjonalności

### Scenariusze do przetestowania:

1. **Wyświetlanie pokojów czatu**
   - Lista wszystkich pokojów
   - Różne typy (group, project, direct)
   - Ikony projektów dla pokojów projektowych

2. **Wyświetlanie wiadomości**
   - Chronologiczne sortowanie
   - Formatowanie mentions
   - Wyświetlanie emoji
   - Avatary użytkowników

3. **Funkcjonalność mentions**
   - Parsowanie @[userId] do nazw użytkowników
   - Podświetlanie własnych mentions
   - Tooltip z informacjami o użytkowniku

4. **Status online/offline**
   - Wyświetlanie aktywnych użytkowników
   - Wskaźniki online w pokojach

5. **Responsywność**
   - Działanie na różnych urządzeniach
   - Mobile-first design

## Dane Logowania

### Konta testowe:
- **Admin**: krystian@bpcoders.pl / admin123
- **Users**: 
  - john@example.com / password123 (Team Lead)
  - jane@example.com / password123 (Frontend Developer)
  - bob@example.com / password123 (UI/UX Designer)
  - alice@example.com / password123 (Backend Developer)
  - charlie@example.com / password123 (DevOps Engineer)

## Uruchomienie

```bash
# Uruchomienie seedów
npm run db:seed

# Uruchomienie aplikacji
npm run dev
```

## Struktura Plików

- `prisma/seed.ts` - Główny plik seedów (zaktualizowany)
- `RELACJE_ELEMENTOW.txt` - Dokumentacja relacji (zaktualizowana)
- `docs/chat-seeds-documentation.md` - Ta dokumentacja

## Następne Kroki

1. Przetestowanie wszystkich funkcjonalności chatu
2. Sprawdzenie responsywności na urządzeniach mobilnych
3. Testowanie real-time komunikacji przez WebSocket
4. Weryfikacja funkcjonalności mentions i emoji
5. Testowanie różnych typów pokojów czatu
