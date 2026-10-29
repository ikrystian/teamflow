/** Klient HTTP dla ekranów sejfu (przeglądarka). Odpowiedzi nie są cache'owane. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? `Błąd ${res.status}`, res.status, body?.code);
  return body as T;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

/** Zamienia wynik Server Action na wyjątek (do użycia z withStepUp). */
export async function unwrap<T>(p: Promise<ActionResult<T>>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new ApiError(r.error, r.code === "NOT_FOUND" ? 404 : r.code === "STEP_UP_REQUIRED" ? 403 : 400, r.code);
  return r.data;
}

export const isStepUpError = (e: unknown) => e instanceof ApiError && e.code === "STEP_UP_REQUIRED";
