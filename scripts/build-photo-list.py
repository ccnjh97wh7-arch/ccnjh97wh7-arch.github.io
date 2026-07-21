#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "images"
OUTPUT_JS = ROOT / "scripts" / "photos-list.js"
OUTPUT_JSON = ROOT / "scripts" / "photos-list.json"

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"}

image_names = sorted(
    [path.name for path in IMAGES_DIR.iterdir() if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS],
    key=lambda name: name.lower(),
)

js_content = "// Generated photo list for local page loading\nconst photoFileNames = [\n"
for index, name in enumerate(image_names):
    suffix = "," if index < len(image_names) - 1 else ""
    js_content += f'  {json.dumps(name)}{suffix}\n'
js_content += "];\n"

OUTPUT_JS.write_text(js_content, encoding="utf-8")
OUTPUT_JSON.write_text(json.dumps(image_names, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(image_names)} image names to {OUTPUT_JS} and {OUTPUT_JSON}")
