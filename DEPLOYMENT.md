# Deploying to Vercel

This repo ships as **one Vercel project**: the Vite client is built as a static
site, and the entire Express API (`server/src/app.ts`) is wrapped by
`api/index.ts` into a single serverless function. `vercel.json` routes
`/api/*` to that function and everything else to the client's `index.html`
(so client-side routes like `/trips/x/budget` and `/share/slug` work on
refresh/deep-link instead of 404ing).

## 1. Install the Vercel CLI

```bash
npm install -g vercel
```

## 2. Link the project

From the repo root:

```bash
vercel link
```

Follow the prompts to link to (or create) the Vercel project.

## 3. Add environment variables

Add each variable for the `production` (and `preview`, if you want previews
working too) environment:

```bash
vercel env add DATABASE_URL production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

| Variable | Used by | Server-only secret? |
|---|---|---|
| `DATABASE_URL` | server (Prisma) | **Yes — server only** |
| `SUPABASE_URL` | server | Yes — server only |
| `SUPABASE_SERVICE_KEY` | server | **Yes — server only** |
| `OPENAI_API_KEY` | server | **Yes — server only** |
| `VITE_SUPABASE_URL` | client | No — ships in the client bundle |
| `VITE_SUPABASE_ANON_KEY` | client | No — ships in the client bundle (anon/public key) |

**Never** rename `OPENAI_API_KEY`, `SUPABASE_SERVICE_KEY`, or `DATABASE_URL` to
a `VITE_`-prefixed variable. Vite inlines every `VITE_*` variable into the
static JS bundle at build time, so anything with that prefix is downloaded by
every visitor's browser. Only the two `VITE_SUPABASE_*` values above (the
Supabase URL and public anon key, which are designed to be public) are safe
to expose that way.

## 4. Deploy

```bash
vercel --prod
```

This runs the root `vercel-build` script (`npm run vercel-build`), which:

1. Runs `prisma generate` against `server/prisma/schema.prisma` — required
   because the generated client (`server/generated/prisma`) is gitignored
   and does not exist until generated.
2. Builds the client with `vite build` into `client/dist`, which Vercel
   serves as the static output.

The API is bundled separately by Vercel from `api/index.ts` (which imports
the Express app from `server/src/app.ts`, not the local dev listener in
`server/src/index.ts`, so no `app.listen()` runs in the serverless function).

## 5. Run migrations / seed against the production database

Do this locally, pointed at the production `DATABASE_URL` (pull it first so
you don't paste secrets on the command line):

```bash
vercel env pull .env.production.local --environment=production
cd server
npx dotenv -e ../.env.production.local -- npx prisma migrate deploy
# Only if you actually want to (re)seed production data — this touches live rows:
npx dotenv -e ../.env.production.local -- npx prisma db seed
```

`.env*` files are gitignored — do not commit `.env.production.local` or any
file containing real secret values.

## Notes

- `vercel.json` is the config Vercel actually reads. `vercel.ts` is kept only
  as an in-repo typed mirror of that config for reference/documentation — it
  is not consumed by the Vercel CLI or platform, so if you change one, update
  the other by hand.
