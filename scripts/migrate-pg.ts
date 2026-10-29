/* Migracje bazy PostgreSQL modułu klientów i sejfu (Drizzle): bun run db:pg:migrate */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const url = process.env.POSTGRES_MIGRATION_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("Brak POSTGRES_URL / POSTGRES_MIGRATION_URL");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "./src/lib/db/migrations" });
  await client.end();
  console.log("Migracje zastosowane.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
