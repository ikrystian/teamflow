import { getKeyBundle } from "@/lib/dal/account";
import { UnauthorizedError } from "@/lib/dal/errors";
import { handle } from "@/lib/dal/http";
import { getAuthState } from "@/lib/dal/session";

/** Zaszyfrowane klucze użytkownika do odblokowania sejfu w przeglądarce. */
export async function GET() {
  return handle("vault.bundle", async () => {
    const state = await getAuthState();
    if (!state || state.needsMfa) throw new UnauthorizedError();
    const bundle = await getKeyBundle(state.user.id);
    if (!bundle) throw new UnauthorizedError("Sejf nie jest skonfigurowany");
    return { ...bundle, name: state.user.name, email: state.user.email, preferences: state.user.preferences };
  });
}
