# MultiPlatformPoster

A production-oriented, responsive Next.js admin dashboard for phased social media post scheduling.

## What is included

- Next.js App Router with Tailwind CSS
- Supabase schema and RLS policy skeleton under `supabase/migrations`
- Responsive admin dashboard shell for mobile, tablet, and laptop
- Clean platform adapter interfaces for Meta, LinkedIn, TikTok, and X
- Real Facebook Page feed and image publishing adapter plus mock adapters for remaining platforms
- n8n webhook client utilities
- CI workflow for lint, typecheck, and build
- Initial documentation for n8n workflow setup, production checklist, cost estimate, and roadmap

## Current repository structure

- `app/` — dashboard and page routes
- `components/` — reusable UI shell and form components
- `lib/` — Supabase, scheduler, n8n, and platform adapter abstractions
- `supabase/migrations/` — SQL schema and RLS policies
- `docs/` — workflow, checklist, cost estimate, and roadmap artifacts
- `.github/workflows/ci.yml` — GitHub Actions CI

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

Copy `.env.example` and set the following values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `WEBHOOK_RATE_LIMIT_PER_MINUTE`
- `NEXT_PUBLIC_APP_URL`
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `META_GRAPH_API_VERSION`

## Supabase schema

The initial schema is defined in `supabase/migrations/20260525_initial_schema.sql`.

## n8n walkthrough

See `docs/n8n-workflows.md` for the workflow map, payload example, and security notes. For direct server-side testing, use the scheduled post form's **Publish now** action or call `POST /api/posts/{id}/publish` after setting the Facebook environment variables.

## Production checklist

See `docs/production-checklist.md`.

## Cost estimate

See `docs/cost-estimate.md`.

## Roadmap

See `docs/roadmap.md`.

## Phase notes

- Phase 1: Supabase, n8n, RLS, and webhook orchestration hooks
- Phase 2: Responsive admin UI and Vercel deployment
- Phase 3: Replace critical n8n workflow pieces with serverless code while preserving adapter interfaces

## Important implementation note

Facebook Page publishing is wired through the server-side Meta adapter. Set `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_ACCESS_TOKEN` with a Page access token that has Page publishing permissions. Text-only posts use the Page feed endpoint; posts with an attached Supabase image use the Page photos endpoint. The publish route downloads the private Supabase Storage object on the server and uploads the binary image to Meta, so the `media` bucket can remain private.

To test the Supabase-to-Facebook image flow:

1. Sign in to the app and open **Scheduled posts → Create scheduled post**.
2. Choose an image file in **Ad image or video**.
3. Select **Facebook** as one of the platforms.
4. Click **Publish now**. The app uploads the image through `POST /api/media/upload`, saves the returned `mediaAssetId` on the scheduled post, then calls `POST /api/posts/{id}/publish`.
5. Confirm the publish result says `Facebook Page photo post published successfully`. If Meta returns a permissions or token error, verify the Page access token, Page ID, and app review permissions before retrying.

Other platform adapters remain mocked until their official provider API work is completed.


## How to build and test
npm install
npm run dev



## How to delete the package-lock.json, node_modules folder to build and test

# 1. Complete cleanup
rm -rf node_modules package-lock.json
rm -rf ~/.npm/_logs/*
npm cache clean --force

# 2. Pull latest package.json
git pull

# 3. Fresh install
npm install

# 4. Verify build works
npm run build

# 5. If successful, commit the generated package-lock.json
git add package-lock.json
git commit -m "chore: generate package-lock.json with resolved dependencies"
git push