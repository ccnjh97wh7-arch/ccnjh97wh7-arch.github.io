"""Build the slow red-creep animation used by more-images.html."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    value = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def layered_noise(width: int, height: int, seed: int = 1976) -> np.ndarray:
    rng = np.random.default_rng(seed)
    result = np.zeros((height, width), dtype=np.float32)
    weight_total = 0.0

    for cells, weight in ((9, 0.55), (21, 0.28), (47, 0.12), (91, 0.05)):
        small = rng.random((cells, cells), dtype=np.float32)
        noise = Image.fromarray(np.uint8(small * 255), mode="L").resize(
            (width, height), Image.Resampling.BICUBIC
        )
        result += (np.asarray(noise, dtype=np.float32) / 255.0) * weight
        weight_total += weight

    return result / weight_total


def build(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGB").transpose(Image.Transpose.ROTATE_270)
    image.thumbnail((640, 640), Image.Resampling.LANCZOS)
    base = np.asarray(image, dtype=np.float32) / 255.0
    height, width = base.shape[:2]

    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    x = xx / max(width - 1, 1)
    y = yy / max(height - 1, 1)
    noise = layered_noise(width, height)

    # Several uneven fronts enter from the paper edges. Their overlap makes the
    # color feel soaked in rather than laid over the image as a flat tint.
    lower_left = 0.55 * x + 0.73 * (1.0 - y)
    lower_right = 0.58 * (1.0 - x) + 0.88 * (1.0 - y) + 0.22
    upper_right = 0.74 * (1.0 - x) + 0.72 * y + 0.48
    arrival = np.minimum(np.minimum(lower_left, lower_right), upper_right)
    arrival += (noise - 0.5) * 0.34
    arrival = np.clip(arrival / 1.18, 0.0, 1.0)

    vignette = np.sqrt(((x - 0.5) / 0.74) ** 2 + ((y - 0.5) / 0.74) ** 2)
    vignette = np.clip((vignette - 0.52) / 0.48, 0.0, 1.0)

    frames: list[Image.Image] = []
    durations: list[int] = []
    steps = 36

    for index in range(steps):
        t = index / (steps - 1)
        eased = t * t * (3.0 - 2.0 * t)
        soaked = smoothstep(arrival - 0.08, arrival + 0.12, eased)

        # A thin, darker moving edge suggests liquid advancing through paper.
        edge = np.exp(-((arrival - eased) ** 2) / 0.0018) * (0.35 + 0.65 * noise)
        stain = np.clip(0.88 * soaked + 0.35 * edge, 0.0, 1.0)

        red_target = np.empty_like(base)
        luminance = base.mean(axis=2)
        red_target[..., 0] = np.clip(luminance * 0.34 + 0.27, 0.0, 1.0)
        red_target[..., 1] = np.clip(luminance * 0.055 + 0.014, 0.0, 1.0)
        red_target[..., 2] = np.clip(luminance * 0.045 + 0.012, 0.0, 1.0)

        amount = (stain * 0.92)[..., None]
        colored = base * (1.0 - amount) + red_target * amount
        colored *= (1.0 - (0.14 * vignette * (0.35 + 0.65 * soaked)))[..., None]

        frame = Image.fromarray(np.uint8(np.clip(colored, 0.0, 1.0) * 255), mode="RGB")
        frame = frame.filter(ImageFilter.GaussianBlur(radius=0.15))
        frames.append(frame)
        durations.append(135)

    durations[0] = 1300
    durations[-1] = 1700
    destination.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        destination,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=True,
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: make_twain_gif.py INPUT.jpg OUTPUT.gif")
    build(Path(sys.argv[1]), Path(sys.argv[2]))
