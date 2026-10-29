import { securityContact } from "@/lib/env";

export const metadata = { title: "Bezpieczeństwo" };

export default function SecurityInfoPage() {
  return (
    <>
      <h1>Bezpieczeństwo i zgłaszanie podatności</h1>
      <h2>Jak chronimy dane</h2>
      <ul>
        <li>Szyfrowanie end-to-end: hasła, sekrety 2FA, klucze, notatki sejfu i załączniki szyfrują się w przeglądarce (XChaCha20-Poly1305, X25519, Argon2id — libsodium).</li>
        <li>Hasło główne nigdy nie opuszcza przeglądarki; serwer zna tylko skrót wyprowadzonego klucza uwierzytelniającego.</li>
        <li>Opcjonalne 2FA (TOTP lub passkey), limity prób logowania, CAPTCHA bez skryptów firm trzecich.</li>
        <li>Każde wyświetlenie i skopiowanie hasła trafia do dziennika zdarzeń (tylko dopisywanie).</li>
        <li>Restrykcyjna polityka CSP z nonce, HSTS, brak skryptów firm trzecich po zalogowaniu.</li>
        <li>Izolacja przestrzeni w warstwie danych i Row Level Security w PostgreSQL.</li>
      </ul>
      <h2>Ograniczenia</h2>
      <ul>
        <li>Kod aplikacji dostarcza serwer — przejęcie procesu wdrożeń mogłoby pozwolić na przechwycenie hasła głównego. Chronimy CI/CD, dostęp do produkcji (2FA, minimalne uprawnienia) i monitorujemy zmiany.</li>
        <li>Dziennik daje rozliczalność, ale nie zatrzyma osoby, która już ma dostęp do hasła — po odejściu pracownika zmieniaj hasła, które widział.</li>
        <li>Czyszczenie schowka działa „w miarę możliwości” — przeglądarka pozwala na nie tylko przy aktywnej karcie.</li>
      </ul>
      <h2>Zgłaszanie podatności</h2>
      <p>
        Napisz na <a href={`mailto:${securityContact}`} className="underline">{securityContact}</a> (zob. <a href="/.well-known/security.txt" className="underline">security.txt</a>). Odpowiadamy w ciągu 72 godzin. Prosimy o
        odpowiedzialne ujawnianie i niewykonywanie testów na danych innych użytkowników.
      </p>
    </>
  );
}
