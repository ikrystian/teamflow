import type { Instrumentation } from "next";

/**
 * Monitoring błędów (rozdział 6.5 i 8): Sentry tylko po stronie serwera i tylko gdy ustawiono SENTRY_DSN.
 * Treść żądań, ciasteczka, nagłówki autoryzacji i dane użytkownika nigdy nie trafiają do Sentry.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/node");
  const { scrubEvent } = await import("./lib/monitoring");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    maxBreadcrumbs: 20,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (b) => (b.category === "http" || b.category === "fetch" ? null : b),
  });
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { logger } = await import("./lib/logger");
  logger.error("request.error", { path: request.path.split("?")[0], method: request.method, route: context.routePath, kind: context.routeType, error: err });
  if (!process.env.SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") return;
  const Sentry = await import("@sentry/node");
  Sentry.captureException(err, { tags: { route: context.routePath, kind: context.routeType }, extra: { method: request.method } });
};
