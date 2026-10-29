/**
 * Migracja danych nexusa sprzed scalenia z modułem klientów i sejfu:
 *
 *   bun run migrate:legacy            # konta MongoDB → Better Auth (PostgreSQL), członkostwo
 *                                     # i import klientów, jeśli przestrzeń organizacji istnieje
 *   bun run migrate:legacy --purge    # dodatkowo usuwa skróty bcrypt z dokumentów User w MongoDB
 *
 * Operacja jest idempotentna. Konta i tak migrują się same przy pierwszym logowaniu, a klienci
 * przy konfiguracji przestrzeni organizacji — skrypt przyspiesza to dla całej firmy naraz.
 * Uruchamiane z warunkiem „react-server”, żeby moduły server-only dało się zaimportować w Node.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const purge = process.argv.includes("--purge");
  const { and, asc, eq } = await import("drizzle-orm");
  const { db, schema, sqlClient } = await import("../src/lib/db");
  const { asSystem } = await import("../src/lib/dal/tenant");
  const { prisma } = await import("../src/lib/prisma");
  const identity = await import("../src/lib/identity");

  const migrated = await identity.migrateAllLegacyUsers();
  console.log(`Konta przeniesione do Better Auth: ${migrated}`);

  const org = await identity.orgWorkspaceId();
  if (org) {
    // Właściciel przestrzeni zostaje opiekunem klientów, których twórca nie jest członkiem zespołu.
    const [owner] = await asSystem((tx) =>
      tx
        .select({ id: schema.user.id, name: schema.user.name })
        .from(schema.workspaceMembers)
        .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMembers.userId))
        .where(and(eq(schema.workspaceMembers.workspaceId, org), eq(schema.workspaceMembers.role, "owner")))
        .orderBy(asc(schema.workspaceMembers.createdAt))
        .limit(1),
    );
    if (!owner) throw new Error("Przestrzeń organizacji nie ma właściciela");
    const result = await identity.provisionOrganization(org, owner);
    console.log(`Przestrzeń organizacji: nowi członkowie ${result.members}, zaimportowani klienci ${result.imported}, przepięte projekty ${result.relinkedProjects}`);
  } else {
    const pending = (await identity.legacyClients()).length;
    console.log(`Przestrzeń organizacji nie istnieje (tryb single) — ${pending} klientów zaimportuje się przy jej konfiguracji przez administratora (/dashboard/clients).`);
  }

  if (purge) {
    const ids = (await db.select({ id: schema.user.id }).from(schema.user)).map((u) => u.id);
    const res = await prisma.user.updateMany({ where: { id: { in: ids }, password: { not: null } }, data: { password: null } });
    console.log(`Usunięte skróty haseł z MongoDB: ${res.count}`);
  }

  await prisma.$disconnect();
  await sqlClient.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
