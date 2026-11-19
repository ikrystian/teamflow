/**
 * Ciasteczko ze stanem prawego panelu notatek na komputerze ("1" = otwarty). Czyta je
 * serwerowy layout panelu, żeby panel nie migał po przeładowaniu; zapisuje przeglądarka.
 * Plik bez "use client" — stała musi być dostępna także po stronie serwera.
 */
export const NOTES_PANEL_COOKIE = "notes_panel";
export const NOTES_PANEL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
