#!/usr/bin/env bash
# Regenerate the bundled fonts. Requires curl.
set -euo pipefail
cd "$(dirname "$0")/fonts"

# Fira Mono (OFL) — Medium + Bold are the only weights used by build.mjs.
for w in Medium Bold; do
  curl -fsSL -o "FiraMono-$w.ttf" \
    "https://github.com/google/fonts/raw/main/ofl/firamono/FiraMono-$w.ttf"
done
curl -fsSL -o OFL.txt \
  "https://github.com/google/fonts/raw/main/ofl/firamono/OFL.txt"

echo "Fonts regenerated."
