import { cssVars } from "./css-vars";
import { VaultCipher } from "./vault-cipher";

const SAFEGUARDS = [
  {
    title: "Prośba o dostęp",
    text: "Wysyłasz klientowi link. Hasła, które wpisze, szyfruje jego przeglądarka — Twoim kluczem publicznym. Koniec z dostępami w mailach.",
  },
  {
    title: "Link jednorazowy",
    text: "Podwykonawca dostaje dostęp na jedno otwarcie. Potem link przestaje działać.",
  },
  {
    title: "Wpisy krytyczne",
    text: "Domena czy konto reklamowe? Odczyt wymaga ponownego potwierdzenia tożsamości.",
  },
  {
    title: "Dziennik zdarzeń",
    text: "Każde otwarcie, zmiana i udostępnienie zostaje w dzienniku, którego nie da się edytować.",
  },
];

const SPECS = [
  "Argon2id",
  "XChaCha20-Poly1305",
  "X25519",
  "PostgreSQL z Row Level Security",
  "2FA (TOTP)",
  "Passkeys",
  "Pwned Passwords z k-anonimowością",
  "Dziennik tylko do dopisywania",
  "CSP z nonce",
];

/** Rozdział nocny (zawsze ciemny, także w jasnym motywie) — tu mieszkają hasła klientów. */
export function VaultChapter() {
  return (
    <section id="sejf" className="lx-night lx-vault" aria-labelledby="lx-vault-title">
      <div aria-hidden className="lx-vault-bg" />
      <div aria-hidden className="lx-noise" />

      <div className="lx-container">
        <div className="lx-vault-grid">
          <div data-reveal="rise">
            <p className="lx-kicker">04 — Sejf dostępów</p>
            <h2 id="lx-vault-title" className="lx-display lx-h2">
              Hasła klientów, których <em>nawet my</em> nie przeczytamy.
            </h2>
            <p className="lx-sub">
              Każdy wpis szyfrujesz w przeglądarce, zanim cokolwiek trafi na serwer. Bez Twojego hasła głównego to
              tylko szum — dla nas, dla administratora bazy i dla każdego, kto by się do niej dobrał.
            </p>
          </div>

          <div className="lx-vault-art" data-reveal="scale" style={cssVars({ "--i": 1 })}>
            <span aria-hidden className="lx-zero">
              0
            </span>
            <VaultCipher />
            <p className="lx-zero-cap">— tyle haseł w postaci jawnej trafia na nasz serwer</p>
          </div>
        </div>

        <div className="lx-cluster">
          {SAFEGUARDS.map((item, index) => (
            <article key={item.title} data-reveal="rise" style={cssVars({ "--i": index })}>
              <span className="lx-mono text-[0.68rem] text-[var(--lx-c1)]">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="lx-marquee">
        <ul>
          {SPECS.map((spec) => (
            <li key={spec}>{spec}</li>
          ))}
        </ul>
        <ul aria-hidden>
          {SPECS.map((spec) => (
            <li key={spec}>{spec}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
