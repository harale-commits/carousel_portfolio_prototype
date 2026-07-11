# Testing on Ubuntu

This project uses **Playwright** for automated visual and interaction testing across desktop, tablet, and mobile viewports.

## Setup (one time)

```bash
cd /home/haralecommits/Documents/personal_projects/content_portfolio/carousel
npm install
npx playwright install chromium
```

`playwright install` downloads Chromium (~150MB). On Ubuntu you may also need system deps:

```bash
npx playwright install-deps chromium
```

## Run tests

```bash
# Headless — all viewports
npm test

# Interactive UI mode (best for tweaking design细节)
npm run test:ui

# See the browser while tests run
npm run test:headed

# View HTML report after a run
npm run test:report
```

## What gets tested

| Test | Checks |
|------|--------|
| Page load | Title, 6 cards, 1 active |
| Scroll | Active card changes on wheel |
| Desktop hover | Services satellites appear on active card |
| Mobile tap | Orbit toggles open/closed |
| Arc tracks | SVG rails render |

## Manual design testing (Ubuntu)

| Tool | Use for |
|------|---------|
| **Playwright UI** (`npm run test:ui`) | Step through tests, inspect at each breakpoint |
| **Firefox/Chrome DevTools** | F12 → device toolbar, throttle CPU/network |
| **Cursor browser preview** | Live reload while editing CSS |
| `python3 -m http.server 8080` | Local static server |

## Tips for pixel-perfect polish

1. Run `npm run test:ui` at **1280px**, **768px**, and **390px** widths
2. Screenshot compare: add `await expect(page).toHaveScreenshot()` once baseline is set
3. Test scroll + hover together — orbit should follow the active card
4. Check `prefers-reduced-motion` in DevTools rendering tab

## CI (optional)

```bash
CI=1 npm test
```
