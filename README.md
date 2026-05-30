# MultiPlatformPoster

A production-oriented, responsive Next.js admin dashboard for phased social media post scheduling.

## What is included

- Next.js App Router with Tailwind CSS
- Supabase schema and RLS policy skeleton under `supabase/migrations`
- Responsive admin dashboard shell for mobile, tablet, and laptop
- Clean platform adapter interfaces for Meta, LinkedIn, TikTok, and X
- Real Facebook Page feed publishing adapter plus mock adapters for remaining platforms
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

Facebook Page feed publishing is wired through the server-side Meta adapter. Set `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_ACCESS_TOKEN` with a Page access token that has Page publishing permissions. The scheduled post form's **Publish now** action saves the post without dispatching n8n and then calls the direct server-side publisher. Other platform adapters remain mocked until their official provider API work is completed.


## How to build and test
npm install
npm run dev
