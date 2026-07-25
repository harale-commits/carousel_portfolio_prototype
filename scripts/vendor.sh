#!/usr/bin/env bash
# Re-download vendored CDN assets into vendor/ and fonts/.
# Run from repo root when bumping GSAP / Lenis / font versions.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p vendor/gsap vendor/lenis fonts/google-sans-flex

echo "→ GSAP 3.12.7"
curl -fsSL -o vendor/gsap/gsap.min.js "https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js"
curl -fsSL -o vendor/gsap/ScrollTrigger.min.js "https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/ScrollTrigger.min.js"
curl -fsSL -o vendor/gsap/ScrollToPlugin.min.js "https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/ScrollToPlugin.min.js"
curl -fsSL -o vendor/gsap/MotionPathPlugin.min.js "https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/MotionPathPlugin.min.js"
curl -fsSL -o vendor/gsap/CustomEase.min.js "https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/CustomEase.min.js"

echo "→ Lenis 1.1.18"
curl -fsSL -o vendor/lenis/lenis.min.js "https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"
curl -fsSL -o vendor/lenis/lenis.css "https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.css"

echo "→ Google Sans Flex (latin + latin-ext)"
curl -fsSL -o fonts/google-sans-flex/google-sans-flex-latin.woff2 \
  "https://fonts.gstatic.com/s/googlesansflex/v21/t5s6IQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4xyRg2.woff2"
curl -fsSL -o fonts/google-sans-flex/google-sans-flex-latin-ext.woff2 \
  "https://fonts.gstatic.com/s/googlesansflex/v21/t5s6IQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0m7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4xxxg2a2c.woff2"

echo "Vendored assets ready."
