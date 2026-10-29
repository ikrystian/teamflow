import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";

/** Interfejs po polsku, przygotowany na kolejne języki (rozdział 2): dodaj plik messages/<locale>.json i locale w config.ts. */
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    timeZone: "Europe/Warsaw",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
