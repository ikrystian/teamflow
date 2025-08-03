# Nexus - Team Project Management Platform

Nexus to nowoczesna aplikacja internetowa do zarządzania zadaniami i projektami dla zespołów. Inspirowana funkcjonalnością systemu Asana, ma na celu usprawnienie współpracy, centralizację komunikacji i zwiększenie produktywności.

## 🚀 Funkcjonalności

### ✅ Zaimplementowane (MVP)
- **Uwierzytelnianie użytkowników** - Rejestracja i logowanie z NextAuth.js z komunikatem o pomyślnej rejestracji
- **Zarządzanie zespołami** - Tworzenie zespołów, edycja nazw zespołów i pełne zarządzanie członkami
- **Zarządzanie projektami** - Tworzenie i edycja projektów w ramach zespołów z możliwością dodawania zdjęć i wyboru kolorów
- **Zarządzanie zadaniami** - Pełna funkcjonalność CRUD dla zadań z szacowanym czasem, edycją i usuwaniem
- **Zadania bez projektów** - Możliwość tworzenia zadań niezwiązanych z konkretnym projektem
- **Widoki zadań** - Trzy różne widoki zadań: Tablica (Kanban), Kalendarz i Lista
- **Widok tablicy Kanban w stylu Trello** - Nowoczesna tablica z uproszczonymi kartami, drag & drop i szczegółami po kliknięciu
- **Tablica zadań w Dashboard** - Widok tablicy Kanban w stylu Asana dla wszystkich zadań użytkownika z szybkim dodawaniem zadań
- **Widok listy w stylu Google Calendar** - Lista zadań z datami deadline'ów wyświetlanymi po lewej stronie, grupowanie według dat
- **Globalne statusy zadań** - Centralne zarządzanie statusami zadań dla wszystkich projektów
- **Centralne zarządzanie statusami** - Globalne statusy zadań zarządzane przez ustawienia systemowe
- **Automatyczne ustawianie statusu zadania** - Zadania dodawane z konkretnej kolumny automatycznie otrzymują odpowiedni status
- **Inteligentne dodawanie zadań** - Przycisk "Dodaj zadanie" wyświetlany tylko w kolumnie oznaczonej jako domyślna w ustawieniach
- **Time tracking** - Logowanie czasu pracy nad zadaniami, śledzenie postępu względem szacowanego czasu
- **Załączniki obrazków** - Możliwość dodawania obrazków do zadań podczas tworzenia i edycji
- **Dokumenty projektów** - Upload i zarządzanie dokumentami projektów (PDF, DOC, itp.) z kategoryzacją
- **Lista todos** - Funkcjonalność checklist w zadaniach z możliwością dodawania, edycji i usuwania elementów
- **Dashboard** - Przegląd statystyk i ostatnich aktywności
- **Widok kalendarza** - Wyświetlanie zadań według terminów wykonania
- **Kalendarz tygodniowy** - Widok kalendarza na tydzień roboczy (Pn-Pt) z zadaniami w zakładce Kalendarz w sekcji Zadania, z możliwością szybkiego dodawania zadań w każdym dniu
- **Popover szczegółów zadań** - Hover na zadaniach w kalendarzach pokazuje popover ze szczegółami zadania (tytuł, projekt, priorytet, status, opis, assignee, termin, postęp)
- **Footer w sidebarze** - Dodano footer w sidebarze z informacjami o użytkowniku (avatar, nazwa, email) i menu kontekstowym (profil, ustawienia, wylogowanie)
- **Lista projektów w stylu shadcn/ui** - Przeprojektowano listę projektów w sidebarze zgodnie z wzorcem sidebar-07 z shadcn/ui, z menu akcji dla każdego projektu
- **Zwijany sidebar** - Sidebar można zwijać do widoku tylko ikon (jak w shadcn/ui sidebar-07) z przyciskiem toggle w headerze
- **Adaptacyjna nazwa aplikacji** - Nazwa aplikacji "Nexus" dostosowuje się do zwiniętego sidebara - w pełnym widoku pokazuje nazwę i plan, w zwiniętym tylko ikonę z tooltipem
- **Nowoczesne ekrany uwierzytelniania** - Ekrany logowania i rejestracji w stylu shadcn/ui login-02 z dwukolumnowym layoutem i obrazami
- **Dark mode** - Tryb ciemny jako domyślny z możliwością przełączania (jasny/ciemny/systemowy)
- **Mono theme** - Monochromatyczny motyw z wykorzystaniem najnowszej wersji shadcn/ui
- **Responsywny interfejs** - Zbudowany z shadcn/ui i Tailwind CSS
- **Nowoczesna nawigacja** - Sidebar z aktywnym oznaczaniem stron i responsywnym designem
- **Zdjęcia projektów** - Upload własnych zdjęć lub automatyczne pobieranie losowych zdjęć z Unsplash
- **Preferencje widoku projektów** - Automatyczne zapisywanie preferencji widoku (lista/tablica) dla każdego projektu w localStorage, domyślny widok to Tablica Kanban
- **Ujednolicone komponenty tablicy** - Tablica zadań w projektach używa tego samego komponentu co w sekcji zadań dla spójności UX
- **Oznaczanie zadań jako zakończone** - Możliwość szybkiego oznaczania zadań jako zakończone z menu dropdown z wizualnym oznaczeniem zielonym kolorem
- **Kolorowe oznaczenia projektów** - Kolorowe kwadraty przed nazwami projektów w lewym menu i kolorowe obramowania kart zadań we wszystkich widokach odpowiadające kolorom wybranym podczas tworzenia
- **Edycja projektów** - Możliwość edycji nazwy, opisu, ikony, zdjęcia i koloru projektu z poziomu listy projektów (zespół nie może być zmieniany po utworzeniu) - panel edycji wyświetla się po prawej stronie tak samo jak tworzenie projektu
- **Ikony projektów** - Wybór ikon projektów z ponad 100 ikon lucide-react podzielonych na kategorie (Business, Creative, Technology, Team, Nature, itp.) - ikony wyświetlane w sidebarze z odpowiednimi kolorami
- **Bezpieczeństwo konta** - Zmiana hasła i zarządzanie aktywnymi sesjami w ustawieniach użytkownika
- **Zaktualizowany kalendarz** - Najnowsza wersja komponentu Calendar z shadcn/ui z poprawionymi stylami i lepszym układem
- **Archiwizowanie projektów** - Możliwość archiwizowania projektów z automatycznym ukrywaniem zadań z zarchiwizowanych projektów w dashboard i sekcji zadań
- **Ulepszone formatowanie dat** - Daty zadań w obecnym roku wyświetlane jako dzień i pełna polska nazwa miesiąca (np. "15 stycznia"), daty z innych lat w pełnym formacie
- **Tabelka zadań w stylu Asana** - Zaawansowana tabelka w Dashboard wyświetlająca wszystkie zadania z systemu, grupowane według statusów z możliwością inline editing wszystkich pól (nazwa, osoba przypisana, priorytet, data wykonania, status, szacowany czas), sortowaniem kolumn i filtrowaniem
- **Preferencje tabeli zadań** - Automatyczne zapisywanie wybranych kolumn w localStorage dla każdego użytkownika, domyślnie wszystkie kolumny widoczne z możliwością ukrywania niepotrzebnych
- **Edytowalne pola w popover zadań** - Szczegóły zadań w popover zawierają edytowalne pola (tytuł, opis, priorytet, status, przypisana osoba, termin, szacowany czas) z optimistic updates i powiadomieniami Sonner
- **Szybkie dodawanie czasu w popover** - Prosty komponent do raportowania czasu pracy bezpośrednio w popover zadania z predefiniowanymi wartościami i opcjonalnym opisem
- **Formularz szczegółów zadania** - Kompletny formularz edycji wszystkich szczegółów zadania w popover z przyciskiem "Edytuj", umożliwiający szybką edycję wszystkich pól w jednym miejscu
- **System komunikacji w czasie rzeczywistym** - Pełnofunkcjonalny chat z Socket.IO obsługujący wiadomości bezpośrednie, grupowe i projektowe
- **Widoczność online użytkowników** - Śledzenie statusu online/offline użytkowników w czasie rzeczywistym z wizualnymi wskaźnikami w interfejsie chat
- **Tagowanie użytkowników w chat** - Możliwość oznaczania użytkowników w wiadomościach za pomocą @username z autocomplete i kolorowymi tagami
- **Inteligentny przegląd zadań** - Dashboard automatycznie dostosowuje tytuł i zakres zadań w zależności od uprawnień użytkownika: administratorzy widzą wszystkie zadania z systemu ("Przegląd wszystkich zadań z całego systemu"), zwykli użytkownicy tylko swoje zadania ("Przegląd moich zadań")
- **Zawsze rozwinięte grupy zadań** - Usunięto możliwość zwijania grup zadań w tabeli Dashboard dla lepszej przejrzystości i dostępności wszystkich zadań
- **Numeryczny input dla szacowanego czasu** - Pole szacowanego czasu w tabeli zadań używa teraz input typu number z min="0" i step="0.1" dla lepszej walidacji i UX
- **Uproszczone menu akcji w tabeli zadań** - Usunięto opcję "Edytuj zadanie" z menu kontekstowego w tabeli Dashboard, pozostawiając tylko "Zobacz szczegóły" dla lepszej przejrzystości
- **Synchronizacja projektów** - Automatyczne odświeżanie listy projektów w sidebarze po dodaniu, edycji lub archiwizacji projektu dzięki globalnemu kontekstowi React
- **Kolumna autora zadania** - Nowa kolumna "Autor zadania" wyświetlająca użytkownika który utworzył zadanie tylko z avatarem i tooltipem (analogicznie do osoby przypisanej), umieszczona zaraz po kolumnie "Osoba przypisana"
- **Zarządzanie kolejnością kolumn** - Możliwość ustawiania kolejności kolumn przez użytkownika z drag & drop interface, zapisywanie kolejności w localStorage
- **Ulepszone aktywne stany sidebar** - Aktywne pozycje w sidebar są teraz bardziej widoczne z niebieskim tłem, białym tekstem i pogrubioną czcionką zgodnie z wzorcem shadcn/ui dashboard-01, aktywne projekty są również wyraźnie zaznaczone
- **Filtrowanie projektów archiwalnych** - Zadania z projektów archiwalnych nie są wyświetlane w tabeli zadań Dashboard
- **Blokowanie zadań** - Możliwość blokowania zadań z opisem powodu blokady przez autora zadania lub osobę przypisaną, zablokowane zadania są oznaczone czerwonym kolorem i ikoną blokady we wszystkich widokach, z automatycznym odświeżaniem widoku szczegółów po odblokowaniu
- **Ukrywanie/pokazywanie grup statusów** - Możliwość zwijania i rozwijania grup zadań według statusów w tabeli przez kliknięcie w nagłówek grupy z ikonami chevron
- **Kolumna zaraportowany czas** - Nowa kolumna w tabeli zadań pokazująca łączny czas zaraportowany dla każdego zadania na podstawie time entries
- **Hover effects na rzędach** - Efekty hover na rzędach zadań z podświetleniem klikalnych elementów dla lepszego UX
- **Inteligentne breadcrumbs** - Breadcrumbs wyświetlają nazwy projektów zamiast ID z automatycznym pobieraniem brakujących nazw i wykorzystaniem globalnego kontekstu projektów
- **Wybór projektu w edycji zadania** - Możliwość zmiany projektu zadania podczas edycji, przenoszenia zadań między projektami lub usuwania z projektu z pełną walidacją uprawnień
- **Prawy sidebar z ostatnimi zmianami** - Zwijany prawy sidebar (400px) wyświetlający ostatnie zmiany systemowe, administratorzy mogą dodawać nowe zmiany bezpośrednio z interfejsu
- **Widok dzienny projektów** - Nowy widok dzienny w projektach wyświetlający zadania z podziałem na osoby i godziny (8:00-18:00), z możliwością ustawiania czasu rozpoczęcia i zakończenia zadań
- **Zarządzanie czasem zadań** - Pola startTime i endTime w zadaniach z komponentami TimePicker i DateTimePicker zgodnymi z shadcn/ui
- **Harmonogram godzinowy** - Widok dzienny z siatką godzinową pokazującą zadania przypisane do konkretnych osób w określonych przedziałach czasowych
- **Drag and Drop w kalendarzu** - Możliwość przeciągania zadań między slotami czasowymi i osobami, automatyczna aktualizacja czasu rozpoczęcia/zakończenia i przypisania
- **Inteligentne układanie zadań** - Automatyczne wykrywanie kolizji czasowych i układanie nakładających się zadań w kolumnach z proporcjonalną szerokością
- **Optimistic Updates** - Natychmiastowe aktualizacje UI podczas drag and drop z rollback przy błędach, wizualny feedback dla zadań w trakcie aktualizacji
- **Powiadomienia Sonner** - Inteligentne powiadomienia toast z loading/success/error states dla operacji drag and drop
- **Przypomnienia Push** - System powiadomień push przeglądarki z możliwością ustawienia przypomnienia na wybrane godziny/dni przed terminem zadania
- **Publiczne udostępnianie projektów** - Możliwość generowania specjalnych linków do udostępnienia tablicy zadań osobom bez konta w systemie, widok tylko do odczytu z tablicą Kanban i kalendarzem

### 🔄 Planowane funkcjonalności
- Zaproszenia do zespołów przez email
- ✅ ~~Powiadomienia push o zadaniach~~ - **ZAIMPLEMENTOWANE**
- ✅ ~~Załączniki plików (dokumenty, PDF, itp.)~~ - **ZAIMPLEMENTOWANE**
- ✅ ~~Aktywne oznaczanie stron w nawigacji~~ - **ZAIMPLEMENTOWANE**
- ✅ ~~System ról i zarządzanie użytkownikami~~ - **ZAIMPLEMENTOWANE**
- ✅ ~~Prawy sidebar z ostatnimi zmianami~~ - **ZAIMPLEMENTOWANE**
- ✅ ~~Publiczne udostępnianie projektów~~ - **ZAIMPLEMENTOWANE**
- Zaawansowane raporty i analityka
- Wyszukiwarka globalna
- Szablony projektów z predefiniowanymi statusami

## 🛠 Technologie

- **Framework**: Next.js 15 (React) z App Router
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **Motywy**: next-themes (dark mode jako domyślny)
- **ORM**: Prisma
- **Baza danych**: SQLite (łatwa migracja na PostgreSQL)
- **Uwierzytelnianie**: NextAuth.js
- **Ikony**: Lucide React
- **TypeScript**: Pełne wsparcie typów

## 📦 Instalacja i uruchomienie

### Wymagania
- Node.js 18+
- npm/yarn/pnpm

### Kroki instalacji

1. **Sklonuj repozytorium**
```bash
git clone <repository-url>
cd Nexus
```

2. **Zainstaluj zależności**
```bash
npm install
```

3. **Skonfiguruj zmienne środowiskowe**
```bash
cp .env.example .env
```

Wypełnij plik `.env` odpowiednimi wartościami:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
UNSPLASH_ACCESS_KEY="your-unsplash-key" # Opcjonalne
```

4. **Przygotuj bazę danych**
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

5. **Uruchom aplikację**
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`

## 🗄️ Struktura bazy danych

### Główne modele:
- **User** - Użytkownicy systemu
- **Team** - Zespoły projektowe
- **Project** - Projekty w ramach zespołów
- **Task** - Zadania przypisane do projektów (z polami startTime i endTime)
- **TaskStatus** - Statusy zadań (globalne)
- **TimeEntry** - Wpisy czasu pracy
- **Document** - Dokumenty projektów
- **TaskImage** - Załączniki obrazków do zadań

### Relacje:
- Użytkownik może należeć do wielu zespołów
- Zespół może mieć wiele projektów
- Projekt może mieć wiele zadań
- Zadanie może mieć wiele wpisów czasu i załączników

## 🎨 Design System

Aplikacja wykorzystuje **shadcn/ui** jako podstawowy system designu z następującymi komponentami:
- Sidebar z nawigacją (wzorzec sidebar-07)
- Formularze z walidacją
- Tabele z sortowaniem i filtrowaniem
- Modale i dialogi
- Karty i layouty
- Breadcrumbs i nawigacja

## 🔧 Konfiguracja

### Zmienne środowiskowe:
- `DATABASE_URL` - URL do bazy danych
- `NEXTAUTH_URL` - URL aplikacji
- `NEXTAUTH_SECRET` - Klucz szyfrowania sesji
- `UNSPLASH_ACCESS_KEY` - Klucz API Unsplash (opcjonalne)

### Seeding bazy danych:
```bash
# Dodanie danych testowych (zachowuje istniejące dane, używa upsert)
npm run db:seed

# Pełny reset bazy danych (może nie działać ze wszystkimi konfiguracjami PostgreSQL)
npm run db:reset
```

> **Uwaga:** Skrypt `db:seed` używa operacji `upsert`, więc można go bezpiecznie uruchamiać wielokrotnie. Istniejące dane zostaną zachowane lub zaktualizowane.

Tworzy kompleksowe dane testowe:
- **6 użytkowników** z różnymi rolami i pełnymi profilami
- **3 zespoły specjalistyczne** (Development, Design, DevOps)
- **4 różnorodne projekty** z pełną konfiguracją
- **15 zadań** we wszystkich możliwych statusach
- **6 statusów zadań** z kolorami (To Do, In Progress, In Review, Testing, Done, Blocked)
- **28 subtasków** z szczegółowym podziałem pracy
- **25 wpisów czasu** z realistycznymi godzinami pracy
- **8 komentarzy** pokazujących współpracę zespołową
- **6 dokumentów projektowych** różnych typów
- **6 wpisów changelog** z komunikatami systemowymi
- **8 todos** z listami kontrolnymi
- **5 pokojów czatu** (ogólny, projektowe, zespołowy, prywatny)
- **47 wiadomości czatu** z mentions, emoji i realistycznymi konwersacjami
- **Członkostwo w pokojach** z różnymi poziomami aktywności

**Konta testowe:**
- Administrator: `krystian@bpcoders.pl` / `admin123`
- Użytkownicy: `john@example.com`, `jane@example.com`, `bob@example.com`, `alice@example.com`, `charlie@example.com` / `password123`

## 📱 Responsywność

Aplikacja jest w pełni responsywna i działa na:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🚀 Deployment

### Vercel (Zalecane):
1. Połącz repozytorium z Vercel
2. Skonfiguruj zmienne środowiskowe
3. Deploy automatycznie

### Docker:
```bash
docker build -t nexus .
docker run -p 3000:3000 nexus
```

## 🤝 Wkład w projekt

1. Fork repozytorium
2. Utwórz branch dla nowej funkcjonalności
3. Wprowadź zmiany
4. Dodaj testy (jeśli dotyczy)
5. Utwórz Pull Request

## 📄 Licencja

MIT License - szczegóły w pliku LICENSE

## 🆘 Wsparcie

W przypadku problemów:
1. Sprawdź dokumentację
2. Przeszukaj istniejące Issues
3. Utwórz nowe Issue z opisem problemu

---

**Nexus** - Zarządzanie projektami zespołowymi w nowoczesny sposób! 🚀
