import { FileSpreadsheet, FileText, GitCommitHorizontal, LayoutList, Mail, Timer, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { AppWindow } from "./app-window";
import { cssVars } from "./css-vars";
import { NexusStar } from "./nexus-star";

type Fragment = {
  /** Start względem punktu styku: x w vw, y w svh, obrót w stopniach. */
  x: number;
  y: number;
  r: number;
  /** Moment wyruszenia (postęp sekcji 0…1). */
  d: number;
  /** Na telefonie zostaje sześć okruchów — reszta znika, żeby nie zasłaniały tekstu. */
  optional?: boolean;
  body: ReactNode;
};

const FRAGMENTS: Fragment[] = [
  {
    x: -33,
    y: -2,
    r: -7,
    d: 0.08,
    body: (
      <div className="lx-chip">
        <p className="lx-chip-label">
          <FileSpreadsheet aria-hidden /> Arkusz
        </p>
        <p className="lx-chip-title">godziny_pazdziernik_FINAL(3).xlsx</p>
        <p className="lx-chip-meta">edytują 4 osoby naraz</p>
      </div>
    ),
  },
  {
    x: 31,
    y: -15,
    r: 6,
    d: 0.12,
    body: (
      <div className="lx-chip">
        <p className="lx-chip-label">
          <FileText aria-hidden /> Notatnik <span className="lx-chip-dot" />
        </p>
        <p className="lx-chip-title">hasla_klientow.txt</p>
        <p className="lx-chip-meta">ostatnia zmiana: 2021</p>
      </div>
    ),
  },
  {
    x: -24,
    y: 23,
    r: 4,
    d: 0.15,
    body: (
      <div className="lx-chip lx-chip--chat">
        <span className="lx-chip-avatar">M</span>
        <div>
          <p className="lx-chip-title">
            Marta <span className="lx-chip-meta">11:42</span>
          </p>
          <p>kto ma dostęp do FTP Kowalskiego?</p>
          <p className="lx-chip-meta">3 odpowiedzi · nikt nie wie</p>
        </div>
      </div>
    ),
  },
  {
    x: 29,
    y: 21,
    r: -5,
    d: 0.2,
    optional: true,
    body: (
      <div className="lx-chip">
        <p className="lx-chip-label">
          <LayoutList aria-hidden /> Tablica
        </p>
        <p className="lx-chip-title">Poprawki na stronie głównej (v3)</p>
        <p className="lx-chip-meta">ta sama karta na dwóch tablicach</p>
      </div>
    ),
  },
  {
    x: 12,
    y: -27,
    r: -3,
    d: 0.17,
    optional: true,
    body: (
      <div className="lx-chip">
        <p className="lx-chip-label">
          <Mail aria-hidden /> Poczta
        </p>
        <p className="lx-chip-title">Re: Fwd: Re: dane do WordPressa</p>
        <p className="lx-chip-meta">wątek: 47 wiadomości</p>
      </div>
    ),
  },
  {
    x: -6,
    y: 31,
    r: 6,
    d: 0.23,
    body: (
      <div className="lx-chip lx-chip--timer">
        <p className="lx-chip-label">
          <Timer aria-hidden /> Timer
        </p>
        <p className="lx-chip-title">02:14:37</p>
        <p className="lx-chip-meta">…ale nad czym?</p>
      </div>
    ),
  },
  {
    x: 40,
    y: 4,
    r: 3,
    d: 0.26,
    optional: true,
    body: (
      <div className="lx-chip lx-chip--toast">
        <TriangleAlert aria-hidden />
        <div>
          <p className="lx-chip-title">Certyfikat SSL wygasa za 3 dni</p>
          <p className="lx-chip-meta">kowalski.pl</p>
        </div>
      </div>
    ),
  },
  {
    x: -41,
    y: 13,
    r: -4,
    d: 0.28,
    optional: true,
    body: (
      <div className="lx-chip lx-chip--commit">
        <p className="lx-chip-label">
          <GitCommitHorizontal aria-hidden /> Git
        </p>
        <p className="lx-chip-title">
          <b>a3f9c2e</b> fix: koszyk na iOS
        </p>
        <p className="lx-chip-meta">…do którego zadania?</p>
      </div>
    ),
  },
  {
    x: 17,
    y: 32,
    r: -8,
    d: 0.3,
    body: <div className="lx-chip lx-chip--note">hasło do panelu → zapytaj Tomka</div>,
  },
];

/**
 * Scena przyklejona do przewijania: okruchy pracy z dziewięciu miejsc wpadają w
 * punkt styku, rozbłysk otwiera okno Nexusa. Całą choreografię liczy CSS z --p.
 */
export function Convergence() {
  return (
    <section id="produkt" data-progress="sticky" className="lx-conv" aria-labelledby="lx-conv-title">
      <div className="lx-conv-stage">
        <div aria-hidden className="lx-conv-grid" />

        <div aria-hidden className="lx-core">
          <span className="lx-core-glow" />
          <span className="lx-core-ring" style={cssVars({ "--k": 0 })} />
          <span className="lx-core-ring" style={cssVars({ "--k": 1 })} />
          <span className="lx-core-ring" style={cssVars({ "--k": 2 })} />
          <span className="lx-core-flash" />
          <span className="lx-core-star">
            <NexusStar />
          </span>
        </div>

        <div aria-hidden className="lx-frags">
          {FRAGMENTS.map((fragment, index) => (
            <div
              key={index}
              className="lx-frag"
              data-optional={fragment.optional ? "" : undefined}
              style={cssVars({
                "--x": `${fragment.x}vw`,
                "--y": `${fragment.y}svh`,
                "--r": `${fragment.r}deg`,
                "--d": fragment.d,
              })}
            >
              {fragment.body}
            </div>
          ))}
        </div>

        <div className="lx-container lx-conv-copy">
          <div className="lx-conv-a">
            <p className="lx-kicker">01 — Dziś</p>
            <h2 id="lx-conv-title" className="lx-display lx-h2">
              Praca agencji jest <em>rozsypana</em>.
            </h2>
            <p className="lx-sub">
              Godziny w arkuszu, hasła w notatniku, ustalenia w mailach, zadania na trzeciej tablicy. Każde narzędzie
              wie trochę — żadne nie wie wszystkiego.
            </p>
          </div>
          <div className="lx-conv-b">
            <p className="lx-kicker">01 — Z Nexusem</p>
            <p className="lx-display lx-h2">
              Jeden węzeł. <em>Cały</em> obraz.
            </p>
            <p className="lx-sub">
              Zadanie wie, ile trwało i z którego commita. Klient wie, co się zmieniło. Hasło leży przy projekcie —
              zaszyfrowane i tylko dla właściwych osób.
            </p>
          </div>
        </div>

        <div className="lx-app-stage">
          <AppWindow />
        </div>

        <div aria-hidden className="lx-container lx-conv-hud">
          <p className="lx-hud-count">
            <span className="lx-count" />
            otwartych kart
          </p>
          <span className="lx-hud-progress">
            <span />
          </span>
        </div>
      </div>
    </section>
  );
}
