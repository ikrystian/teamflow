# Sekcja Pomocy na Stronie Zadań

## Opis funkcjonalności

Na stronie `/dashboard/tasks` została dodana rozwijana sekcja pomocy zawierająca wskazówki dotyczące zarządzania zadaniami, najlepsze praktyki oraz powiązane treści z innych sekcji aplikacji.

## Implementacja

### 1. Dodane komponenty
- **Collapsible UI Component** - nowy komponent do tworzenia rozwijalnych sekcji
- **Sekcja pomocy** - rozwijalna karta z wskazówkami i poradami

### 2. Struktura sekcji pomocy

#### Główna karta
- **Tytuł**: "Wskazówki dotyczące zarządzania zadaniami"
- **Opis**: Zachęta do poznania najlepszych praktyk
- **Przycisk**: Rozwiń/Zwiń sekcję

#### Karty z wskazówkami (3 główne kategorie):

1. **Organizacja zadań** (zielona karta)
   - Używanie priorytetów
   - Ustawianie terminów wykonania
   - Dodawanie opisów z szczegółami
   - Wykorzystywanie podzadań

2. **Współpraca zespołowa** (fioletowa karta)
   - Przypisywanie zadań konkretnym osobom
   - Używanie komentarzy do komunikacji
   - Dodawanie załączników z dokumentacją
   - Śledzenie postępów przez statusy

3. **Śledzenie czasu** (pomarańczowa karta)
   - Logowanie czasu spędzonego nad zadaniami
   - Ustawianie szacowanego czasu wykonania
   - Używanie przypomnień o terminach
   - Analizowanie raportów czasu

#### Szybkie akcje (niebieska karta)
- **Nowe zadanie** - otwiera formularz tworzenia zadania
- **Widok kalendarza** - przełącza na zakładkę kalendarza
- **Przełącznik filtra** - zmienia między "Moje zadania" a "Wszystkie zadania"
- **Tablica Kanban** - przełącza na widok tablicy

#### Powiązane funkcje (szara karta)
- **Zarządzanie projektami** - link do `/dashboard/projects`
- **Zespoły i współpraca** - link do `/dashboard/teams`

## Kod implementacji

### Dodane importy
```typescript
import { Info, Lightbulb, TrendingUp, Target, Users, Calendar as CalendarIcon, Clock as ClockIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
```

### Stan komponentu
```typescript
const [showHelpSection, setShowHelpSection] = useState(false)
```

### Struktura JSX
```typescript
<Collapsible open={showHelpSection} onOpenChange={setShowHelpSection}>
  <CollapsibleTrigger asChild>
    <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200 bg-blue-50/50">
      {/* Główna karta z tytułem */}
    </Card>
  </CollapsibleTrigger>
  
  <CollapsibleContent className="space-y-4">
    {/* Treść pomocy */}
  </CollapsibleContent>
</Collapsible>
```

## Zależności

### Nowy pakiet
- `@radix-ui/react-collapsible` - komponent do tworzenia rozwijalnych sekcji

### Nowy komponent UI
- `src/components/ui/collapsible.tsx` - wrapper dla Radix UI Collapsible

## Funkcjonalności

### Interaktywność
- **Rozwijanie/zwijanie** - kliknięcie w główną kartę
- **Szybkie akcje** - przyciski wykonują konkretne akcje w aplikacji
- **Nawigacja** - linki prowadzą do powiązanych sekcji

### Responsywność
- **Grid layout** - automatyczne dostosowanie do szerokości ekranu
- **Kolumny**: 1 na mobile, 2 na tablet, 3-4 na desktop

### Styling
- **Kolorowe karty** - różne kolory dla różnych kategorii
- **Hover effects** - efekty przy najechaniu myszką
- **Consistent design** - spójny z resztą aplikacji

## Korzyści dla użytkowników

### Nowi użytkownicy
- **Onboarding** - wprowadzenie do funkcji aplikacji
- **Najlepsze praktyki** - wskazówki jak efektywnie używać systemu
- **Odkrywanie funkcji** - informacje o dostępnych możliwościach

### Doświadczeni użytkownicy
- **Szybkie akcje** - łatwy dostęp do często używanych funkcji
- **Przypomnienia** - odświeżenie wiedzy o funkcjach
- **Nawigacja** - szybkie przejście do powiązanych sekcji

## Pozycjonowanie

Sekcja pomocy jest umieszczona:
- **Na górze strony** - przed główną zawartością
- **Przed zakładkami** - widoczna we wszystkich widokach (Tablica, Kalendarz, Lista)
- **Opcjonalna** - można ją zwinąć jeśli nie jest potrzebna

## Przyszłe rozszerzenia

### Możliwe ulepszenia:
1. **Personalizacja** - zapamiętywanie stanu rozwinięcia dla użytkownika
2. **Więcej wskazówek** - dodanie wskazówek specyficznych dla roli użytkownika
3. **Interaktywne tutoriale** - przewodniki krok po kroku
4. **Kontekstowa pomoc** - wskazówki zależne od aktualnego stanu zadań
5. **Wideo tutoriale** - osadzone filmy instruktażowe

### Przykład rozszerzonej implementacji:
```typescript
// Personalizacja na podstawie roli
const helpContent = isAdmin ? adminHelpContent : userHelpContent

// Kontekstowe wskazówki
const contextualTips = tasks.length === 0 ? firstTimeUserTips : regularUserTips

// Zapamiętywanie preferencji
const [helpSectionExpanded, setHelpSectionExpanded] = useLocalStorage('helpSectionExpanded', false)
```

## Testowanie

### Scenariusze testowe:
1. **Rozwijanie/zwijanie** - sprawdzenie czy sekcja się otwiera i zamyka
2. **Szybkie akcje** - sprawdzenie czy przyciski wykonują właściwe akcje
3. **Nawigacja** - sprawdzenie czy linki prowadzą do właściwych stron
4. **Responsywność** - sprawdzenie na różnych rozmiarach ekranu
5. **Accessibility** - sprawdzenie dostępności dla czytników ekranu

### Kroki testowania:
1. Przejdź do `/dashboard/tasks`
2. Sprawdź czy sekcja pomocy jest widoczna na górze
3. Kliknij w kartę pomocy - powinna się rozwinąć
4. Sprawdź czy wszystkie karty są widoczne
5. Przetestuj przyciski szybkich akcji
6. Sprawdź linki do powiązanych sekcji
7. Zwiń sekcję - powinna się schować

## Podsumowanie

Sekcja pomocy na stronie zadań znacznie poprawia UX poprzez:
- **Edukację użytkowników** o dostępnych funkcjach
- **Szybki dostęp** do często używanych akcji
- **Powiązanie treści** z innych sekcji aplikacji
- **Onboarding** nowych użytkowników
- **Przypomnienia** o najlepszych praktykach

Funkcjonalność jest w pełni opcjonalna i nie wpływa na wydajność aplikacji.
