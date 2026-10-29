import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { DalError } from "@/lib/dal/errors";
import { logger } from "@/lib/logger";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; code?: string };

/**
 * Wspólna obsługa błędów Server Actions. Autoryzacja odbywa się w DAL —
 * każda akcja sama odczytuje sesję i sprawdza uprawnienia (rozdział 6.5).
 */
export async function run<T>(name: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof DalError) return { ok: false, error: error.message, code: error.code };
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Nieprawidłowe dane", code: "VALIDATION" };
    }
    logger.error("action.failed", { action: name, error });
    return { ok: false, error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.", code: "INTERNAL" };
  }
}
