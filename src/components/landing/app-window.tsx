import {
  Bell,
  Check,
  Clock3,
  Folder,
  FolderKanban,
  GitBranch,
  Globe,
  KeyRound,
  LayoutGrid,
  Lock,
  Search,
  Server,
  Square,
  Users,
} from "lucide-react";
import { NexusLogo } from "@/components/ui/nexus-logo";
import { cssVars } from "./css-vars";

type Task = {
  key: string;
  title: string;
  who: string;
  hue: number;
  tag?: string;
  meta?: string;
  commits?: number;
  live?: boolean;
  done?: boolean;
};

const COLUMNS: { name: string; tasks: Task[] }[] = [
  {
    name: "Do zrobienia",
    tasks: [
      { key: "SK-51", title: "Newsletter listopadowy", tag: "marketing", hue: 340, meta: "termin jutro", who: "AN" },
      { key: "SK-52", title: "Banery na Black Friday", tag: "grafika", hue: 70, meta: "3 h", who: "MP" },
      { key: "SK-53", title: "Integracja z InPostem", tag: "backend", hue: 222, meta: "8 h", who: "KZ" },
    ],
  },
  {
    name: "W toku",
    tasks: [
      { key: "SK-48", title: "Koszyk na iOS", tag: "frontend", hue: 277, commits: 3, live: true, who: "KZ" },
      { key: "SK-50", title: "Faktury PDF w panelu klienta", tag: "backend", hue: 222, meta: "5 h", who: "TW" },
    ],
  },
  {
    name: "Gotowe",
    tasks: [
      { key: "SK-45", title: "Nowy checkout", done: true, hue: 340, who: "AN" },
      { key: "SK-46", title: "Mapa sklepów", done: true, hue: 70, who: "MP" },
      { key: "SK-44", title: "Cache obrazków", done: true, hue: 155, who: "TW" },
    ],
  },
];

const AVATAR_HUES: Record<string, number> = { AN: 340, KZ: 222, MP: 70, TW: 155 };

function Avatar({ who }: { who: string }) {
  return (
    <span className="lx-av" style={cssVars({ "--h": AVATAR_HUES[who] ?? 277 })}>
      {who}
    </span>
  );
}

function Timer() {
  return (
    <>
      00:42:<span className="lx-tick" />
    </>
  );
}

function VaultList() {
  return (
    <ul className="lx-list">
      <li>
        <Globe aria-hidden /> Panel WordPress <span>••••••</span>
      </li>
      <li>
        <Server aria-hidden /> Hosting · SSH <span>••••••</span>
      </li>
      <li>
        <Folder aria-hidden /> FTP <span>••••••</span>
      </li>
    </ul>
  );
}

/**
 * Makieta Nexusa, która rozkwita z punktu styku. Każdy element ma --i, więc po
 * rozbłysku wchodzą kolejno (patrz .lx-in) — porządek wyznacza kolejność w kodzie.
 */
export function AppWindow() {
  let order = 0;
  const step = () => cssVars({ "--i": order++ });

  return (
    <div
      className="lx-app"
      role="img"
      aria-label="Podgląd Nexusa: tablica projektu Sklep Kowalski, karta klienta z domenami i SSL, wpisy sejfu oraz działający timer"
    >
      <div className="lx-app-bar">
        <span className="lx-app-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="lx-app-crumbs">
          <span className="lx-hide-sm">Projekty</span>
          <span className="lx-hide-sm">/</span>
          <b>Sklep Kowalski</b>
          <span>/</span>
          <span>Tablica</span>
        </span>
        <span className="lx-app-search">
          <Search aria-hidden /> Szukaj… <kbd>⌘K</kbd>
        </span>
        <span className="lx-avatars">
          {["AN", "KZ", "MP"].map((who) => (
            <i key={who} style={cssVars({ "--h": AVATAR_HUES[who] })}>
              {who}
            </i>
          ))}
        </span>
      </div>

      <div className="lx-app-body">
        <div className="lx-app-side">
          <NexusLogo size={24} className="size-6" />
          <span data-active>
            <LayoutGrid aria-hidden />
          </span>
          <span>
            <FolderKanban aria-hidden />
          </span>
          <span>
            <Clock3 aria-hidden />
          </span>
          <span>
            <Users aria-hidden />
          </span>
          <span>
            <KeyRound aria-hidden />
          </span>
          <span>
            <Bell aria-hidden />
          </span>
        </div>

        <div className="lx-app-main">
          <div className="lx-app-head lx-in" style={step()}>
            <div>
              <p className="lx-app-kicker">Kowalski Sp. z o.o.</p>
              <p className="lx-app-title">Sklep Kowalski</p>
            </div>
            <div className="lx-app-tabs">
              <span data-active>Tablica</span>
              <span>Lista</span>
              <span>Raport</span>
            </div>
          </div>

          <div className="lx-board">
            {COLUMNS.map((column) => (
              <div key={column.name} className="lx-col">
                <div className="lx-col-head lx-in" style={step()}>
                  {column.name}
                  <span className="lx-col-count">{column.tasks.length}</span>
                </div>
                {column.tasks.map((task) => (
                  <div
                    key={task.key}
                    className="lx-task lx-in"
                    style={step()}
                    data-live={task.live ? "" : undefined}
                    data-done={task.done ? "" : undefined}
                  >
                    <div className="lx-task-top">
                      <span className="lx-task-key">{task.key}</span>
                      {task.tag ? (
                        <span className="lx-task-tag" style={cssVars({ "--h": task.hue })}>
                          {task.tag}
                        </span>
                      ) : null}
                    </div>
                    <p className="lx-task-title">
                      {task.done ? <Check aria-hidden /> : null}
                      {task.title}
                    </p>
                    <div className="lx-task-meta">
                      {task.live ? (
                        <span className="lx-live">
                          <i className="lx-rec" />
                          <Timer />
                        </span>
                      ) : task.meta ? (
                        <span>{task.meta}</span>
                      ) : null}
                      {task.commits ? (
                        <span>
                          <GitBranch aria-hidden /> {task.commits}
                        </span>
                      ) : null}
                      <Avatar who={task.who} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="lx-app-strip lx-in" style={step()}>
            <div className="lx-timer">
              <i className="lx-rec" />
              <div className="min-w-0">
                <p className="lx-faint-s truncate">SK-48 · Koszyk na iOS</p>
                <p className="lx-timer-num">
                  <Timer />
                </p>
              </div>
              <span className="lx-stop">
                <Square aria-hidden />
              </span>
            </div>
            <VaultList />
          </div>
        </div>

        <div className="lx-app-panel">
          <div className="lx-in" style={step()}>
            <p className="lx-app-kicker">Klient</p>
            <div className="lx-client">
              <span className="lx-monogram">KW</span>
              <div>
                <p className="lx-strong">Kowalski Sp. z o.o.</p>
                <p className="lx-faint-s">klient od 2023 · 3 projekty</p>
              </div>
            </div>
          </div>
          <div className="lx-in" style={step()}>
            <p className="lx-app-kicker">Domeny</p>
            <ul className="lx-list">
              <li>
                <Globe aria-hidden /> kowalski.pl <span data-tone="ok">SSL · 89 dni</span>
              </li>
              <li>
                <Globe aria-hidden /> sklep.kowalski.pl <span data-tone="warn">SSL · 12 dni</span>
              </li>
            </ul>
          </div>
          <div className="lx-in" style={step()}>
            <p className="lx-app-kicker">
              Sejf
              <span className="lx-e2e">
                <Lock aria-hidden /> E2E
              </span>
            </p>
            <VaultList />
          </div>
          <div className="lx-timer lx-in" style={step()}>
            <i className="lx-rec" />
            <div>
              <p className="lx-faint-s">SK-48 · Koszyk na iOS</p>
              <p className="lx-timer-num">
                <Timer />
              </p>
            </div>
            <span className="lx-stop">
              <Square aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
