"use client";

import { create } from "zustand";
import { isStepUpError } from "./api";

/**
 * Ponowne potwierdzenie tożsamości (step-up) przed operacjami wrażliwymi.
 * Dialog (components/vault/step-up-dialog.tsx) obsługuje hasło główne lub passkey.
 */
type StepUpState = {
  open: boolean;
  reason: string;
  resolve: (() => void) | null;
  reject: ((e: Error) => void) | null;
  request: (reason: string) => Promise<void>;
  done: () => void;
  cancel: () => void;
};

export const useStepUp = create<StepUpState>((set, get) => ({
  open: false,
  reason: "",
  resolve: null,
  reject: null,
  request: (reason) =>
    new Promise<void>((resolve, reject) => {
      get().reject?.(new Error("Przerwano"));
      set({ open: true, reason, resolve, reject });
    }),
  done: () => {
    get().resolve?.();
    set({ open: false, resolve: null, reject: null });
  },
  cancel: () => {
    get().reject?.(new StepUpCancelled());
    set({ open: false, resolve: null, reject: null });
  },
}));

export class StepUpCancelled extends Error {
  constructor() {
    super("Anulowano potwierdzenie tożsamości");
    this.name = "StepUpCancelled";
  }
}

/** Wykonuje operację; gdy serwer zażąda step-up, pokazuje dialog i ponawia raz. */
export async function withStepUp<T>(reason: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!isStepUpError(e)) throw e;
    await useStepUp.getState().request(reason);
    return fn();
  }
}
