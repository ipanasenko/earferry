#!/usr/bin/env bash
# Regenerates the PWA icon set from public/favicon.svg.
# Requires rsvg-convert (brew install librsvg).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/public/favicon.svg"
out="$root/public"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

logo="$(sed -e '1d' -e '$d' "$src")"

# Full-bleed icon: logo on white, keeping the artwork's own padding.
cat > "$tmp/icon.svg" <<SVG
<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" fill="#ffffff" />
$logo
</svg>
SVG

# Maskable icon: logo scaled into the inner 70% safe zone so launchers can crop it.
cat > "$tmp/maskable.svg" <<SVG
<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" fill="#ffffff" />
  <g transform="translate(18 18) scale(0.7)">
$logo
  </g>
</svg>
SVG

rsvg-convert -w 192 -h 192 "$tmp/icon.svg" -o "$out/icon-192.png"
rsvg-convert -w 512 -h 512 "$tmp/icon.svg" -o "$out/icon-512.png"
rsvg-convert -w 180 -h 180 "$tmp/icon.svg" -o "$out/apple-touch-icon.png"
rsvg-convert -w 512 -h 512 "$tmp/maskable.svg" -o "$out/icon-maskable-512.png"

echo "Icons written to $out"
