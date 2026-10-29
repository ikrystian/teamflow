import "server-only";
import { notFound } from "next/navigation";
import { NotFoundError } from "./errors";

/** Strony: brak dostępu = 404 (nie zdradzamy istnienia obiektu). */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}
