import type { CSSProperties } from "react";

/** Zmienne CSS w atrybucie style — React nie zna typów własnych właściwości. */
export function cssVars(vars: Record<`--${string}`, string | number>): CSSProperties {
  return vars as CSSProperties;
}
