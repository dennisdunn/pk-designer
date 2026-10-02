#!/bin/sh
# Render the app icons in public/ from their SVG sources. Needs rsvg-convert (brew install librsvg).
# public/favicon.svg is both the favicon and the source of the plain icons; icons/maskable.svg is
# the same mark, full bleed and inside the safe zone, for maskable and Apple touch icons.
set -e
cd "$(dirname "$0")/.."
rsvg-convert -w 192 -h 192 public/favicon.svg -o public/pwa-192.png
rsvg-convert -w 512 -h 512 public/favicon.svg -o public/pwa-512.png
rsvg-convert -w 512 -h 512 icons/maskable.svg -o public/maskable-512.png
rsvg-convert -w 180 -h 180 icons/maskable.svg -o public/apple-touch-icon.png
