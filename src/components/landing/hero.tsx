import { CtaButtons, type Ctas } from "./cta-links";
import { cssVars } from "./css-vars";
import { NexusStar } from "./nexus-star";

/**
 * Logo jako rzeźba ze szkła: wiązka biegnie za matowymi filarami i załamuje się
 * w nich, a koniec nagłówka chowa się za lewym filarem (na szerokich ekranach).
 */
export function Hero({ ctas }: { ctas: Ctas }) {
  return (
    <section data-progress="exit" data-pointer className="lx-hero" aria-labelledby="lx-hero-title">
      <div aria-hidden className="lx-hero-bg" />
      <div aria-hidden className="lx-noise" />

      <div className="lx-container lx-hero-inner">
        <div aria-hidden className="lx-mark-under">
          <span className="lx-ray" />
        </div>
        <div aria-hidden className="lx-mark">
          <span className="lx-beam-axis">
            <span className="lx-beam" />
          </span>
          <span className="lx-pillar lx-pillar--l" />
          <span className="lx-pillar lx-pillar--r" />
          <span className="lx-star">
            <NexusStar />
          </span>
        </div>

        <p className="lx-dict lx-rise-in" style={cssVars({ "--i": -3 })}>
          <span className="lx-dict-word">nexus</span>
          <span className="lx-dict-meta">/ˈnɛk.sus/ · łac.</span>
          <span className="lx-dict-def">węzeł, więź; punkt, w którym wszystko się spotyka</span>
        </p>

        <h1 id="lx-hero-title" className="lx-display lx-hero-title">
          <span className="lx-line">
            <span style={cssVars({ "--i": 0 })}>Wszystko</span>
          </span>
          <span className="lx-line">
            <span style={cssVars({ "--i": 1 })}>
              <em>się</em> łączy.
            </span>
          </span>
          <span className="sr-only"> Projekty, czas pracy, klienci i sejf dostępów w jednej aplikacji.</span>
        </h1>

        <div className="lx-hero-foot">
          <div className="lx-rise-in" style={cssVars({ "--i": 1 })}>
            <p className="lx-lead">
              Projekty, czas pracy, klienci i ich dostępy — w jednej aplikacji, pod jednym logowaniem. Dla agencji
              i software house’ów, które mają dość szukania hasła do FTP w mailu sprzed trzech lat.
            </p>
            <CtaButtons ctas={ctas} className="mt-8" />
            <p className="lx-trust">Szyfrowanie end-to-end · 2FA i passkeys · logowanie Google i Microsoft</p>
          </div>
          <a href="#produkt" className="lx-scrollcue lx-rise-in" style={cssVars({ "--i": 4 })}>
            Przewiń
            <span aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
