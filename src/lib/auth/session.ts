import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";
import type { AppSession } from "./types";

export type { AppSession };

/**
 * Bieżąca sesja Better Auth dla modułu projektów (zastępuje `getServerSession` z NextAuth).
 * Sesja konta z włączonym TOTP, która nie przeszła drugiego składnika (np. logowanie Google),
 * nie jest uznawana — tak samo jak w warstwie danych modułu klientów.
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const mfaVerified = Boolean((s.session as { mfaVerified?: boolean }).mfaVerified);
  if (s.user.twoFactorEnabled && !mfaVerified) return null;
  return {
    user: {
      id: s.user.id,
      name: s.user.name || null,
      email: s.user.email,
      image: s.user.image ?? null,
      role: (s.user as { role?: string }).role ?? "user",
    },
  };
});
