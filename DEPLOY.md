# Deploy to Cloudflare Pages

This is a **static site** (HTML, CSS, JS + GSAP CDN). No server runtime required.

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
2. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the repository.
4. Build settings:

   | Setting | Value |
   |---------|-------|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node.js version | 20 (or 22) |

5. Deploy. Every push to `main` rebuilds and publishes.

---

## Option B — CLI deploy (no Git)

```bash
npm install
npm run deploy
```

First run opens a browser to log in to Cloudflare. You can change the project name:

```bash
npx wrangler pages deploy dist --project-name=your-site-name
```

---

## Local preview (production build)

```bash
npm run preview
```

Open `http://localhost:8080`.

---

## Custom domain

Cloudflare Pages → your project → **Custom domains** → add your domain. SSL is automatic.

---

## Environment notes

- **GSAP** loads from jsDelivr CDN (no bundler needed).
- **Fonts** load from Google Fonts CDN.
- No secrets or `.env` required for this project.
