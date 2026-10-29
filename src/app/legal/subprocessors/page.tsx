export const metadata = { title: "Podprocesorzy" };

export default function SubprocessorsPage() {
  return (
    <>
      <h1>Lista podprocesorów</h1>
      <p>Wszystkie dane są przechowywane i przetwarzane w Unii Europejskiej.</p>
      <table>
        <thead>
          <tr>
            <th>Podmiot</th>
            <th>Cel</th>
            <th>Lokalizacja</th>
            <th>Dane</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Hosting aplikacji (Vercel — region UE lub własna infrastruktura)</td>
            <td>Uruchamianie aplikacji</td>
            <td>UE</td>
            <td>Wszystkie (sejf wyłącznie jako szyfrogramy)</td>
          </tr>
          <tr>
            <td>Dostawca bazy PostgreSQL</td>
            <td>Przechowywanie danych</td>
            <td>UE</td>
            <td>Wszystkie (sejf wyłącznie jako szyfrogramy)</td>
          </tr>
          <tr>
            <td>Resend lub Postmark</td>
            <td>E-maile transakcyjne</td>
            <td>UE / do weryfikacji</td>
            <td>Adres e-mail, treść powiadomień (bez sekretów)</td>
          </tr>
          <tr>
            <td>Upstash (Redis)</td>
            <td>Limity zapytań</td>
            <td>UE</td>
            <td>Adresy IP, adresy e-mail (liczniki prób logowania)</td>
          </tr>
          <tr>
            <td>Sentry (opcjonalnie)</td>
            <td>Monitoring błędów</td>
            <td>UE</td>
            <td>Komunikaty błędów z filtrowaniem danych</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
