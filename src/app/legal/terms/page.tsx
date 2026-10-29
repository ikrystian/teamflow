export const metadata = { title: "Regulamin" };

export default function TermsPage() {
  return (
    <>
      <h1>Regulamin</h1>
      <h2>Usługa</h2>
      <p>Nexus to aplikacja do zarządzania projektami i zadaniami, prowadzenia bazy klientów oraz zaszyfrowanego sejfu dostępów. Może działać jako SaaS lub instancja jednej firmy.</p>
      <h2>Odpowiedzialność za hasło główne</h2>
      <p>Hasło główne sejfu i klucz odzyskiwania znasz tylko Ty. Bez nich (i bez zespołu, który może ponownie nadać dostęp) danych nie da się odzyskać — to cecha szyfrowania end-to-end.</p>
      <h2>Plany i płatności</h2>
      <p>Warunki planów płatnych, okres rozliczeniowy i zasady rezygnacji — do uzupełnienia po wyborze operatora płatności.</p>
      <h2>Zasady korzystania</h2>
      <ul>
        <li>Nie przechowuj w notatkach ogólnych CRM haseł ani danych poufnych — służy do tego sejf.</li>
        <li>Udostępniaj dostępy wyłącznie osobom uprawnionym przez klienta.</li>
        <li>Po zakończeniu współpracy przekaż dostępy klientowi i zarekomenduj zmianę haseł.</li>
      </ul>
    </>
  );
}
