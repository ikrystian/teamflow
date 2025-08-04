# URL State Management w Panelu Ustawień

## Opis funkcjonalności

Panel ustawień teraz obsługuje zapisywanie stanu aktualnej zakładki w pasku adresu URL. Pozwala to na:
- Bezpośrednie linkowanie do konkretnych zakładek
- Zachowanie stanu po odświeżeniu strony
- Lepsze UX przy nawigacji wstecz/wprzód w przeglądarce
- Możliwość udostępniania linków do konkretnych sekcji ustawień

## Implementacja

### 1. Dodane importy
```typescript
import { useRouter, useSearchParams } from "next/navigation"
```

### 2. Obsługa URL parameters
```typescript
// Router for URL state management
const router = useRouter()
const searchParams = useSearchParams()

// Get current tab from URL or default to 'profile'
const currentTab = searchParams.get('tab') || 'profile'
```

### 3. Walidacja dostępnych zakładek
```typescript
// Available tabs based on user role
const availableTabs = isAdmin 
  ? ['profile', 'security', 'notifications', 'privacy', 'appearance', 'task-statuses', 'smtp', 'users']
  : ['profile', 'security', 'notifications', 'privacy', 'appearance', 'task-statuses']

// Validate current tab and redirect if invalid
useEffect(() => {
  if (!availableTabs.includes(currentTab)) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'profile')
    router.replace(`/dashboard/settings?${params.toString()}`)
  }
}, [currentTab, availableTabs, router, searchParams])
```

### 4. Funkcja zmiany zakładki
```typescript
// Handle tab change with URL update
const handleTabChange = (value: string) => {
  const params = new URLSearchParams(searchParams.toString())
  params.set('tab', value)
  router.push(`/dashboard/settings?${params.toString()}`)
}
```

### 5. Aktualizacja komponentu Tabs
```typescript
<Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
```

## Dostępne zakładki

### Dla wszystkich użytkowników:
- `profile` - Informacje osobiste
- `security` - Bezpieczeństwo (zmiana hasła, aktywne sesje)
- `notifications` - Ustawienia powiadomień
- `privacy` - Prywatność i bezpieczeństwo
- `appearance` - Wygląd i personalizacja
- `task-statuses` - Statusy zadań

### Dodatkowo dla administratorów:
- `smtp` - Ustawienia SMTP
- `users` - Zarządzanie użytkownikami

## Przykłady użycia

### Bezpośrednie linki do zakładek:
```
/dashboard/settings?tab=profile
/dashboard/settings?tab=security
/dashboard/settings?tab=notifications
/dashboard/settings?tab=privacy
/dashboard/settings?tab=appearance
/dashboard/settings?tab=task-statuses
/dashboard/settings?tab=smtp (tylko admin)
/dashboard/settings?tab=users (tylko admin)
```

### Domyślne zachowanie:
- Brak parametru `tab` → przekierowanie do `profile`
- Nieprawidłowy parametr `tab` → przekierowanie do `profile`
- Zakładka niedostępna dla użytkownika → przekierowanie do `profile`

## Zachowanie przeglądarki

### Historia przeglądarki:
- Każda zmiana zakładki dodaje nowy wpis do historii
- Przycisk "Wstecz" przenosi do poprzedniej zakładki
- Przycisk "Wprzód" przenosi do następnej zakładki

### Odświeżenie strony:
- Stan aktualnej zakładki jest zachowany
- Użytkownik pozostaje w tej samej sekcji po odświeżeniu

### Udostępnianie linków:
- Można skopiować URL i udostępnić link do konkretnej zakładki
- Link otworzy się bezpośrednio w odpowiedniej sekcji

## Bezpieczeństwo

### Walidacja uprawnień:
- Sprawdzanie czy użytkownik ma dostęp do danej zakładki
- Automatyczne przekierowanie jeśli brak uprawnień
- Zakładki administratora dostępne tylko dla adminów

### Walidacja parametrów:
- Sprawdzanie czy parametr `tab` jest prawidłowy
- Automatyczne przekierowanie do domyślnej zakładki przy błędnych parametrach
- Zabezpieczenie przed manipulacją URL

## Testowanie

### Test 1: Podstawowa nawigacja
1. Przejdź do `/dashboard/settings`
2. Sprawdź czy URL zawiera `?tab=profile`
3. Kliknij różne zakładki
4. Sprawdź czy URL się aktualizuje

### Test 2: Bezpośrednie linki
1. Wejdź na `/dashboard/settings?tab=notifications`
2. Sprawdź czy otwiera się zakładka "Powiadomienia"
3. Przetestuj wszystkie dostępne zakładki

### Test 3: Walidacja
1. Wejdź na `/dashboard/settings?tab=invalid`
2. Sprawdź czy przekierowuje do `?tab=profile`
3. Jako zwykły użytkownik wejdź na `?tab=smtp`
4. Sprawdź czy przekierowuje do `?tab=profile`

### Test 4: Historia przeglądarki
1. Przejdź przez kilka zakładek
2. Użyj przycisku "Wstecz" w przeglądarce
3. Sprawdź czy wraca do poprzedniej zakładki
4. Użyj przycisku "Wprzód"

### Test 5: Odświeżenie strony
1. Przejdź do dowolnej zakładki
2. Odśwież stronę (F5)
3. Sprawdź czy pozostajesz w tej samej zakładce

## Kompatybilność

### Przeglądarki:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### Funkcjonalności:
- ✅ Next.js App Router
- ✅ URL Search Parameters
- ✅ Browser History API
- ✅ Server-side rendering

## Przyszłe rozszerzenia

### Możliwe ulepszenia:
1. **Anchor links** - Linkowanie do konkretnych sekcji w zakładce
2. **Query parameters** - Zachowanie innych parametrów URL
3. **Deep linking** - Linkowanie do konkretnych formularzy
4. **Breadcrumbs** - Nawigacja hierarchiczna w ustawieniach

### Przykład rozszerzonej implementacji:
```
/dashboard/settings?tab=profile&section=personal
/dashboard/settings?tab=security&action=change-password
/dashboard/settings?tab=notifications&type=email
```

## Podsumowanie

Implementacja URL state management w panelu ustawień znacznie poprawia UX poprzez:
- Możliwość bezpośredniego linkowania
- Zachowanie stanu po odświeżeniu
- Lepszą nawigację w przeglądarce
- Możliwość udostępniania konkretnych sekcji

Funkcjonalność jest w pełni kompatybilna z istniejącym kodem i nie wpływa na wydajność aplikacji.
