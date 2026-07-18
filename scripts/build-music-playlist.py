import json
import os
from pathlib import Path

root = Path(__file__).resolve().parent.parent
music_dir = root / "music"
output_file = root / "music-playlist.json"

tracks = []
for path in sorted(music_dir.glob("*.mp3")):
    name = path.stem
    title = name.replace("-", " ").replace("_", " ").title()
    tracks.append({
        "title": title,
        "note": f"Track from {title}",
        "src": f"music/{path.name}",
    })

output_file.write_text(json.dumps(tracks, indent=2), encoding="utf-8")
print(f"Wrote {len(tracks)} tracks to {output_file}")
