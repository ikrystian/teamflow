/**
 * Jedyny punkt dostępu do libsodium (wersja „sumo” z Argon2id).
 * Moduł działa w przeglądarce i w Node (testy, weryfikacja step-up na serwerze).
 * Żadnych własnych algorytmów — tylko prymitywy libsodium i Web Crypto API.
 */
import sodiumModule from "libsodium-wrappers-sumo";

export type Sodium = typeof sodiumModule;

let readyPromise: Promise<Sodium> | null = null;

export function getSodium(): Promise<Sodium> {
  if (!readyPromise) {
    readyPromise = sodiumModule.ready.then(() => sodiumModule);
  }
  return readyPromise;
}

/** Synchroniczny dostęp po wcześniejszym `await getSodium()`. */
export function sodiumSync(): Sodium {
  if (!sodiumModule.crypto_aead_xchacha20poly1305_ietf_encrypt) {
    throw new Error("libsodium nie został zainicjalizowany — wywołaj najpierw getSodium()");
  }
  return sodiumModule;
}

/** Nadpisuje bufor zerami (best effort — GC może trzymać kopie). */
export function wipe(...buffers: (Uint8Array | null | undefined)[]) {
  for (const b of buffers) {
    if (b && b.byteLength) {
      try {
        sodiumModule.memzero(b);
      } catch {
        b.fill(0);
      }
    }
  }
}
