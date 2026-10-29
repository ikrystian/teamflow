import { redact } from "./logger";

type SentryLikeEvent = {
  request?: { data?: unknown; cookies?: unknown; headers?: Record<string, string>; query_string?: unknown; url?: string };
  user?: unknown;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  breadcrumbs?: unknown[];
};

/** Filtrowanie danych przed wysłaniem do monitoringu: bez treści żądań, ciasteczek i danych użytkownika. */
export function scrubEvent<T extends SentryLikeEvent>(event: T): T {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split("?")[0].split("#")[0];
    if (event.request.headers) {
      const allowed = ["user-agent", "content-type", "accept"];
      event.request.headers = Object.fromEntries(Object.entries(event.request.headers).filter(([k]) => allowed.includes(k.toLowerCase())));
    }
  }
  delete event.user;
  if (event.extra) event.extra = redact(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = redact(event.contexts) as Record<string, unknown>;
  delete event.breadcrumbs;
  return event;
}
