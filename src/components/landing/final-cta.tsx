import { CtaButtons, type Ctas } from "./cta-links";
import { cssVars } from "./css-vars";

/** Finał: wiązka z logo kładzie się na horyzoncie i rozświetla nagłówek od dołu. */
export function FinalCta({ ctas }: { ctas: Ctas }) {
  return (
    <section id="start" data-progress="view" className="lx-cta" aria-labelledby="lx-cta-title">
      <div className="lx-container">
        <p className="lx-kicker" data-reveal="rise">
          05 — Start
        </p>
        <h2 id="lx-cta-title" className="lx-display lx-cta-title">
          <span className="lx-line">
            <span data-reveal="mask">Czas wszystko</span>
          </span>
          <span className="lx-line">
            <span data-reveal="mask" style={cssVars({ "--i": 1 })}>
              <em>połączyć</em>.
            </span>
          </span>
        </h2>
      </div>

      <div aria-hidden className="lx-horizon">
        <span className="lx-horizon-glow" />
        <span className="lx-horizon-line" />
      </div>

      <div className="lx-container lx-cta-foot" data-reveal="rise">
        <p className="lx-sub mt-0">{ctas.note}</p>
        <CtaButtons ctas={ctas} />
      </div>
    </section>
  );
}
