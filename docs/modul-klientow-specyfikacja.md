System do zarządzania klientami i dostępami — opis projektu (Next.js)
Oct 28, 2026 · @Krystian
1. Podsumowanie
Projekt to aplikacja webowa w Next.js, w której freelancer lub agencja digital prowadzi bazę klientów, a przy każdym kliencie zaszyfrowany sejf dostępów. W jednym miejscu są panele CMS, hosting, FTP/SFTP, serwery, domeny, bazy danych, poczta, social media, konta reklamowe i klucze API. Nazwa robocza: Dostępnik.
Problem. Dostępy klientów leżą dziś w mailach, arkuszach, notatkach i komunikatorach. Nikt nie wie, kto zna które hasło. Zmiana pracownika albo koniec współpracy z klientem oznacza chaos i ryzyko wycieku.
Rozwiązanie opiera się na trzech filarach:
• Bezpieczeństwo — hasła są szyfrowane w przeglądarce (end-to-end), a serwer przechowuje wyłącznie zaszyfrowane dane. Obowiązkowe 2FA i dziennik każdego wyświetlenia oraz skopiowania hasła.
• Przejrzystość — każdy dostęp ma typ z dopasowanymi polami, a dostępy są pogrupowane według klienta i kategorii. Login, hasło i kod 2FA kopiuje się jednym kliknięciem, bez otwierania szczegółów.
• Praca zespołowa — role, uprawnienia na poziomie klienta, bezpieczne udostępnianie i kontrolowane odejście pracownika.
2. Założenia i cele
W ciągu miesiąca od wdrożenia aplikacja ma zastąpić rozproszone notatki z hasłami i skrócić znalezienie dowolnego dostępu do kilku sekund.
Założenia:
• Model wielodostępny (multi-tenant): ta sama aplikacja obsługuje agencję z zespołem i freelancera, który jest jedynym członkiem swojej przestrzeni. Może działać jako SaaS albo jako instancja jednej firmy.
• Interfejs po polsku, przygotowany na kolejne języki.
• Praca głównie na komputerze, z pełną obsługą telefonu do szybkiego skopiowania hasła w terenie.
• Hasła to najcenniejsze dane w systemie. Gdy wygoda koliduje z bezpieczeństwem, wygrywa bezpieczeństwo.
Cel
Miara sukcesu
Wszystkie dostępy klienta w jednym miejscu
100% dostępów aktywnych klientów w systemie w ciągu miesiąca od wdrożenia
Szybki dostęp do hasła
znalezienie i skopiowanie hasła w mniej niż 10 s
Brak jawnych haseł poza przeglądarką użytkownika
0 jawnych haseł w bazie, logach i kopiach zapasowych (test automatyczny)
Pełna rozliczalność
każde wyświetlenie, skopiowanie i zmiana dostępu zapisane w dzienniku
Lepsza higiena haseł
liczba słabych i powtórzonych haseł spada z miesiąca na miesiąc
3. Użytkownicy i role
Domyślnie członek zespołu nie widzi żadnego klienta, dopóki nie zostanie do niego przypisany. To zasada najmniejszych uprawnień, która ogranicza skutki przejęcia pojedynczego konta.
• Freelancer — np. web developer z 20–50 klientami; pracuje sam i potrzebuje porządku oraz szybkości.
• Właściciel lub administrator agencji — zarządza zespołem i uprawnieniami, pilnuje bezpieczeństwa.
• Opiekun klienta (account, project manager) — zakłada klientów i zbiera od nich dostępy.
• Specjalista (developer, SEO, social media, kampanie) — korzysta z dostępów przypisanych mu klientów.
• Klient agencji (bez konta) — przekazuje dostępy przez bezpieczny formularz.
Uprawnienie
Właściciel
Administrator
Członek
Tylko odczyt
Ustawienia i płatności przestrzeni
tak
nie
nie
nie
Zapraszanie osób, nadawanie ról
tak
tak
nie
nie
Dodawanie i edycja klientów
tak
tak
tak
nie
Wgląd w dostępy
wszyscy klienci
wszyscy klienci
przypisani klienci
przypisani klienci
Dodawanie i edycja dostępów
tak
tak
u przypisanych klientów
nie
Wpisy oznaczone jako krytyczne
tak
tak
po indywidualnym nadaniu
nie
Link jednorazowy na zewnątrz
tak
tak
jeśli włączone w ustawieniach
nie
Dziennik zdarzeń
cała przestrzeń
cała przestrzeń
własne działania
nie
Eksport danych
tak
po nadaniu przez właściciela
nie
nie
4. Zakres funkcjonalny
Sercem aplikacji jest sejf dostępów przypisany do każdego klienta (4.4); pozostałe moduły porządkują wokół niego pracę zespołu.
4.1 Konto, logowanie i sejf
• Logowanie e-mailem i hasłem konta albo passkeyem; dla zespołów opcjonalnie konto Google lub Microsoft.
• Obowiązkowe 2FA: aplikacja TOTP lub passkey, plus kody zapasowe.
• Odblokowanie sejfu to osobny krok. Logowanie potwierdza tożsamość, a hasło główne sejfu odszyfrowuje dane w przeglądarce i nigdy nie trafia na serwer (rozdział 6).
• Automatyczna blokada sejfu po bezczynności (domyślnie 15 min) i po zamknięciu karty.
• Lista aktywnych sesji i urządzeń, zdalne wylogowanie, e-mail o logowaniu z nowego urządzenia.
• Zestaw ratunkowy przy rejestracji: klucz odzyskiwania do wydrukowania. Bez niego utrata hasła głównego oznacza utratę danych — to cecha szyfrowania end-to-end, nie błąd.
4.2 Przestrzeń robocza i zespół
• Jedno konto może należeć do kilku przestrzeni, np. własnej działalności i agencji, dla której pracuje się jako podwykonawca.
• Zaproszenia e-mail, role (rozdział 3) i przypisywanie osób do klientów.
• Offboarding: przy usunięciu osoby system pokazuje dostępy, które wyświetlała lub kopiowała, i tworzy zadania „zmień hasło” przypisane do konkretnych osób.
4.3 Klienci (CRM)
Karta klienta zbiera wszystko, czego zespół potrzebuje poza hasłami:
• Dane firmy: nazwa, NIP, adres, strona www, branża, logo; opcjonalnie autouzupełnianie po NIP z publicznego rejestru (np. wykazu podatników VAT).
• Status: potencjalny, aktywny, wstrzymany, zakończony (archiwum).
• Osoby kontaktowe: imię i nazwisko, rola, e-mail, telefon, preferowana forma kontaktu.
• Usługi: strona, SEO, social media, kampanie, hosting i opieka — jako tagi do filtrowania.
• Opiekun po stronie agencji i przypisany zespół.
• Domeny i hosting: domeny z datami wygaśnięcia, hosting, certyfikaty SSL — źródło przypomnień.
• Notatki ogólne: nieobjęte szyfrowaniem end-to-end i wyraźnie odróżnione w interfejsie od bezpiecznych notatek w sejfie.
• Oś czasu: kto i kiedy coś zmienił.
Lista klientów ma widok tabeli i kart, wyszukiwarkę, filtry (status, usługa, opiekun, tag) i przypinanie ulubionych. W wierszu klienta widać od razu liczbę dostępów i ostrzeżenia, np. „3 słabe hasła” albo „domena wygasa za 14 dni”.
4.4 Sejf dostępów — moduł kluczowy
Każdy wpis ma pola wspólne i pola zależne od typu, dzięki czemu dostęp FTP wygląda jak FTP, a konto na Facebooku jak konto na Facebooku.
Pola wspólne: nazwa (np. „WordPress — panel admina”), typ, klient, adres URL, login, hasło, sekret 2FA (opcjonalnie), notatka, tagi, środowisko (produkcja, staging, dev), właściciel konta (klient czy agencja), poziom wrażliwości (standardowy lub krytyczny), data zmiany hasła i historia wersji.
Typ dostępu
Pola specyficzne
Przykłady
Strona WWW / CMS
adres panelu logowania, rola konta, rodzaj CMS
WordPress, WooCommerce, PrestaShop, Shopify
Hosting / panel serwera
adres panelu, ID klienta u dostawcy, PIN do pomocy technicznej, pakiet, data odnowienia
cPanel, DirectAdmin, Plesk
FTP / SFTP / FTPS
protokół, host, port (podpowiadany: 21, 22, 990), hasło lub klucz, katalog startowy
FileZilla, WinSCP
SSH / serwer
host, port, użytkownik, klucz prywatny i jego hasło, odcisk klucza serwera
VPS, serwer dedykowany
Baza danych
silnik, host, port, nazwa bazy, użytkownik, adres phpMyAdmin lub Adminera
MySQL, MariaDB, PostgreSQL
Domena / DNS
rejestrator, kod AuthInfo, data wygaśnięcia, serwery DNS, abonent
domeny .pl, .com, .eu
Poczta e-mail
adres, serwery IMAP / POP3 / SMTP z portami i szyfrowaniem, adres webmaila
skrzynki firmowe, Google Workspace, Microsoft 365
Social media
platforma, e-mail i telefon do odzyskiwania, kody zapasowe, rola agencji, ID strony lub konta firmowego
Facebook, Instagram, LinkedIn, TikTok, YouTube, X
Reklama i analityka
platforma, ID konta, sposób dostępu (uprawnienia dla konta agencji czy login klienta), poziom uprawnień
Google Ads, Analytics, Search Console, Tag Manager, Meta Ads
Klucz API / token
usługa, klucz, sekret, środowisko, zakres uprawnień, data wygaśnięcia
bramki płatności, newslettery, API przewoźników
Bezpieczna notatka
szyfrowana treść
dane do odzyskiwania kont, informacje poufne
Inny
pola własne: tekst, ukryte, adres, data
nietypowe systemy klienta
Funkcje sejfu:
• Szybkie akcje bez otwierania wpisu: kopiuj login, kopiuj hasło, pokaż hasło, otwórz adres, kopiuj kod 2FA z licznikiem ważności.
• Schowek czyszczony po 30 s (konfigurowalne). Przeglądarka pozwala na to tylko przy aktywnej karcie, więc to zabezpieczenie „w miarę możliwości”.
• Odsłonięcie wpisu krytycznego wymaga ponownego potwierdzenia (hasło główne lub passkey) i trafia do dziennika.
• Generator haseł (długość, rodzaje znaków, frazy hasłowe) i miernik siły na żywo.
• Sprawdzanie wycieków w bazie Pwned Passwords metodą k-anonimowości: do usługi trafia tylko 5 pierwszych znaków skrótu SHA-1, nigdy hasło.
• Historia wersji wpisu z możliwością przywrócenia.
• Szyfrowane załączniki: klucze SSH, pliki konfiguracyjne.
• Import z CSV (Bitwarden, 1Password, KeePass, przeglądarki) z mapowaniem kolumn i przypisaniem do klientów. Plik jest przetwarzany i szyfrowany w przeglądarce.
• Operacje zbiorcze: przenieś do klienta, dodaj tag, oznacz „do zmiany”.
Dobre praktyki wbudowane w produkt:
• Przy kontach Google i Meta system podpowiada, by zamiast hasła klienta zapisać, które konto agencji ma nadane uprawnienia (dostęp partnerski).
• Pole „właściciel konta” wychwytuje np. domenę zarejestrowaną na agencję zamiast na klienta.
• Sekret 2FA zapisany obok hasła to wygoda kosztem rozdzielenia czynników. Przy kontach krytycznych interfejs zaleca klucz sprzętowy lub dostęp partnerski.
4.5 Kondycja haseł
• Wskaźnik kondycji dla każdego klienta i całej przestrzeni.
• Listy do naprawy: hasła słabe, powtórzone, starsze niż 180 dni, znalezione w wyciekach; konta bez 2FA; wpisy bez adresu lub właściciela.
• Analiza działa w przeglądarce po odblokowaniu sejfu. Serwer zna tylko metadane (ocenę siły 0–4 i datę zmiany hasła), nigdy hasło ani jego skrót.
4.6 Udostępnianie
• W zespole: przypisanie osoby do klienta daje jej dostęp do całego sejfu klienta; można też udostępnić pojedynczy wpis.
• Na zewnątrz: link jednorazowy do wybranego wpisu. Klucz jest w części adresu po znaku #, więc serwer go nie zna. Ważność od 1 godziny do 7 dni, domyślnie jedno wyświetlenie, opcjonalne dodatkowe hasło, możliwość unieważnienia.
• Prośba o dostępy od klienta: opiekun wysyła link do formularza z listą potrzebnych dostępów (np. hosting, WordPress, Facebook). Dane szyfrują się w przeglądarce klienta i trafiają do skrzynki „Do przejrzenia”, skąd po akceptacji przechodzą do sejfu. Koniec z hasłami w mailach.
• Pakiet przekazania przy końcu współpracy: wszystkie dostępy klienta w jednym bezpiecznym linku i lista kont, których własność trzeba przenieść.
4.7 Dziennik zdarzeń
• Rejestruje logowania (udane i nieudane), odblokowania sejfu, wyświetlenia i skopiowania haseł oraz kodów 2FA, zmiany wpisów i klientów, zmiany uprawnień, udostępnienia, importy i eksporty.
• Każde zdarzenie: kto, co, kiedy, na jakim obiekcie, adres IP, urządzenie.
• Tylko dopisywanie, bez edycji i usuwania; retencja domyślnie 12 miesięcy; filtry i eksport CSV.
• Alerty dla właściciela: nietypowa aktywność, np. masowe kopiowanie haseł albo logowanie z nowego kraju.
• Ograniczenie: wyświetlenie i skopiowanie zgłasza przeglądarka. Dziennik daje rozliczalność, ale nie zatrzyma osoby, która już ma dostęp.
4.8 Przypomnienia i powiadomienia
• Wygasające domeny, hosting, certyfikaty SSL i klucze API.
• Hasła do zmiany: stare, z wycieku, po odejściu pracownika.
• Wypełnione przez klienta prośby o dostęp, nowe udostępnienia, zaproszenia.
• Kanały: w aplikacji i e-mail, później Slack lub Teams. Treść powiadomień nigdy nie zawiera sekretów.
4.9 Wyszukiwanie i nawigacja
• Globalna paleta poleceń (Ctrl/Cmd + K): klienci, dostępy i akcje typu „Dodaj dostęp FTP dla…”.
• Wyszukiwanie po nazwie, kliencie, adresie, loginie i tagach. Te pola są szyfrowane, więc indeks powstaje w pamięci przeglądarki po odblokowaniu sejfu.
• Skróty klawiaturowe dla najczęstszych akcji: kopiuj login, kopiuj hasło, otwórz adres.
5. Przejrzysta prezentacja dostępów
Każde hasło jest trzy kliknięcia od pulpitu: klient, zakładka „Dostępy”, przycisk „Kopiuj” — bez otwierania szczegółów i bez odsłaniania hasła na ekranie.
5.1 Zasady
• Jeden klient to jeden sejf, a w nim stałe kategorie: WWW, Hosting i serwer, Domeny, Poczta, Social media, Reklama i analityka, API, Notatki.
• Każda kategoria ma stałą ikonę i kolor w całej aplikacji, więc typ dostępu rozpoznaje się przed przeczytaniem nazwy. Kolor nigdy nie jest jedynym nośnikiem informacji — zawsze towarzyszy mu ikona i tekst.
• Login zawsze widoczny, hasło zawsze zamaskowane; odsłonięte ukrywa się samo po 30 s.
• Najczęstsze akcje są w wierszu listy, jednym kliknięciem.
• Statusy jako małe odznaki: „słabe”, „powtórzone”, „ponad 180 dni”, „wyciek”, „2FA”, „krytyczny”.
• Dwa widoki: kompaktowa tabela i karty. Pusta kategoria podpowiada akcję, np. „Dodaj pierwszy dostęp FTP”.
• Jasny i ciemny motyw, pełna obsługa klawiatury, zgodność z WCAG 2.2 AA.
5.2 Ekran klienta — zakładka „Dostępy”
Login widać od razu, hasło zostaje zamaskowane, a kolor kategorii i odznaka mówią, czego dotyczy wpis i czy wymaga uwagi.
5.3 Wiersz dostępu
Element
Zachowanie
Ikona
ikona typu; favicon serwisu opcjonalnie, z możliwością wyłączenia ze względów prywatności
Nazwa
kliknięcie otwiera panel szczegółów
Login
widoczny; kliknięcie kopiuje
Hasło
maskowane; „Pokaż” odsłania na 30 s, „Kopiuj” kopiuje bez odsłaniania
Adres lub host
skrócony; „Otwórz” otwiera stronę logowania w nowej karcie
Kod 2FA
bieżący kod z licznikiem ważności, kopiowany kliknięciem
Odznaki
kondycja hasła, środowisko, wpis krytyczny
Ostatnia zmiana
np. „hasło zmienione 3 mies. temu przez Annę K.”
Menu „więcej”
edytuj, historia, udostępnij, przenieś, usuń
5.4 Panel szczegółów wpisu
Panel wysuwa się z prawej strony i ma sekcje: Logowanie, Połączenie, 2FA, Notatki, Pola własne, Informacje i Historia. Dla FTP, SSH i baz danych sekcja Połączenie pokazuje gotowy ciąg do skopiowania, np. sftp://użytkownik@host:22.
5.5 Dodawanie dostępu
1. Wybór typu z siatki kafelków z ikonami.
2. Formularz z polami właściwymi dla typu; wartości domyślne, np. port, uzupełniają się same.
3. Wklejony adres podpowiada typ i nazwę, np. adres z „/wp-admin” to WordPress.
4. Generator i miernik siły są wbudowane w pole hasła.
5. Szkic formularza istnieje tylko w pamięci; niezaszyfrowane dane nigdy nie trafiają do localStorage.
5.6 Pulpit po zalogowaniu
Pulpit pokazuje ostatnio używane dostępy, przypiętych klientów, alerty (wygasające domeny, słabe hasła, wypełnione prośby o dostęp) i pole szybkiego wyszukiwania.
5.7 Mapa ekranów
Adres
Ekran
/login, /register
logowanie i rejestracja z konfiguracją 2FA i zestawem ratunkowym
/unlock
odblokowanie sejfu
/dashboard
pulpit
/clients
lista klientów
/clients/[clientId]
karta klienta z zakładkami: przegląd, dostępy, kontakty, domeny i hosting, notatki, historia
/vault
wszystkie dostępy ze wszystkich klientów, z filtrami
/security
kondycja haseł
/activity
dziennik zdarzeń
/settings
profil, bezpieczeństwo, zespół, przestrzeń, import i eksport
/share/[id]
publiczna strona linku jednorazowego
/request/[token]
formularz przekazania dostępów dla klienta
6. Architektura bezpieczeństwa
Rekomendacja: szyfrowanie end-to-end od pierwszej wersji. Serwer przechowuje i przesyła wyłącznie szyfrogramy, a hasła odszyfrowuje tylko przeglądarka uprawnionej osoby.
6.1 Kluczowa decyzja: gdzie szyfrować
Kryterium
Szyfrowanie po stronie serwera (KMS)
Szyfrowanie end-to-end (rekomendowane)
Kto może odczytać hasła
aplikacja na serwerze
tylko przeglądarki uprawnionych osób
Skutek wycieku bazy i serwera
hasła do odczytania, jeśli atakujący zdobędzie też dostęp do KMS
same szyfrogramy, bezużyteczne bez haseł głównych
Złożoność
niższa
wyższa: klucze, odzyskiwanie dostępu, wyszukiwanie w przeglądarce
Zapomniane hasło
zwykły reset
klucz odzyskiwania albo odzyskanie przez administratora zespołu
Późniejsza migracja z szyfrowania serwerowego na end-to-end jest kosztowna, bo wymaga ponownego zaszyfrowania wszystkich danych w przeglądarkach użytkowników. Dlatego decyzję trzeba podjąć przed pierwszą linijką kodu.
6.2 Co jest szyfrowane i jak
Dane
Ochrona
Hasła, sekrety 2FA, klucze prywatne, klucze API, kody zapasowe, bezpieczne notatki, ukryte pola własne, załączniki
end-to-end — szyfrowane w przeglądarce
Nazwa wpisu, login, adres URL, notatka wpisu
end-to-end — wyszukiwanie działa lokalnie
Typ i poziom wrażliwości wpisu, powiązanie z klientem, daty (utworzenia, zmiany hasła, wygaśnięcia), ocena siły hasła
jawne dla serwera (raporty, przypomnienia); baza szyfrowana w spoczynku
Dane CRM: klienci, kontakty, domeny, notatki ogólne
baza szyfrowana w spoczynku, TLS; dostępne dla serwera (wyszukiwanie, przypomnienia)
Dziennik zdarzeń
jawny dla serwera, nigdy nie zawiera sekretów
6.3 Hierarchia kluczy
Serwer przechowuje tylko zaszyfrowane kopie kluczy i danych; każdy krok odszyfrowania dzieje się w przeglądarce po podaniu hasła głównego.
• Parametry: Argon2id z unikalną solą, dobrany tak, by wyprowadzenie klucza trwało ok. 0,5–1 s na typowym laptopie.
• Integralność: identyfikatory wpisu i sejfu są danymi uwierzytelnianymi szyfrogramu, więc nie da się podmienić szyfrogramów między rekordami. Każdy szyfrogram ma numer wersji formatu, co pozwoli kiedyś zmienić algorytm.
• Nadanie dostępu: osoba uprawniona szyfruje klucz sejfu kluczem publicznym nowej osoby — w swojej przeglądarce, bez udziału serwera.
• Odebranie dostępu: usunięcie kopii klucza sejfu. Przy odejściu pracownika także rotacja klucza sejfu i zmiana haseł, które ta osoba widziała.
• Odzyskiwanie: bez hasła głównego użytkownik używa klucza odzyskiwania. W zespole administrator może po resecie ponownie nadać mu klucze sejfów. Bez klucza i bez zespołu danych nie da się odzyskać — rejestracja musi to jasno mówić.
• Biblioteki: libsodium (wersja „sumo” z Argon2id) i Web Crypto API. Żadnych własnych algorytmów; moduł kryptograficzny ma testy na wektorach testowych i przegląd specjalisty.
6.4 Uwierzytelnianie i sesje
• Logowaniem, sesjami, 2FA, passkeys i organizacjami zajmuje się Better Auth (rozdział 8). Hasło główne sejfu nie przechodzi ani przez tę bibliotekę, ani przez serwer.
• Ciasteczka sesji httpOnly, Secure i SameSite; krótki czas życia z odświeżaniem; unieważnienie wszystkich sesji przy zmianie hasła konta.
• Ponowne potwierdzenie tożsamości przed operacjami wrażliwymi: eksport, zmiana ról, usunięcie klienta, odsłonięcie wpisu krytycznego.
• Limit prób logowania na konto i adres IP, blokada czasowa, CAPTCHA po kilku nieudanych próbach.
• Odszyfrowane klucze żyją wyłącznie w pamięci karty — nigdy w localStorage ani IndexedDB w postaci jawnej — i znikają przy blokadzie sejfu.
• W kolejnej fazie: odblokowanie sejfu passkeyem przez rozszerzenie WebAuthn PRF, tam gdzie przeglądarka i menedżer passkeys je obsługują.
6.5 Bezpieczeństwo aplikacji Next.js
• Autoryzacja w warstwie danych. Każda Server Action i każdy Route Handler sprawdza sesję, przynależność do przestrzeni i uprawnienia do klienta. Plik proxy.ts, który w Next.js 16 zastąpił middleware.ts (Vercel), służy tylko do szybkiego przekierowania niezalogowanych. Lekcja z 2025 r.: podatność CVE-2025-29927 pozwalała obejść autoryzację wykonywaną wyłącznie w middleware (advisory).
• Izolacja przestrzeni. Każde zapytanie filtruje po identyfikatorze przestrzeni; drugą warstwą może być Row Level Security w PostgreSQL.
• Walidacja wszystkich danych wejściowych schematami Zod, wspólnymi dla klienta i serwera.
• Nagłówki: restrykcyjna CSP z nonce, HSTS, frame-ancestors 'none', Referrer-Policy: no-referrer, X-Content-Type-Options: nosniff.
• XSS to zagrożenie numer jeden, bo skrypt w zalogowanej karcie widzi odszyfrowane dane. Zakaz dangerouslySetInnerHTML i żadnych skryptów firm trzecich (analityka, czaty, piksele) w zalogowanej części.
• Pamięć podręczna: od Next.js 16.4 nowe projekty mają domyślnie włączone Cache Components (Next.js 16.4). Dane sejfu i dane zależne od uprawnień nie dostają dyrektywy 'use cache' — są pobierane na żądanie, po sprawdzeniu uprawnień.
• Logi i monitoring (np. Sentry) z filtrowaniem danych: treść żądań z sejfu nigdy nie trafia do logów.
• Aktualizacje: lockfile, Renovate lub Dependabot i szybkie łatanie frameworka. W grudniu 2025 r. krytyczna podatność w React Server Components (CVE-2025-55182, CVSS 10.0) dotknęła Next.js 15 i 16 (Kudelski Security). Od lipca 2026 r. Next.js zapowiada wydania bezpieczeństwa mniej więcej raz w miesiącu (Next.js), więc warto mieć stały termin aktualizacji.
• Przed startem produkcyjnym: przegląd kodu kryptografii, testy penetracyjne, plik security.txt i proces zgłaszania podatności.
• Ograniczenie aplikacji webowej: kod JavaScript dostarcza serwer, więc przejęcie procesu wdrożeń mogłoby pozwolić na przechwycenie hasła głównego. Ochrona: zabezpieczony CI/CD, 2FA i minimalne uprawnienia do produkcji, monitorowanie zmian; w dalszej perspektywie rozszerzenie przeglądarki lub aplikacja desktopowa.
6.6 Infrastruktura
• Hosting i baza danych w UE.
• Szyfrowanie dysków i bazy w spoczynku, TLS także do bazy, sekrety środowiskowe w menedżerze sekretów.
• Kopie zapasowe codziennie, szyfrowane, z regularnym testem odtworzenia; i tak zawierają tylko szyfrogramy.
• Dostęp do produkcji tylko z 2FA i według zasady najmniejszych uprawnień.
7. RODO i kwestie prawne
System przetwarza dane osobowe — kontakty klientów, loginy będące adresami e-mail i adresy IP w dzienniku — więc podstawy zgodności z RODO są potrzebne od startu.
• W modelu SaaS dostawca aplikacji jest podmiotem przetwarzającym dla agencji: potrzebna umowa powierzenia przetwarzania danych, lista podprocesorów i rejestr czynności przetwarzania.
• Eksport i usunięcie danych na żądanie, określony czas przechowywania dziennika.
• Szyfrowanie end-to-end ułatwia ocenę skutków naruszenia: dane niezrozumiałe dla osób nieuprawnionych mogą zwolnić z obowiązku zawiadamiania osób, których dotyczą (art. 34 ust. 3 lit. a RODO).
• Po zakończeniu współpracy z klientem: archiwizacja, przypomnienie o usunięciu dostępów po ustalonym czasie i rekomendacja, by klient zmienił hasła.
• Regulamin i politykę prywatności warto przygotować z prawnikiem lub inspektorem ochrony danych — ten opis nie jest poradą prawną.
8. Stos technologiczny
Rdzeniem jest Next.js 16 z App Routerem — obecnie aktywnie wspierana linia (Next.js), w najnowszej wersji 16.4 z React 19.3 (Next.js 16.4).
Warstwa
Wybór
Dlaczego
Framework
Next.js 16 (App Router), React 19, TypeScript w trybie strict
Server Components dla danych CRM, Server Actions do zapisów, jeden projekt dla frontu i backendu
UI
Tailwind CSS, shadcn/ui (Radix UI), ikony lucide-react
dostępne komponenty, łatwe do dostosowania
Tabele i listy
TanStack Table, TanStack Virtual
sortowanie, filtry, płynne listy z tysiącami wpisów
Formularze
React Hook Form, Zod
jedna walidacja dla klienta i serwera
Nawigacja i komunikaty
cmdk (paleta poleceń), sonner (powiadomienia)
szybka praca z klawiatury
Dane w przeglądarce
TanStack Query; klucze sejfu w pamięci, np. Zustand
szyfrogramy pobierane i odszyfrowywane lokalnie
Baza danych
PostgreSQL
dojrzała, relacyjna, z Row Level Security
ORM
Drizzle ORM (alternatywnie Prisma)
typowane zapytania i migracje
Uwierzytelnianie
Better Auth: e-mail i hasło, 2FA, passkeys, organizacje, wbudowany limiter
Auth.js od 2025 r. utrzymuje ten sam zespół, który dla nowych projektów zaleca Better Auth (ogłoszenie)
Kryptografia
libsodium (libsodium-wrappers-sumo), Web Crypto API
sprawdzone prymitywy, Argon2id w przeglądarce
Siła haseł i wycieki
zxcvbn-ts, Pwned Passwords
ocena siły i wykrywanie wycieków bez ujawniania hasła
E-mail
Resend lub Postmark, React Email
e-maile transakcyjne
Zadania cykliczne
Vercel Cron, Inngest lub Trigger.dev
przypomnienia o wygasaniu
Limity zapytań
Redis (np. Upstash)
wspólne limity przy wielu instancjach aplikacji
Monitoring
Sentry z filtrowaniem danych, logi strukturalne
błędy bez wycieku danych
Testy
Vitest, Playwright
testy jednostkowe (także kryptografii) i end-to-end
Tłumaczenia
next-intl
polski na start, kolejne języki później
Hosting
Vercel (region w UE) lub Docker na własnej infrastrukturze w UE
zgodność z RODO, kontrola nad danymi
Wersje bibliotek są zamrożone w lockfile i aktualizowane w rytmie wydań bezpieczeństwa (6.5).
9. Struktura projektu Next.js
Cała kryptografia żyje w jednym module lib/crypto, a każde zapytanie do bazy przechodzi przez warstwę lib/dal, która sprawdza uprawnienia.
src/
  app/
    (auth)/login/                          logowanie
    (auth)/register/                       rejestracja, 2FA, zestaw ratunkowy
    (auth)/unlock/                         odblokowanie sejfu
    (app)/layout.tsx                       wymaga sesji; nawigacja, paleta poleceń
    (app)/dashboard/                       pulpit
    (app)/clients/                         lista klientów
    (app)/clients/[clientId]/              karta klienta (layout z zakładkami)
    (app)/clients/[clientId]/credentials/  dostępy
    (app)/clients/[clientId]/contacts/     kontakty
    (app)/clients/[clientId]/domains/      domeny i hosting
    (app)/clients/[clientId]/notes/        notatki
    (app)/clients/[clientId]/activity/     historia
    (app)/vault/                           wszystkie dostępy
    (app)/security/                        kondycja haseł
    (app)/activity/                        dziennik zdarzeń
    (app)/settings/                        ustawienia
    share/[id]/                            publiczny link jednorazowy
    request/[token]/                       formularz dla klienta
    api/                                   zadania cykliczne, webhooki
  components/
    ui/                                    komponenty shadcn/ui
    clients/  vault/  security/
  lib/
    crypto/                                cała kryptografia + testy
    auth/                                  konfiguracja Better Auth
    db/                                    schemat bazy i migracje
    dal/                                   zapytania z kontrolą uprawnień (server-only)
    validation/                            schematy Zod
  server/actions/                          Server Actions
  proxy.ts                                 przekierowanie niezalogowanych, nagłówki
Dane CRM renderują Server Components. Ekrany sejfu to komponenty klienckie: pobierają szyfrogramy i odszyfrowują je lokalnie. Serwer nigdy nie renderuje haseł — nie może, bo ich nie zna.
10. Model danych
Każda tabela z danymi klientów ma workspaceId, a sekrety trafiają do bazy wyłącznie jako szyfrogramy (pola encrypted*).
Tabela
Najważniejsze pola
Uwagi
users
id, email, name, publicKey, encryptedPrivateKey, recoveryEncryptedPrivateKey, kdfSalt, kdfParams
plus tabele Better Auth: sesje, konta, passkeys, 2FA
workspaces
id, name, plan, settings, intakePublicKey
przestrzeń agencji lub freelancera; klucz publiczny skrzynki „Do przejrzenia”
workspace_members
workspaceId, userId, role, status
role: owner, admin, member, viewer
clients
id, workspaceId, name, taxId, status, website, ownerUserId, tags, notes, archivedAt
dane CRM
client_contacts
id, clientId, name, role, email, phone
osoby kontaktowe
client_members
clientId, userId
kto ma dostęp do klienta
key_grants
scopeType (client lub intake), scopeId, userId, encryptedKey, keyVersion
kopia klucza sejfu klienta lub skrzynki „Do przejrzenia” dla każdej uprawnionej osoby
credentials
id, workspaceId, clientId, type, sensitivity, encryptedItemKey, encryptedData, formatVersion, passwordChangedAt, strengthScore, expiresAt, createdBy, updatedAt, deletedAt
encryptedData zawiera nazwę, login, hasło, URL, 2FA, notatki, środowisko i pola własne
credential_versions
id, credentialId, encryptedData, createdBy, createdAt
historia wersji
domains
id, clientId, name, registrar, expiresAt, sslExpiresAt, hosting
źródło przypomnień
shares
id, credentialId, ciphertext, expiresAt, maxViews, viewCount, revokedAt, createdBy
klucz tylko w adresie linku
access_requests
id, clientId, tokenHash, requestedTypes, expiresAt, status, submittedCiphertext
formularz dla klienta
audit_events
id, workspaceId, actorId, action, targetType, targetId, ip, userAgent, metadata, createdAt
tylko dopisywanie
reminders
id, workspaceId, targetType, targetId, dueAt, status
przypomnienia
11. Wymagania niefunkcjonalne
Najważniejsze progi: odblokowanie sejfu poniżej 2 s i wyniki wyszukiwania poniżej 100 ms przy 5 000 wpisów.
Obszar
Wymaganie
Wydajność
odblokowanie sejfu < 2 s; wyniki wyszukiwania < 100 ms przy 5 000 wpisów; LCP pulpitu < 2,5 s
Dostępność
WCAG 2.2 AA, pełna obsługa klawiatury i czytników ekranu
Responsywność
od 360 px szerokości; w kolejnej fazie aplikacja PWA
Niezawodność
dostępność 99,9%; kopie z odtwarzaniem do punktu w czasie (PITR); RPO ≤ 15 min, RTO ≤ 4 h
Prywatność
brak narzędzi analitycznych firm trzecich po zalogowaniu
Jakość kodu
TypeScript strict, pełne pokrycie testami modułu kryptograficznego, testy end-to-end kluczowych ścieżek, CI blokujące wdrożenie przy błędach
12. Plan wdrożenia
MVP z pełnym szyfrowaniem end-to-end powstaje w pierwszej fazie, a pierwsi klienci dostają aplikację dopiero po audycie bezpieczeństwa.
Faza 1 kończy się bramką: bez pozytywnego audytu i testów penetracyjnych aplikacja nie trafia do klientów. Fazy 2 i 3 rozwijają produkt już po starcie.
13. Kryteria akceptacji
Wersja jest gotowa do wdrożenia, gdy przechodzą wszystkie poniższe testy:
[ ] W zrzucie bazy danych nie ma w postaci jawnej żadnego hasła, loginu ani adresu URL wpisu — test wstawia znany ciąg i przeszukuje zrzut.
[ ] Hasło nie pojawia się w postaci jawnej w logach serwera, monitoringu ani ruchu sieciowym.
[ ] Członek zespołu nieprzypisany do klienta przy próbie pobrania jego wpisów dostaje błąd 404, więc nie dowiaduje się nawet, że klient istnieje.
[ ] Skopiowanie hasła tworzy zdarzenie w dzienniku z użytkownikiem, czasem i adresem IP.
[ ] Po zadanym czasie bezczynności sejf się blokuje, a klucze znikają z pamięci.
[ ] Link jednorazowy przestaje działać po pierwszym wyświetleniu lub po upływie ważności.
[ ] Odsłonięcie wpisu krytycznego bez ponownego potwierdzenia tożsamości jest niemożliwe.
[ ] Nowy użytkownik dodaje kompletny dostęp FTP w mniej niż 30 s (test użyteczności).
[ ] Hasło da się skopiować w mniej niż 10 s od wejścia na pulpit (test użyteczności).
14. Ryzyka i decyzje do potwierdzenia
Największym ryzykiem są błędy w kryptografii, dlatego cała kryptografia siedzi w jednym module i przed startem przechodzi zewnętrzny przegląd.
Ryzyko lub decyzja
Opis
Rekomendacja
Szyfrowanie end-to-end od początku
wyższa złożoność pierwszej wersji
zostać przy E2E — późniejsza migracja jest droższa niż zrobienie tego od razu
Błędy w kryptografii
najpoważniejsze możliwe konsekwencje
tylko libsodium, jeden moduł, testy na wektorach, przegląd specjalisty i audyt przed startem
Utrata hasła głównego
bez klucza odzyskiwania dane przepadają
obowiązkowy zestaw ratunkowy przy rejestracji, odzyskiwanie przez administratora w zespołach
Kod dostarczany przez serwer
przejęcie wdrożeń mogłoby pozwolić na przechwycenie hasła głównego
zabezpieczony CI/CD, minimalne uprawnienia, monitoring; później rozszerzenie lub aplikacja desktopowa
Tempo poprawek bezpieczeństwa
Next.js i jego zależności wymagają regularnych aktualizacji
stały, comiesięczny termin aktualizacji i szybka ścieżka dla poprawek krytycznych
Model produktu
SaaS dla wielu agencji czy narzędzie jednej firmy
do decyzji: architektura obsługuje oba warianty, ale SaaS wymaga też płatności, regulaminu i umów powierzenia
Budować czy zintegrować
dla narzędzia wyłącznie wewnętrznego tańszy może być CRM połączony z gotowym menedżerem haseł dla firm
budować, jeśli sejf ma być wyróżnikiem produktu
15. Źródła
Strony sprawdzone 28 października 2026 r.
• Next.js — wspierane wersje i blog — linia 16.x jako Active LTS, lista wydań i aktualizacji bezpieczeństwa.
• Next.js 16.4 — React 19.3, Cache Components domyślnie w nowych projektach.
• Next.js Security Release and Our Next Patch Release — zapowiadane wydania bezpieczeństwa mniej więcej raz w miesiącu (13 lipca 2026).
• Vercel Academy: Proxy Basics — proxy.ts zamiast middleware.ts w Next.js 16.
• GHSA-f82v-jwr5-mffw (CVE-2025-29927) — obejście autoryzacji wykonywanej w middleware (marzec 2025).
• Kudelski Security: CVE-2025-55182 — krytyczna podatność w React Server Components (grudzień 2025).
• Better Auth: Introduction — funkcje: 2FA, passkeys, organizacje, limiter zapytań.
• Auth.js is now part of Better Auth — zalecenie Better Auth dla nowych projektów (22 września 2025).
• Cloudflare: Validating Leaked Passwords with k-Anonymity — zasada działania Pwned Passwords.
