"use client";

import { useEffect } from "react";

/**
 * Jedyny skrypt ruchu strony startowej. Sekcje zostają komponentami serwerowymi,
 * a zachowania dopinamy po atrybutach:
 * - [data-nav] dostaje data-scrolled po zjechaniu z samej góry,
 * - [data-reveal] dostaje data-shown, gdy pierwszy raz wjedzie w kadr,
 * - [data-progress] dostaje --p, postęp przewijania sekcji 0…1: "sticky" — czas
 *   przyklejenia sceny, "exit" — wyjazd sekcji z ekranu, "view" — cały przejazd,
 * - [data-pointer] dostaje --mx/--my, wygładzoną pozycję kursora w zakresie -1…1.
 * Przy prefers-reduced-motion zostaje tylko stan nawigacji — CSS pokazuje stany końcowe.
 */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing]");
    if (!root) return;
    const nav = root.querySelector<HTMLElement>("[data-nav]");
    const cleanups: Array<() => void> = [];
    const listen = <K extends keyof WindowEventMap>(type: K, handler: (event: WindowEventMap[K]) => void) => {
      window.addEventListener(type, handler, { passive: true });
      cleanups.push(() => window.removeEventListener(type, handler));
    };

    const syncNav = () => nav?.toggleAttribute("data-scrolled", window.scrollY > 24);
    syncNav();
    listen("scroll", syncNav);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Elementy, które już są w kadrze, nie znikają na moment po hydratacji.
      const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
      for (const element of reveals) {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) element.setAttribute("data-shown", "");
      }
      root.setAttribute("data-motion", "on");
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.setAttribute("data-shown", "");
            observer.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      for (const element of reveals) if (!element.hasAttribute("data-shown")) observer.observe(element);
      cleanups.push(() => observer.disconnect());

      const tracks = Array.from(root.querySelectorAll<HTMLElement>("[data-progress]"));
      let frame = 0;
      const measure = () => {
        frame = 0;
        const viewport = window.innerHeight;
        for (const element of tracks) {
          const rect = element.getBoundingClientRect();
          if (rect.bottom < -viewport || rect.top > viewport * 2) continue;
          const mode = element.dataset.progress;
          const raw =
            mode === "sticky"
              ? -rect.top / Math.max(1, rect.height - viewport)
              : mode === "exit"
                ? -rect.top / Math.max(1, rect.height)
                : (viewport - rect.top) / (viewport + rect.height);
          element.style.setProperty("--p", Math.min(1, Math.max(0, raw)).toFixed(4));
        }
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(measure);
      };
      measure();
      listen("scroll", schedule);
      listen("resize", schedule);
      cleanups.push(() => cancelAnimationFrame(frame));

      const pointerTargets = Array.from(root.querySelectorAll<HTMLElement>("[data-pointer]"));
      if (pointerTargets.length && window.matchMedia("(pointer: fine)").matches) {
        let targetX = 0;
        let targetY = 0;
        let x = 0;
        let y = 0;
        let pointerFrame = 0;
        const follow = () => {
          x += (targetX - x) * 0.06;
          y += (targetY - y) * 0.06;
          for (const element of pointerTargets) {
            element.style.setProperty("--mx", x.toFixed(3));
            element.style.setProperty("--my", y.toFixed(3));
          }
          pointerFrame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.002 ? requestAnimationFrame(follow) : 0;
        };
        listen("pointermove", (event) => {
          // Scena z kursorem jest na górze strony — niżej nie ma czego przesuwać.
          if (window.scrollY > window.innerHeight * 1.2) return;
          targetX = (event.clientX / window.innerWidth) * 2 - 1;
          targetY = (event.clientY / window.innerHeight) * 2 - 1;
          if (!pointerFrame) pointerFrame = requestAnimationFrame(follow);
        });
        cleanups.push(() => cancelAnimationFrame(pointerFrame));
      }
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}
