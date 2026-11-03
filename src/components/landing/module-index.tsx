"use client";

import { useEffect, useRef, useState } from "react";
import { cssVars } from "./css-vars";
import { ClientsPreview, ProjectsPreview, TimePreview, VaultPreview } from "./module-previews";

const MODULES = [
  {
    title: "Projekty",
    lead: "Tablice kanban, zadania z podzadaniami, komentarze i załączniki. Archiwum zamiast kasowania, a dla klienta — publiczny link do zadania.",
    tags: ["Kanban", "Podzadania", "Komentarze", "Załączniki", "Udostępnianie"],
    Preview: ProjectsPreview,
  },
  {
    title: "Czas pracy",
    lead: "Timer jednym kliknięciem, godziny z podzadań i commitów, raporty z podziałem na źródła — takie, które obronisz przed każdym klientem.",
    tags: ["Timer", "Raporty", "Źródła godzin", "Szacunki"],
    Preview: TimePreview,
  },
  {
    title: "Klienci",
    lead: "Karta klienta z kontaktami, domenami i terminami SSL, notatkami, historią i wszystkimi jego projektami w jednym widoku.",
    tags: ["Kontakty", "Domeny i SSL", "Notatki", "Historia"],
    Preview: ClientsPreview,
  },
  {
    title: "Sejf dostępów",
    lead: "Dwanaście typów dostępów — od hostingu po konta reklamowe — szyfrowanych w przeglądarce. Historia wersji, linki jednorazowe i kondycja haseł.",
    tags: ["12 typów", "Historia wersji", "Linki jednorazowe", "Kondycja haseł"],
    Preview: VaultPreview,
  },
];

/**
 * Indeks modułów jako spis treści magazynu. Na desktopie za kursorem płynie
 * szklany podgląd aktywnego modułu (z opóźnieniem i przechyłem od prędkości);
 * na ekranach dotykowych podgląd stoi w wierszu.
 */
export function ModuleIndex() {
  const [active, setActive] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const float = floatRef.current;
    if (!list || !float) return;

    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let frame = 0;
    let placed = false;

    const tick = () => {
      const dx = targetX - x;
      const dy = targetY - y;
      x += dx * 0.14;
      y += dy * 0.14;
      const tilt = Math.max(-9, Math.min(9, dx * 0.05));
      float.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
      frame = Math.abs(dx) + Math.abs(dy) > 0.4 ? requestAnimationFrame(tick) : 0;
    };

    // Bez bramki matchMedia przy montowaniu: tablet z gładzikiem zmienia sposób
    // wskazywania w locie. Widoczność podglądu i tak rozstrzyga CSS (hover + pointer: fine).
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = list.getBoundingClientRect();
      // Podgląd siedzi na prawo od kursora i nie wyjeżdża poza listę.
      targetX = Math.min(event.clientX - rect.left + 32, rect.width - float.offsetWidth);
      targetY = event.clientY - rect.top - 110;
      if (!placed) {
        x = targetX;
        y = targetY;
        placed = true;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      placed = false;
    };

    list.addEventListener("pointermove", onMove);
    list.addEventListener("pointerleave", onLeave);
    return () => {
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section id="moduly" className="lx-section" aria-labelledby="lx-modules-title">
      <div className="lx-container">
        <div className="lx-index-head">
          <div data-reveal="rise">
            <p className="lx-kicker">02 — Moduły</p>
            <h2 id="lx-modules-title" className="lx-display lx-h2">
              Cztery moduły. <em>Jedno</em> logowanie.
            </h2>
          </div>
          <p className="lx-sub lg:mb-2" data-reveal="rise" style={cssVars({ "--i": 1 })}>
            Każdy działa sam, ale prawdziwa wartość jest w połączeniach: zadanie zna klienta, klient zna swoje dostępy,
            a godziny same trafiają do raportu.
          </p>
        </div>

        <div ref={listRef} className="lx-index-list" onPointerLeave={() => setActive(null)}>
          <ol>
            {MODULES.map((module, index) => (
              <li
                key={module.title}
                className="lx-index-row"
                data-reveal="rise"
                style={cssVars({ "--i": index })}
                onPointerEnter={() => setActive(index)}
              >
                <span className="lx-index-num">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="lx-display lx-index-title">
                  <span className="lx-swap">
                    <span>{module.title}</span>
                    <span aria-hidden>{module.title}</span>
                  </span>
                </h3>
                <div className="lx-index-body">
                  <p>{module.lead}</p>
                  <ul className="lx-tags" aria-label="Funkcje">
                    {module.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
                <div aria-hidden className="lx-index-inline lx-glass rounded-[1.25rem] p-4">
                  <module.Preview />
                </div>
              </li>
            ))}
          </ol>

          <div ref={floatRef} aria-hidden className="lx-float">
            {MODULES.map((module, index) => (
              <div key={module.title} className="lx-preview lx-glass" data-active={active === index ? "" : undefined}>
                <module.Preview />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
