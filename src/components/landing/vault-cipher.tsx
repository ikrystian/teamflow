"use client";

import { Globe, Lock, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "plain" | "cipher";

/* Szyfrogramy są stałe (base64 o długości zbliżonej do realnych), żeby render
   serwerowy i kliencki dały ten sam tekst. Losowe są tylko klatki animacji. */
const FIELDS = [
  { label: "Nazwa", plain: "Panel WordPress", cipher: "9xQ2+Lm0vTe7Rk4wP1=" },
  { label: "Adres", plain: "kowalski.pl/wp-admin", cipher: "Hc3/Zp8NqW1yBf6sLu0dKa==" },
  { label: "Login", plain: "admin@kowalski.pl", cipher: "pV7nE2kXc9+aJ4tQmRw6Yz==" },
  { label: "Hasło", plain: "fP9#wQ2!zL7@kX", cipher: "Zt0/gN5uYq8Kd3Wp1Ea7Ho=" },
  { label: "Notatka", plain: "2FA: kod w aplikacji u Ani", cipher: "sW4+oB9eFh2LxT7cVn0qMa3Ri8Jd5Ug=" },
];

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

/**
 * Wpis sejfu w dwóch widokach: to, co widzisz Ty (po odszyfrowaniu w przeglądarce),
 * i to, co widzi serwer. Po wjechaniu w kadr wpis sam się odszyfrowuje; przełącznik
 * pozwala wrócić do szyfrogramu. Znaki podmieniamy bezpośrednio w DOM, żeby animacja
 * nie przechodziła przez render Reacta.
 */
export function VaultCipher() {
  const [mode, setMode] = useState<Mode>("cipher");
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const frameRef = useRef(0);
  const touchedRef = useRef(false);

  const transitionTo = useCallback((next: Mode) => {
    setMode(next);
    cancelAnimationFrame(frameRef.current);
    const nodes = valueRefs.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      FIELDS.forEach((field, i) => {
        const node = nodes[i];
        if (node) node.textContent = field[next];
      });
      return;
    }

    const from = FIELDS.map((_, i) => nodes[i]?.textContent ?? "");
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      let running = false;
      FIELDS.forEach((field, i) => {
        const node = nodes[i];
        if (!node) return;
        const target = field[next];
        const length = Math.max(target.length, from[i].length);
        const offset = i * 110; // pola ruszają kaskadą, od nazwy do notatki
        let text = "";
        for (let j = 0; j < length; j++) {
          const settleAt = offset + 260 + (j / length) * 640;
          if (elapsed >= settleAt) {
            text += target[j] ?? "";
          } else if (elapsed >= offset + (j / length) * 220) {
            text += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            running = true;
          } else {
            text += from[i][j] ?? "";
            running = true;
          }
        }
        node.textContent = text;
      });
      if (running) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        timer = window.setTimeout(() => {
          if (!touchedRef.current) transitionTo("plain");
        }, 450);
      },
      { threshold: 0.6 },
    );
    observer.observe(card);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frameRef.current);
    };
  }, [transitionTo]);

  const choose = (next: Mode) => {
    touchedRef.current = true;
    if (next !== mode) transitionTo(next);
  };

  const [title, ...fields] = FIELDS;

  return (
    <div ref={cardRef} className="lx-vcard" data-mode={mode}>
      <div className="lx-vcard-head">
        <div role="group" aria-label="Widok wpisu" className="lx-seg" data-mode={mode}>
          <span aria-hidden className="lx-seg-thumb" />
          <button type="button" aria-pressed={mode === "plain"} onClick={() => choose("plain")}>
            Ty widzisz
          </button>
          <button type="button" aria-pressed={mode === "cipher"} onClick={() => choose("cipher")}>
            Serwer widzi
          </button>
        </div>
        <span className="lx-e2e">
          <Lock aria-hidden /> E2E
        </span>
      </div>

      <div className="lx-vtitle">
        <Globe aria-hidden />
        <div className="min-w-0">
          <p className="lx-vname lx-mono">
            <span
              aria-hidden
              ref={(node) => {
                valueRefs.current[0] = node;
              }}
            >
              {title.cipher}
            </span>
            <span className="sr-only">{mode === "plain" ? title.plain : "zaszyfrowane"}</span>
          </p>
          <p className="lx-faint-s">Strona WWW · wersja 4 · zmieniono 12 dni temu</p>
        </div>
      </div>

      <dl className="lx-vfields">
        {fields.map((field, index) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>
              <span
                aria-hidden
                className="lx-vval"
                ref={(node) => {
                  valueRefs.current[index + 1] = node;
                }}
              >
                {field.cipher}
              </span>
              <span className="sr-only">{mode === "plain" ? field.plain : "zaszyfrowane"}</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="lx-vstatus" aria-live="polite">
        {mode === "plain" ? (
          <>
            <ShieldCheck aria-hidden />
            Odszyfrowane w Twojej przeglądarce. Klucz nie opuścił urządzenia.
          </>
        ) : (
          <>
            <Lock aria-hidden />
            XChaCha20-Poly1305, 24-bajtowy nonce. Tylko tyle widzi serwer — i każdy, kto by się do niego dobrał.
          </>
        )}
      </p>
    </div>
  );
}
