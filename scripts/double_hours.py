#!/usr/bin/env python3
"""
Skrypt ustawiający minimalną wartość godzin (0.5) w tabeli TimeEntry.
Każdy rekord z wartością hours < MIN_HOURS zostanie ustawiony na MIN_HOURS.
Baza danych: prisma/dev.db (SQLite)

Użycie:
    python3 scripts/double_hours.py              # tryb podglądu (dry-run)
    python3 scripts/double_hours.py --execute    # faktyczna modyfikacja bazy

Opcje:
    --execute     Zatwierdź zmiany w bazie (domyślnie: dry-run)
    --limit N     Przetwórz tylko N pierwszych rekordów poniżej minimum (do testów)
    --help        Pokaż tę pomoc
"""

import sqlite3
import argparse
import sys
from pathlib import Path
from datetime import datetime


# ── Konfiguracja ──────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = PROJECT_ROOT / "prisma" / "dev.db"
TABLE = "TimeEntry"
COLUMN = "hours"
MIN_HOURS = 1
# ──────────────────────────────────────────────────────────────────────────────


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=f"Ustawia minimalną wartość '{COLUMN}' ({MIN_HOURS}) w tabeli {TABLE}. "
                    f"Rekordy poniżej minimum są korygowane do {MIN_HOURS}."
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        default=False,
        help="Wykonaj modyfikację bazy. Bez tej flagi skrypt działa w trybie dry-run.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Ogranicz przetwarzanie do N pierwszych rekordów poniżej minimum (do testów).",
    )
    return parser.parse_args()


def fetch_below_minimum(cursor: sqlite3.Cursor, limit: int | None) -> list[tuple]:
    """Pobiera rekordy TimeEntry, w których hours < MIN_HOURS."""
    query = (
        f'SELECT id, "{COLUMN}" FROM "{TABLE}" '
        f'WHERE "{COLUMN}" < ? '
        f'ORDER BY "{COLUMN}" ASC, createdAt'
    )
    if limit is not None:
        query += f" LIMIT {limit}"
    cursor.execute(query, (MIN_HOURS,))
    return cursor.fetchall()


def fetch_stats(cursor: sqlite3.Cursor) -> tuple[int, float, float]:
    """Zwraca (łączna liczba rekordów, min hours, max hours)."""
    cursor.execute(
        f'SELECT COUNT(*), MIN("{COLUMN}"), MAX("{COLUMN}") FROM "{TABLE}"'
    )
    row = cursor.fetchone()
    return row[0], row[1] or 0.0, row[2] or 0.0


def print_preview(entries: list[tuple], total: int, min_val: float, max_val: float) -> None:
    """Wyświetla tabelę rekordów wymagających korekty."""
    print(f"\n📊  Statystyki tabeli ({total} rekordów łącznie):")
    print(f"    Min: {min_val:.4f}  |  Max: {max_val:.4f}  |  Próg minimum: {MIN_HOURS}")

    if not entries:
        print(f"\n✅  Wszystkie rekordy mają hours ≥ {MIN_HOURS}. Brak zmian do wykonania.")
        return

    col_w = max(len(str(r[0])) for r in entries)
    col_w = max(col_w, 36)

    print(f"\n⚠️   Rekordy wymagające korekty ({len(entries)} szt.):\n")
    header = f"{'ID':<{col_w}}  {'Obecna wartość':>16}  {'Nowa wartość':>14}  {'Zmiana':>8}"
    print(header)
    print("─" * len(header))

    for row_id, hours in entries:
        diff = MIN_HOURS - hours
        print(
            f"{str(row_id):<{col_w}}  "
            f"{hours:>16.4f}  "
            f"{MIN_HOURS:>14.4f}  "
            f"{'+' + f'{diff:.4f}':>8}"
        )

    print("─" * len(header))
    print(f"\nLiczba rekordów do zaktualizowania: {len(entries)} / {total}")


def clamp_minimum(dry_run: bool, limit: int | None) -> None:
    if not DB_PATH.exists():
        print(f"❌  Nie znaleziono bazy danych pod ścieżką: {DB_PATH}")
        sys.exit(1)

    print(f"📂  Baza danych : {DB_PATH}")
    print(f"🗃️   Tabela       : {TABLE}")
    print(f"📊  Kolumna      : {COLUMN}")
    print(f"🔒  Minimum      : {MIN_HOURS}")
    print(f"🔁  Tryb         : {'DRY-RUN (bez zmian)' if dry_run else '⚡ WYKONANIE (zapis do bazy)'}")
    if limit:
        print(f"🔢  Limit        : {limit} rekordów")

    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        total, min_val, max_val = fetch_stats(cursor)
        entries = fetch_below_minimum(cursor, limit)

        print_preview(entries, total, min_val, max_val)

        if dry_run:
            print(
                "\n💡 To był tryb dry-run. Uruchom ze flagą --execute, aby zapisać zmiany."
            )
            return

        if not entries:
            return

        # Użyj MAX() w SQL — eleganckie i precyzyjne, bez ryzyka zaokrągleń
        if limit is not None:
            ids = [row[0] for row in entries]
            placeholders = ",".join("?" * len(ids))
            cursor.execute(
                f'UPDATE "{TABLE}" SET "{COLUMN}" = MAX("{COLUMN}", ?) '
                f'WHERE id IN ({placeholders})',
                [MIN_HOURS, *ids],
            )
        else:
            cursor.execute(
                f'UPDATE "{TABLE}" SET "{COLUMN}" = MAX("{COLUMN}", ?) '
                f'WHERE "{COLUMN}" < ?',
                (MIN_HOURS, MIN_HOURS),
            )

        affected = cursor.rowcount
        conn.commit()
        print(f"\n✅  Zaktualizowano {affected} rekordów — wartości poniżej {MIN_HOURS} ustawione na {MIN_HOURS}.")
        print(f"🕐  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    except sqlite3.Error as exc:
        conn.rollback()
        print(f"\n❌  Błąd SQLite: {exc}")
        sys.exit(1)
    finally:
        conn.close()


def main() -> None:
    args = parse_args()
    clamp_minimum(dry_run=not args.execute, limit=args.limit)


if __name__ == "__main__":
    main()
