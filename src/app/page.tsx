import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { Automation } from "@/components/landing/automation";
import { Convergence } from "@/components/landing/convergence";
import type { Ctas } from "@/components/landing/cta-links";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingNav } from "@/components/landing/landing-nav";
import { ModuleIndex } from "@/components/landing/module-index";
import { VaultChapter } from "@/components/landing/vault-chapter";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "Nexus — projekty, czas pracy, klienci i sejf dostępów w jednym miejscu" },
  description:
    "Kanban, śledzenie czasu, baza klientów i szyfrowany end-to-end sejf dostępów w jednej aplikacji. Dla agencji i software house’ów.",
  robots: { index: true, follow: true },
};

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  // W trybie jednej firmy konto zakłada się z zaproszenia, więc główne wezwanie to logowanie.
  const ctas: Ctas =
    env.DEPLOYMENT_MODE === "saas"
      ? {
          primary: { href: "/auth/signup", label: "Załóż konto" },
          secondary: { href: "/auth/signin", label: "Zaloguj się" },
          note: "Załóż konto, dodaj pierwszego klienta i przenieś do sejfu hasła z notatnika. Reszta połączy się sama.",
        }
      : {
          primary: { href: "/auth/signin", label: "Zaloguj się" },
          secondary: { href: "/auth/signup", label: "Mam zaproszenie" },
          note: "Zaloguj się do przestrzeni swojej firmy. Nie masz jeszcze konta? Poproś administratora o zaproszenie.",
        };

  return (
    <div className="lx" data-landing>
      <a href="#main" className="lx-skip">
        Przejdź do treści
      </a>
      <LandingNav ctas={ctas} />
      <main id="main">
        <Hero ctas={ctas} />
        <Convergence />
        <ModuleIndex />
        <Automation />
        <VaultChapter />
        <FinalCta ctas={ctas} />
      </main>
      <LandingFooter ctas={ctas} />
      <LandingMotion />
    </div>
  );
}
