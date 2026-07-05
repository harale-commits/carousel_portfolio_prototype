#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST/css" "$DIST/js"

cp "$ROOT/index.html" "$DIST/"
cp -r "$ROOT/css/." "$DIST/css/"
cp -r "$ROOT/js/." "$DIST/js/"

if [ -f "$ROOT/_headers" ]; then
  cp "$ROOT/_headers" "$DIST/_headers"
fi

echo "Built static site → dist/"
