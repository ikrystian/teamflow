"use client";

/**
 * Odblokowanie sejfu passkeyem przez rozszerzenie WebAuthn PRF (rozdział 6.4 — faza kolejna).
 * Działa tylko tam, gdzie przeglądarka i menedżer passkeys obsługują PRF.
 */
import { toBase64Url, fromBase64Url } from "@/lib/crypto/encoding";
import { wrapPrivateKeyWithPrf } from "@/lib/crypto/prf";

type PrfResults = { results?: { first?: ArrayBuffer } };

export function prfSupported() {
  return typeof window !== "undefined" && "PublicKeyCredential" in window;
}

export async function createPrfCredential(userId: string, userName: string, privateKey: Uint8Array, label: string) {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Nexus – odblokowanie sejfu", id: location.hostname },
      user: { id: new TextEncoder().encode(userId), name: userName, displayName: `${userName} (sejf)` },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Anulowano");
  const ext = cred.getClientExtensionResults() as { prf?: { enabled?: boolean } & PrfResults };
  if (!ext.prf?.enabled) throw new Error("Ten passkey lub przeglądarka nie obsługuje rozszerzenia PRF");
  const credentialId = toBase64Url(new Uint8Array(cred.rawId));
  // Część autentykatorów zwraca wynik PRF dopiero przy uwierzytelnieniu.
  const output = ext.prf.results?.first ? new Uint8Array(ext.prf.results.first) : await evaluatePrf(credentialId, toBase64Url(salt));
  return { credentialId, prfSalt: toBase64Url(salt), wrappedPrivateKey: wrapPrivateKeyWithPrf(privateKey, output, userId, credentialId), label };
}

export async function evaluatePrf(credentialId: string, prfSaltB64: string): Promise<Uint8Array> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname,
      allowCredentials: [{ type: "public-key", id: fromBase64Url(credentialId) as BufferSource }],
      userVerification: "required",
      extensions: { prf: { eval: { first: fromBase64Url(prfSaltB64) } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const res = assertion?.getClientExtensionResults() as { prf?: PrfResults } | undefined;
  const first = res?.prf?.results?.first;
  if (!first) throw new Error("Passkey nie zwrócił wyniku PRF");
  return new Uint8Array(first);
}
