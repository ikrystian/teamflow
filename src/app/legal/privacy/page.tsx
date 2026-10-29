export const metadata = { title: "Polityka prywatności" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Polityka prywatności</h1>
      <h2>Administrator i podmiot przetwarzający</h2>
      <p>W modelu SaaS dostawca Nexusa jest podmiotem przetwarzającym dane w imieniu agencji lub freelancera (administratora), na podstawie umowy powierzenia przetwarzania danych (art. 28 RODO).</p>
      <h2>Jakie dane przetwarzamy</h2>
      <ul>
        <li>Dane konta: imię i nazwisko, adres e-mail, skróty haseł konta (Argon2/scrypt w Better Auth), dane 2FA.</li>
        <li>Dane CRM: klienci, osoby kontaktowe (imię, nazwisko, rola, e-mail, telefon), domeny, notatki ogólne — szyfrowane w spoczynku, dostępne dla serwera.</li>
        <li>Dane sejfu: wyłącznie szyfrogramy tworzone w przeglądarce (end-to-end). Dostawca nie ma technicznej możliwości ich odczytania.</li>
        <li>Dziennik zdarzeń: kto, co, kiedy, adres IP i urządzenie — w celu rozliczalności i bezpieczeństwa.</li>
      </ul>
      <h2>Czas przechowywania</h2>
      <ul>
        <li>Dziennik zdarzeń: domyślnie 12 miesięcy (konfigurowalne przez właściciela przestrzeni), potem automatycznie usuwany.</li>
        <li>Klienci zakończeni: przypomnienie o usunięciu dostępów po ustalonym czasie (domyślnie 90 dni).</li>
        <li>Wygasłe linki jednorazowe: szyfrogram usuwany po wykorzystaniu lub wygaśnięciu.</li>
        <li>Kopie zapasowe: codzienne, szyfrowane, zawierają wyłącznie szyfrogramy danych sejfu.</li>
      </ul>
      <h2>Prawa osób, których dane dotyczą</h2>
      <p>Eksport danych przestrzeni i usunięcie konta lub przestrzeni są dostępne w Ustawieniach → Import i eksport oraz Ustawienia → Przestrzeń.</p>
      <h2>Narzędzia firm trzecich</h2>
      <p>Po zalogowaniu nie używamy narzędzi analitycznych, czatów ani pikseli firm trzecich. Jedynym zapytaniem z przeglądarki do usługi zewnętrznej jest opcjonalne sprawdzanie wycieków haseł (Pwned Passwords) metodą k-anonimowości — wysyłane jest 5 znaków skrótu SHA-1, nigdy hasło.</p>
      <h2>Naruszenia ochrony danych</h2>
      <p>Dane sejfu są niezrozumiałe dla osób nieuprawnionych (szyfrowanie end-to-end), co ma znaczenie przy ocenie obowiązku zawiadamiania osób (art. 34 ust. 3 lit. a RODO).</p>
    </>
  );
}
