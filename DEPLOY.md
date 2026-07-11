# Deploy to Cloudflare

This is a **static site** (HTML, CSS, JS + GSAP CDN). It deploys as a **Worker with static assets** from `dist/`.

## What gets published

The `npm run build` script copies only production files into `dist/`:

- `index.html`
- `css/`
- `js/`
- `_headers` (cache + security headers)

Tests, Playwright, and dev config stay out of the deploy bundle.

---

## Option A — Git deploy (recommended)

1. Push this repo to GitHub/GitLab.
2. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → connect the repo (or open the existing project).
3. Build settings:

   | Setting | Value |
   |---------|-------|
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Non-production branch deploy command | `npx wrangler deploy` |
   | Path | `/` |
   | Node.js version | 20 (or 22) |

4. Save and retry the deployment.

**Do not use** `wrangler pages deploy` here. Cloudflare’s Git build token is scoped for **Workers**, so Pages deploy returns `Authentication error [code: 10000]`.

---

## Option B — CLI deploy (from your machine)

```bash
npm install
npx wrangler login
npm run deploy
```

---

## Local preview (production build)

```bash
npm run preview
```

Open `http://localhost:8080`.

---

## Custom domain

Workers & Pages → your project → **Custom domains** → add your domain. SSL is automatic.

---

## Troubleshooting

### Authentication error `[code: 10000]` with `wrangler pages deploy`

Your Git build injects a Workers API token. That token **cannot** call the Pages API.

Fix:

1. Use deploy command: `npx wrangler deploy`
2. Keep `wrangler.toml` with `[assets] directory = "./dist"` (not `pages_build_output_dir`)
3. Retry the deployment

Free trial / free plan is fine for this static site — this error is permissions, not billing.

### If you previously created a Pages project named `carousel-portfolio`

After switching to Workers Assets, the first successful `wrangler deploy` creates/updates a **Worker** named `carousel-portfolio`. If an old Pages project with the same name conflicts, rename one of them in the dashboard, or pick a new `name` in `wrangler.toml`.

---

## Environment notes

- **GSAP** loads from jsDelivr CDN (no bundler needed).
- **Fonts** load from Google Fonts CDN.
- No secrets or `.env` required for this project.
