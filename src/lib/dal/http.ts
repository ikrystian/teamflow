import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import { DalError } from "./errors";

const NO_STORE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

/** Route Handlers: każda odpowiedź z danymi sejfu jest nie-cache'owalna. */
export async function handle(name: string, fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? null, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof DalError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: NO_STORE });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Nieprawidłowe dane", code: "VALIDATION" }, { status: 400, headers: NO_STORE });
    }
    logger.error("route.failed", { route: name, error });
    return NextResponse.json({ error: "Wystąpił nieoczekiwany błąd", code: "INTERNAL" }, { status: 500, headers: NO_STORE });
  }
}
