import { Folder, Globe, Lock, Megaphone, Server, ShieldAlert } from "lucide-react";
import { cssVars } from "./css-vars";

/* Miniatury modułów — te same w podglądzie przy kursorze i w wierszu na telefonie. */

export function ProjectsPreview() {
  return (
    <div className="lx-pv">
      <p className="lx-pv-head">
        W toku <span>2 / 5</span>
      </p>
      <div className="lx-task" data-live="">
        <div className="lx-task-top">
          <span className="lx-task-key">SK-48</span>
          <span className="lx-task-tag" style={cssVars({ "--h": 277 })}>
            frontend
          </span>
        </div>
        <p className="lx-task-title">Koszyk na iOS</p>
      </div>
      <div className="lx-task" data-drag="">
        <div className="lx-task-top">
          <span className="lx-task-key">SK-50</span>
          <span className="lx-task-tag" style={cssVars({ "--h": 222 })}>
            backend
          </span>
        </div>
        <p className="lx-task-title">Faktury PDF w panelu klienta</p>
      </div>
      <div className="lx-task">
        <div className="lx-task-top">
          <span className="lx-task-key">SK-53</span>
          <span className="lx-task-tag" style={cssVars({ "--h": 155 })}>
            3 podzadania
          </span>
        </div>
        <p className="lx-task-title">Integracja z InPostem</p>
      </div>
    </div>
  );
}

const SOURCES = [
  { label: "Ręcznie", value: "58 h", share: 46, color: "var(--report-manual)" },
  { label: "Podzadania", value: "30 h", share: 24, color: "var(--report-subtask)" },
  { label: "Commity", value: "23 h", share: 18, color: "var(--report-commit)" },
  { label: "Szacunek", value: "15,5 h", share: 12, color: "var(--report-estimate)" },
];

export function TimePreview() {
  return (
    <div className="lx-pv">
      <p className="lx-pv-head">
        Raport · październik <span>Sklep Kowalski</span>
      </p>
      <p className="lx-pv-total">126,5 h</p>
      <div className="lx-pv-bar">
        {SOURCES.map((source) => (
          <span key={source.label} style={{ ...cssVars({ "--c": source.color }), width: `${source.share}%` }} />
        ))}
      </div>
      <div className="lx-pv-legend">
        {SOURCES.map((source) => (
          <span key={source.label} style={cssVars({ "--c": source.color })}>
            {source.label} <b>{source.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ClientsPreview() {
  return (
    <div className="lx-pv">
      <div className="lx-client">
        <span className="lx-monogram">KW</span>
        <div>
          <p className="lx-strong">Kowalski Sp. z o.o.</p>
          <p className="lx-faint-s">Anna Kowalska · właścicielka</p>
        </div>
      </div>
      <ul className="lx-list">
        <li>
          <Globe aria-hidden /> kowalski.pl <span data-tone="ok">SSL · 89 dni</span>
        </li>
        <li>
          <Globe aria-hidden /> sklep.kowalski.pl <span data-tone="warn">SSL · 12 dni</span>
        </li>
      </ul>
      <p className="lx-faint-s">2 kontakty · 3 projekty · 14 notatek w historii</p>
    </div>
  );
}

export function VaultPreview() {
  return (
    <div className="lx-pv">
      <p className="lx-pv-head">
        Sejf · Kowalski
        <span className="lx-e2e">
          <Lock aria-hidden /> E2E
        </span>
      </p>
      <ul className="lx-list">
        <li>
          <Globe aria-hidden /> Panel WordPress <span>Strona WWW</span>
        </li>
        <li>
          <Server aria-hidden /> Hosting <span>SSH</span>
        </li>
        <li>
          <Folder aria-hidden /> Serwer plików <span>FTP</span>
        </li>
        <li>
          <Megaphone aria-hidden /> Konto reklamowe
          <span className="inline-flex items-center gap-1">
            <ShieldAlert aria-hidden /> krytyczny
          </span>
        </li>
      </ul>
    </div>
  );
}
