"use client";

import { useMemo } from "react";
import { authClient } from "./client";
import type { AppSession } from "./types";

type SessionState = { data: AppSession | null; status: "loading" | "authenticated" | "unauthenticated" };

/** Sesja po stronie przeglądarki w kształcie używanym przez moduł projektów (wcześniej NextAuth). */
export function useSession(): SessionState {
  const { data, isPending } = authClient.useSession();
  // Stabilna referencja — komponenty projektów używają `session?.user` w zależnościach efektów.
  return useMemo<SessionState>(() => {
    if (!data) return { data: null, status: isPending ? "loading" : "unauthenticated" };
    const { id, name, email, image, role } = data.user;
    return { data: { user: { id, name: name || null, email, image: image ?? null, role: role ?? "user" } }, status: "authenticated" };
  }, [data, isPending]);
}
