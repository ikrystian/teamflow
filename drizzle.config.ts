import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url: (process.env.POSTGRES_MIGRATION_URL ?? process.env.POSTGRES_URL)! },
  strict: true,
  verbose: true,
});
