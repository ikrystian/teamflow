# System ról i zarządzanie użytkownikami - Nexus

## Przegląd

Nexus implementuje system ról użytkowników z dwoma poziomami uprawnień:
- **user** - standardowy użytkownik (domyślna rola)
- **admin** - administrator z pełnymi uprawnieniami

## Konfiguracja administratora

### Domyślne konto administratora
- Email: `krystian@bpcoders.pl`
- Rola: `admin`
- Uprawnienia: pełne uprawnienia administratora

### Sprawdzanie uprawnień administratora
Uprawnienia administratora są przyznawane na podstawie:
1. Pola `role = "admin"` w bazie danych
2. Konkretnego emaila `krystian@bpcoders.pl` (fallback)

## Struktura bazy danych

### Model User (rozszerzony)
```prisma
model User {
  id            String      @id @default(cuid())
  name          String?
  email         String      @unique
  password      String
  role          String      @default("user") // "user" lub "admin"
  // ... pozostałe pola
}
```

### Migracja
- Plik: `prisma/migrations/20250729233113_add_user_role/migration.sql`
- Dodaje pole `role` z wartością domyślną `"user"`

## API Endpoints (tylko dla administratorów)

### GET /api/admin/users
Pobiera listę wszystkich użytkowników z paginacją i wyszukiwaniem.

**Parametry query:**
- `search` - wyszukiwanie po nazwie, emailu, stanowisku, firmie
- `page` - numer strony (domyślnie 1)
- `limit` - liczba wyników na stronę (domyślnie 10)

**Odpowiedź:**
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### GET /api/admin/users/[userId]
Pobiera szczegółowe informacje o konkretnym użytkowniku.

### PATCH /api/admin/users/[userId]
Aktualizuje dane użytkownika.

**Dostępne pola do edycji:**
- `name` - imię i nazwisko
- `email` - adres email
- `role` - rola użytkownika ("user" lub "admin")
- `phone` - numer telefonu
- `location` - lokalizacja
- `bio` - opis
- `jobTitle` - stanowisko
- `company` - firma
- `website` - strona internetowa
- `password` - nowe hasło (opcjonalne)

### DELETE /api/admin/users/[userId]
Usuwa konto użytkownika.

**Ograniczenia:**
- Administrator nie może usunąć własnego konta
- Usunięcie kaskadowe usuwa powiązane dane

## Interfejs użytkownika

### Zakładka "Użytkownicy" w ustawieniach
- Widoczna tylko dla administratorów
- Lokalizacja: `/settings` → zakładka "Użytkownicy"
- Komponent: `src/components/settings/user-management.tsx`

### Funkcjonalności interfejsu
1. **Lista użytkowników**
   - Wyświetlanie avatara, nazwy, emaila, roli
   - Informacje o stanowisku i firmie
   - Statystyki (liczba zadań, zespołów)
   - Data utworzenia konta

2. **Wyszukiwanie i paginacja**
   - Wyszukiwanie po nazwie, emailu, stanowisku, firmie
   - Paginacja z nawigacją stron

3. **Edycja użytkowników**
   - Modal z formularzem edycji
   - Wszystkie pola profilu użytkownika
   - Zmiana roli użytkownika
   - Resetowanie hasła

4. **Usuwanie użytkowników**
   - Potwierdzenie w AlertDialog
   - Zabezpieczenie przed usunięciem własnego konta

### Oznaczenia ról
- **Administrator**: czerwona odznaka z ikoną tarczy
- **Użytkownik**: szara odznaka z ikoną użytkownika

## Bezpieczeństwo

### Sprawdzanie uprawnień
- Wszystkie API endpoints sprawdzają uprawnienia administratora
- Middleware `getAdminSession()` zwraca sesję tylko dla administratorów
- Błąd 403 dla nieautoryzowanych żądań

### Walidacja danych
- Sprawdzanie poprawności roli ("user" lub "admin")
- Walidacja unikalności emaila przy edycji
- Hashowanie hasła przy zmianie

### Ograniczenia
- Administrator nie może usunąć własnego konta
- Administrator nie może zmienić swojej własnej roli
- Tylko administratorzy mogą zmieniać role użytkowników
- Dostęp do zarządzania użytkownikami tylko przez interfejs ustawień

### Zabezpieczenia interfejsu
- Pole roli jest wyłączone dla edycji własnego konta
- Przycisk usuwania jest wyłączony dla własnego konta
- Wyświetlane są komunikaty informacyjne o ograniczeniach

## Pliki systemu

### Backend
- `src/lib/admin.ts` - middleware sprawdzający uprawnienia
- `src/app/api/admin/users/route.ts` - API listy użytkowników
- `src/app/api/admin/users/[userId]/route.ts` - API zarządzania użytkownikiem

### Frontend
- `src/components/settings/user-management.tsx` - komponent zarządzania
- `src/components/settings/settings-content.tsx` - integracja z ustawieniami

### Konfiguracja
- `src/lib/auth.ts` - uwzględnienie roli w sesji JWT
- `src/types/next-auth.d.ts` - typy TypeScript dla NextAuth
- `prisma/schema.prisma` - model bazy danych

### Narzędzia
- `scripts/create-admin.ts` - skrypt tworzący konto administratora

## Testowanie

### Sprawdzenie uprawnień administratora
1. Zaloguj się jako `krystian@bpcoders.pl`
2. Przejdź do `/settings`
3. Sprawdź czy widoczna jest zakładka "Użytkownicy"

### Testowanie API
```bash
# Pobierz listę użytkowników (jako admin)
curl -X GET /api/admin/users

# Edytuj użytkownika
curl -X PATCH /api/admin/users/[userId] \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

## Rozszerzenia

### Dodawanie nowych ról
1. Rozszerz enum w `schema.prisma`
2. Zaktualizuj walidację w API
3. Dodaj nowe odznaki w interfejsie
4. Zaktualizuj middleware sprawdzający uprawnienia

### Dodatkowe uprawnienia
- Można dodać bardziej granularne uprawnienia
- Rozszerzyć model User o dodatkowe pola uprawnień
- Implementować system grup użytkowników
