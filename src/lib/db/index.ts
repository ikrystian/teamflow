import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __nexusPgSql?: postgres.Sql };

const client =
  globalForDb.__nexusPgSql ??
  postgres(env.POSTGRES_URL, {
    max: 10,
    ssl: env.POSTGRES_SSL === "require" ? "require" : false,
    // Zapytania nie trafiają do logów — mogą zawierać szyfrogramy i metadane.
    debug: false,
    onnotice: () => {},
  });

if (env.NODE_ENV !== "production") globalForDb.__nexusPgSql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
export const sqlClient = client;
