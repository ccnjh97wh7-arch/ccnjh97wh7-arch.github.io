#!/usr/bin/env python3
"""Fetch the current movie from Pulp Time channel page and write local JSON."""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT / "pulptime-now-showing.json"
CHANNEL_URL = "https://pulptime.com/channel"


def fetch_channel_html() -> str:
    request = Request(
        CHANNEL_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        },
    )
    with urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def extract_titles(html: str) -> tuple[str, str | None]:
    current_patterns = [
        r'\\"current\\":\{.*?\\"title\\":\\"([^\\"]+)\\"',
        r'"current":\{.*?"title":"([^"]+)"',
    ]
    next_patterns = [
        r'\\"next\\":\{.*?\\"title\\":\\"([^\\"]+)\\"',
        r'"next":\{.*?"title":"([^"]+)"',
    ]

    current_title = None
    for pattern in current_patterns:
        match = re.search(pattern, html, flags=re.DOTALL)
        if match:
            current_title = match.group(1).strip()
            break

    if not current_title:
        raise RuntimeError("Could not parse current movie title from channel page.")

    next_title = None
    for pattern in next_patterns:
        match = re.search(pattern, html, flags=re.DOTALL)
        if match:
            next_title = match.group(1).strip()
            break

    return current_title, next_title


def write_output(now_showing: str, up_next: str | None) -> None:
    payload = {
        "channel": "Pulp Time",
        "source": CHANNEL_URL,
        "nowShowing": now_showing,
        "upNext": up_next,
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    try:
        html = fetch_channel_html()
        now_showing, up_next = extract_titles(html)
    except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
        raise SystemExit(f"Failed to update now showing: {exc}")

    write_output(now_showing, up_next)
    print(f"Now showing: {now_showing}")
    if up_next:
        print(f"Up next: {up_next}")
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
