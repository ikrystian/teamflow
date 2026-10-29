"use client";

import { useEffect } from "react";

/**
 * Kolorowe tło, które załamują szklane panele (bez niego szkło wygląda jak zwykły
 * półprzezroczysty prostokąt), oraz refleks światła podążający za kursorem na kartach.
 * Jeden delegowany nasłuch na dokumencie zamiast obsługi w każdej karcie.
 */
export function GlassAtmosphere() {
  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;

    const update = () => {
      frame = 0;
      const card = last?.target instanceof Element ? last.target.closest<HTMLElement>('[data-slot="card"]') : null;
      if (!card || !last) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--glass-x", `${last.clientX - rect.left}px`);
      card.style.setProperty("--glass-y", `${last.clientY - rect.top}px`);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      last = event;
      if (!frame) frame = requestAnimationFrame(update);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="glass-atmosphere" aria-hidden>
      <div className="aura-blob aura-blob--a" />
      <div className="aura-blob aura-blob--b" />
      <div className="aura-blob aura-blob--c" />
    </div>
  );
}
