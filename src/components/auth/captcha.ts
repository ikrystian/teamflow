"use client";

import { solveChallenge, type CaptchaChallenge } from "@/lib/security/captcha";

/** Rozwiązuje CAPTCHA proof-of-work (bez skryptów firm trzecich). */
export async function solveCaptcha(): Promise<string> {
  const challenge = (await (await fetch("/api/captcha", { cache: "no-store" })).json()) as CaptchaChallenge;
  const solution = await solveChallenge(challenge);
  return JSON.stringify(solution);
}
