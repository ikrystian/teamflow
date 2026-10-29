import "server-only";
import { generateAuthenticationOptions, verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { and, eq, gt } from "drizzle-orm";
import { verifyAuthKey } from "@/lib/crypto/master";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { hit } from "@/lib/security/rate-limit";
import { recordAudit } from "./audit";
import { ForbiddenError, StepUpRequiredError, UnauthorizedError } from "./errors";
import { getSession } from "./session";

/** Ponowne potwierdzenie tożsamości jest ważne przez 5 minut dla bieżącej sesji. */
export const STEP_UP_TTL_MS = 5 * 60_000;

export async function hasFreshStepUp(sessionId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.stepUps.id })
    .from(schema.stepUps)
    .where(and(eq(schema.stepUps.sessionId, sessionId), gt(schema.stepUps.expiresAt, new Date())))
    .limit(1);
  return Boolean(row);
}

/** Wywoływane przed: eksportem, zmianą ról, usunięciem klienta, odsłonięciem wpisu krytycznego. */
export async function requireStepUp(sessionId: string) {
  if (!(await hasFreshStepUp(sessionId))) throw new StepUpRequiredError();
}

async function currentSession() {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}

async function grant(sessionId: string, userId: string, method: string) {
  await db.insert(schema.stepUps).values({ sessionId, userId, method, expiresAt: new Date(Date.now() + STEP_UP_TTL_MS) });
}

/**
 * Step-up hasłem głównym: przeglądarka wyprowadza klucz uwierzytelniający z hasła głównego
 * (Argon2id + KDF) i wysyła tylko jego; serwer porównuje ze skrótem. Hasło główne nie opuszcza przeglądarki.
 */
export async function stepUpWithMasterKey(authKey: string, workspaceId: string | null) {
  const s = await currentSession();
  const limit = await hit(`stepup:${s.user.id}`, 10, 15 * 60);
  if (!limit.allowed) throw new ForbiddenError("Zbyt wiele prób. Odczekaj kilka minut.");
  const [u] = await db.select({ hash: schema.user.masterAuthHash, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, s.user.id));
  const ok = u?.hash ? await verifyAuthKey(u.hash, authKey) : false;
  await recordAudit({ workspaceId, actorId: s.user.id, actorName: u?.name, action: ok ? "auth.step_up" : "auth.step_up_failed", metadata: { method: "master_password" } });
  if (!ok) throw new ForbiddenError("Nieprawidłowe hasło główne");
  await grant(s.session.id, s.user.id, "master_password");
}

const rpID = new URL(env.APP_URL).hostname;

export async function stepUpPasskeyOptions() {
  const s = await currentSession();
  const passkeys = await db.select().from(schema.passkey).where(eq(schema.passkey.userId, s.user.id));
  if (!passkeys.length) throw new ForbiddenError("Nie masz zarejestrowanego passkeya");
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialID,
      transports: (p.transports?.split(",").filter(Boolean) ?? undefined) as never,
    })),
  });
  await db.insert(schema.webauthnChallenges).values({
    userId: s.user.id,
    sessionId: s.session.id,
    challenge: options.challenge,
    purpose: "step_up",
    expiresAt: new Date(Date.now() + 5 * 60_000),
  });
  return options;
}

export async function stepUpPasskeyVerify(response: AuthenticationResponseJSON, workspaceId: string | null) {
  const s = await currentSession();
  const challenges = await db
    .select()
    .from(schema.webauthnChallenges)
    .where(and(eq(schema.webauthnChallenges.sessionId, s.session.id), eq(schema.webauthnChallenges.purpose, "step_up"), gt(schema.webauthnChallenges.expiresAt, new Date())));
  const [pk] = await db
    .select()
    .from(schema.passkey)
    .where(and(eq(schema.passkey.userId, s.user.id), eq(schema.passkey.credentialID, response.id)));
  if (!pk || !challenges.length) throw new ForbiddenError("Potwierdzenie passkeyem wygasło — spróbuj ponownie");
  let verified = false;
  let newCounter = pk.counter;
  for (const c of challenges) {
    try {
      const v = await verifyAuthenticationResponse({
        response,
        expectedChallenge: c.challenge,
        expectedOrigin: env.APP_URL,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: pk.credentialID,
          publicKey: new Uint8Array(Buffer.from(pk.publicKey, "base64")),
          counter: pk.counter,
        },
      });
      if (v.verified) {
        verified = true;
        newCounter = v.authenticationInfo.newCounter;
        break;
      }
    } catch {
      // próbujemy kolejne wyzwanie
    }
  }
  await db.delete(schema.webauthnChallenges).where(eq(schema.webauthnChallenges.sessionId, s.session.id));
  await recordAudit({ workspaceId, actorId: s.user.id, actorName: s.user.name, action: verified ? "auth.step_up" : "auth.step_up_failed", metadata: { method: "passkey" } });
  if (!verified) throw new ForbiddenError("Nie udało się potwierdzić passkeyem");
  await db.update(schema.passkey).set({ counter: newCounter }).where(eq(schema.passkey.id, pk.id));
  await grant(s.session.id, s.user.id, "passkey");
}
