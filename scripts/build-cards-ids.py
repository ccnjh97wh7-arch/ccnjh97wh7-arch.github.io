#!/usr/bin/env python3
"""Generate consistent IDs for cards.json entries.

Usage examples:
  python3 scripts/build-cards-ids.py
  python3 scripts/build-cards-ids.py --write
  python3 scripts/build-cards-ids.py --write --rewrite-existing
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(value))
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return slug or "unknown"


def build_base_id(card: dict) -> str:
    sport = slugify(card.get("sport", "unknown"))
    year = slugify(card.get("year", "unknown"))
    manufacturer = slugify(card.get("manufacturer", "unknown"))
    card_number = slugify(card.get("cardNumber", "unknown"))
    player = slugify(card.get("player", "unknown"))
    return f"{sport}-{year}-{manufacturer}-{card_number}-{player}"


def ensure_unique(base: str, seen: dict[str, int]) -> str:
    seen[base] += 1
    count = seen[base]
    if count == 1:
        return base
    return f"{base}-{count}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate/validate card IDs in cards.json")
    parser.add_argument("--input", default="cards.json", help="Path to cards JSON file")
    parser.add_argument("--write", action="store_true", help="Write changes back to disk")
    parser.add_argument(
        "--rewrite-existing",
        action="store_true",
        help="Rebuild IDs for every card, even if an id already exists",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: {input_path} does not exist.", file=sys.stderr)
        return 1

    try:
        data = json.loads(input_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"Error: invalid JSON in {input_path}: {exc}", file=sys.stderr)
        return 1

    if not isinstance(data, list):
        print("Error: cards JSON must be an array of objects.", file=sys.stderr)
        return 1

    changed = 0
    generated = 0
    seen_ids: defaultdict[str, int] = defaultdict(int)

    for index, entry in enumerate(data):
        if not isinstance(entry, dict):
            print(f"Error: entry {index + 1} is not an object.", file=sys.stderr)
            return 1

        keep_existing = bool(entry.get("id")) and not args.rewrite_existing

        if keep_existing:
            candidate = slugify(entry["id"])
            if candidate != entry["id"]:
                entry["id"] = candidate
                changed += 1
            unique_id = ensure_unique(entry["id"], seen_ids)
            if unique_id != entry["id"]:
                entry["id"] = unique_id
                changed += 1
            continue

        base_id = build_base_id(entry)
        unique_id = ensure_unique(base_id, seen_ids)
        if entry.get("id") != unique_id:
            entry["id"] = unique_id
            changed += 1
        generated += 1

    if args.write:
        input_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        print(f"Updated {input_path} with {changed} ID changes ({generated} generated).")
    else:
        print(f"Dry run complete: {changed} ID changes detected ({generated} generated).")
        print("Run with --write to apply changes.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
