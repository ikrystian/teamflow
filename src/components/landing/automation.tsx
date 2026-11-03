import type { ReactNode } from "react";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { cssVars } from "./css-vars";

const STEPS = [
  "Branch zakładasz prosto z zadania",
  "Po merge’u zadanie samo trafia do „Gotowe”",
  "Commity zamieniają się w podzadania z czasem",
  "Opis zmian po polsku pisze AI",
  "Slack dostaje podsumowanie, zespół — przypomnienia push",
];

const LOG: { time: string; source: string; color: string; text: ReactNode }[] = [
  {
    time: "09:12",
    source: "branch",
    color: "var(--lx-c2)",
    text: (
      <>
        <b>feature/sk-48-koszyk-na-ios</b> ← z zadania SK-48
      </>
    ),
  },
  {
    time: "13:58",
    source: "github",
    color: "var(--lx-ink)",
    text: (
      <>
        PR #57 zmergowany do <b>main</b>
      </>
    ),
  },
  {
    time: "13:58",
    source: "zadanie",
    color: "var(--lx-c1)",
    text: (
      <>
        SK-48 · W toku → <b>Gotowe</b> · branch usunięty
      </>
    ),
  },
  {
    time: "13:59",
    source: "ai",
    color: "var(--lx-c3)",
    text: (
      <>
        3 commity → 3 podzadania · <b>2 h 40 min</b> w raporcie
      </>
    ),
  },
  {
    time: "13:59",
    source: "ai",
    color: "var(--lx-c3)",
    text: <>opis zmian po polsku · 3 punkty</>,
  },
  {
    time: "14:00",
    source: "slack",
    color: "var(--lx-warn)",
    text: (
      <>
        #sklep-kowalski ← „SK-48 · Koszyk na iOS — gotowe”
        <span aria-hidden className="lx-caret" />
      </>
    ),
  },
];

export function Automation() {
  return (
    <section id="automatyzacje" className="lx-section" aria-labelledby="lx-auto-title">
      <div className="lx-container lx-auto-grid">
        <div className="lx-auto-copy" data-reveal="rise">
          <p className="lx-kicker">03 — Automatyzacje</p>
          <h2 id="lx-auto-title" className="lx-display lx-h2">
            Jeden merge. <em>Pięć</em> rzeczy z głowy.
          </h2>
          <p className="lx-sub">
            Podłączasz repozytorium raz. Potem Nexus sam pilnuje, żeby zadanie, czas i klient wiedzieli o każdej
            zmianie w kodzie — zanim ktokolwiek zdąży o to zapytać.
          </p>
          <ol className="lx-steps">
            {STEPS.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="lx-auto-stack">
          <div className="lx-push lx-glass" data-reveal="scale" style={cssVars({ "--i": 13, "--step": "240ms" })}>
            <NexusLogo size={30} className="size-[30px] shrink-0" />
            <p>
              <b className="font-medium">Przypomnienie</b> · SK-51 Newsletter listopadowy — termin jutro, 10:00
            </p>
          </div>

          <div className="lx-term lx-night" data-reveal="scale">
            <div className="lx-term-bar">
              <b>Automatyzacje</b> · Sklep Kowalski
              <span className="lx-term-live">na żywo</span>
            </div>
            <ol className="lx-term-log">
              {LOG.map((entry, index) => (
                <li key={index} data-reveal="rise" style={cssVars({ "--i": index + 2 })}>
                  <time>{entry.time}</time>
                  <span className="lx-src" style={cssVars({ "--c": entry.color })}>
                    {entry.source}
                  </span>
                  <span>{entry.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="lx-slack lx-glass" data-reveal="rise" style={cssVars({ "--i": 12, "--step": "240ms" })}>
            <div className="flex items-center gap-2.5">
              <NexusLogo size={34} className="size-[34px] shrink-0" />
              <div className="leading-tight">
                <p className="flex items-center gap-2">
                  <b className="font-semibold">Nexus</b>
                  <span className="lx-badge">APLIKACJA</span>
                </p>
                <p className="lx-faint-s">#sklep-kowalski · 14:00</p>
              </div>
            </div>
            <p className="mt-3 font-medium">SK-48 · Koszyk na iOS — gotowe ✅</p>
            <ul>
              <li>Przycisk „Do kasy” znów działa w Safari na iPhone’ach</li>
              <li>Koszyk pamięta produkty po odświeżeniu strony</li>
              <li>Rabat liczy się poprawnie w podsumowaniu zamówienia</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
