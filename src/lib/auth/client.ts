"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({ user: { role: { type: "string", required: false, input: false } } }),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/auth/signin/two-factor";
      },
    }),
    passkeyClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
