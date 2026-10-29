export const metadata = { title: "Rejestr czynności przetwarzania" };

export default function ProcessingPage() {
  const rows = [
    ["Prowadzenie kont użytkowników", "Uwierzytelnianie, 2FA, sesje", "Użytkownicy", "e-mail, imię i nazwisko, IP, urządzenie", "do usunięcia konta"],
    ["Baza klientów (CRM)", "Obsługa klientów agencji", "Osoby kontaktowe klientów", "imię i nazwisko, rola, e-mail, telefon", "do usunięcia klienta"],
    ["Sejf dostępów", "Przechowywanie dostępów", "Właściciele kont (loginy)", "wyłącznie szyfrogramy E2E", "do usunięcia wpisu / klienta"],
    ["Dziennik zdarzeń", "Rozliczalność, bezpieczeństwo", "Użytkownicy", "działania, IP, urządzenie", "12 miesięcy (konfigurowalne)"],
    ["Powiadomienia e-mail", "Przypomnienia i alerty", "Użytkownicy", "e-mail", "do usunięcia konta"],
  ];
  return (
    <>
      <h1>Rejestr czynności przetwarzania (wzór)</h1>
      <table>
        <thead>
          <tr>
            <th>Czynność</th>
            <th>Cel</th>
            <th>Kategorie osób</th>
            <th>Kategorie danych</th>
            <th>Okres przechowywania</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c) => (
                <td key={c}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
