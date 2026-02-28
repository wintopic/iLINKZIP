# iLINKZIP

iLINKZIP is an open-source dynamic QR, short-link, and live URL platform built with Astro + Hono using **S3-only persistence**.

## Core Features

- Magic-link authentication via Resend
- Short links and live links (`/r/:slug`) with editable destination
- Dynamic QR endpoint (`/q/:slug.svg`) that stays stable while target changes
- Basic analytics: total clicks, 7-day trend, country/device distribution
- Anti-abuse baseline: Turnstile + daily rate limiting
- Deploy-ready for Vercel and Cloudflare Pages from one repository

## Tech Stack

- Frontend: Astro
- API: Hono
- Persistence: AWS S3 only
- Email: Resend
- Captcha: Cloudflare Turnstile

## API (v1)

- `POST /api/v1/auth/request-magic-link`
- `GET /api/v1/auth/callback?token=...`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/links`
- `POST /api/v1/links`
- `GET /api/v1/links/:id`
- `PATCH /api/v1/links/:id`
- `DELETE /api/v1/links/:id`
- `GET /api/v1/links/:id/stats?range=7d`
- `GET /r/:slug` (rewritten to `/api/v1/r/:slug`)
- `GET /q/:slug.svg` (rewritten to `/api/v1/q/:slug.svg`)

## S3 Data Model

- `users/by-email/{sha256(email)}.json -> { userId }`
- `users/{userId}.json`
- `auth/magic/{tokenHash}.json`
- `links/{linkId}.json`
- `slug/{slug}.json -> { linkId, ownerId, status }`
- `owner/{ownerId}/links/{linkId}.json`
- `stats/{linkId}/{yyyy-mm-dd}.json`
- `ratelimit/{yyyy-mm-dd}/{scope}/{sha256(identifier)}.json`

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:4321`.

If S3 credentials are missing, the app uses in-memory storage for local development.

## Environment Variables

- `APP_BASE_URL`
- `SESSION_SECRET`
- `MAGIC_LINK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Deploy

### Vercel (Deploy Button)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwintopic%2FiLINKZIP)

Notes:
- `vercel.json` rewrites `/r/*` and `/q/*.svg`
- API entry: `api/[[route]].ts`

### Cloudflare Pages (Pure Pages Workflow)

1. Open: https://dash.cloudflare.com/?to=/:account/pages/new
2. Import `wintopic/iLINKZIP`
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Functions directory is `functions/`
5. Set the same environment variables as above

Notes:
- `public/_redirects` rewrites `/r/*` and `/q/*`
- API entry: `functions/api/[[route]].ts`

## Quality Checks

```bash
npm run check
npm test
npm run build
```

## Open Source Docs

- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- License: `LICENSE`

## License

MIT
