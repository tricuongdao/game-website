#!/usr/bin/env python3
"""Regenerate the site icons and the navbar audio sting.

The icons are derived from `public/img/logo.png` (the official VALORANT V
logomark), so this script is self-contained - no network access or asset-kit
download required.

The audio is a short synthesised "protocol confirm" UI sting, fully original:
no game audio is reproduced.

Requires Pillow and ffmpeg.

Usage:
    python scripts/make-brand-assets.py
    python scripts/make-brand-assets.py --from-kit path/to/V_Logomark_Red.png
"""
import argparse
import math
import pathlib
import random
import struct
import subprocess
import wave

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
PUB_MARK = PUB / "img" / "logo.png"

NAVY = (15, 25, 35, 255)  # VALORANT brand navy, matches <meta name="theme-color">


def trimmed(path, color=None):
    """Load a mark, crop to its alpha bounding box, optionally recolour it."""
    with Image.open(path) as im:
        im = im.convert("RGBA")
        bbox = im.split()[-1].getbbox()
        if bbox:
            im = im.crop(bbox)
        if color:
            solid = Image.new("RGBA", im.size, color)
            solid.putalpha(im.split()[-1])
            im = solid
        return im


def tile(mark, size, bg, mark_scale):
    canvas = Image.new("RGBA", (size, size), bg)
    m = mark.copy()
    m.thumbnail((int(size * mark_scale), int(size * mark_scale)), Image.LANCZOS)
    canvas.paste(m, ((size - m.width) // 2, (size - m.height) // 2), m)
    return canvas


def make_icons(mark_path):
    print("=== ICONS ===")
    print(f"  source mark: {mark_path}")
    red = trimmed(mark_path)
    white = trimmed(mark_path, color=(255, 255, 255, 255))

    tile(white, 32, NAVY, 0.66).save(PUB / "icon1.png")
    tile(white, 32, NAVY, 0.66).save(PUB / "icon2.png")
    tile(red, 180, NAVY, 0.58).save(PUB / "apple-icon.png")
    tile(red, 256, NAVY, 0.58).save(
        PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )

    for name in ("icon1.png", "icon2.png", "apple-icon.png", "favicon.ico"):
        print(f"  {name:16} {(PUB / name).stat().st_size / 1024:6.1f} KB")


def make_audio():
    """Stacked confirm tones plus a tail noise sweep, ~1.4s and loop-friendly."""
    print("\n=== AUDIO ===")
    sr, dur = 44100, 1.4
    n = int(sr * dur)
    samples = [0.0] * n

    def env(i, start, attack, decay):
        t = i / sr - start
        if t < 0:
            return 0.0
        return t / attack if t < attack else math.exp(-(t - attack) / decay)

    for freq, amp, start, attack, decay in (
        (659.25, 0.34, 0.00, 0.004, 0.16),   # E5
        (987.77, 0.26, 0.045, 0.004, 0.20),  # B5
        (1318.51, 0.16, 0.090, 0.004, 0.26), # E6
        (329.63, 0.20, 0.00, 0.006, 0.30),   # E4 body
    ):
        for i in range(n):
            e = env(i, start, attack, decay)
            if e > 0.0005:
                samples[i] += amp * e * math.sin(2 * math.pi * freq * i / sr)

    random.seed(7)
    for i in range(n):
        t = i / sr
        if t > 0.30:
            samples[i] += 0.05 * math.exp(-(t - 0.30) / 0.55) * (random.random() * 2 - 1)

    peak = max(abs(s) for s in samples) or 1.0
    frames = bytearray()
    for s in samples:
        frames += struct.pack("<h", int(max(-1.0, min(1.0, s / peak * 0.85)) * 32767))

    wav = ROOT / "_sting.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(bytes(frames))

    out = PUB / "audio" / "loop.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-codec:a", "libmp3lame",
         "-b:a", "160k", "-ar", "44100", str(out)],
        capture_output=True, text=True,
    )
    wav.unlink(missing_ok=True)
    if result.returncode == 0:
        print(f"  audio/loop.mp3   {out.stat().st_size / 1024:6.1f} KB  ({dur}s)")
    else:
        raise SystemExit(f"ffmpeg failed: {result.stderr[:300]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--from-kit",
        metavar="PNG",
        help="use a specific logomark file instead of public/img/logo.png",
    )
    parser.add_argument("--skip-audio", action="store_true")
    args = parser.parse_args()

    mark = pathlib.Path(args.from_kit) if args.from_kit else PUB_MARK
    if not mark.exists():
        raise SystemExit(f"mark not found: {mark}")

    make_icons(mark)
    if not args.skip_audio:
        make_audio()
    print("DONE")
