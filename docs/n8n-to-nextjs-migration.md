# n8n to Next.js + Supabase + Vercel Cron migration

The requested `saltllc-workflows` folder was not present in this repository at implementation time, so this plan maps the existing documented n8n scheduled-post workflow to production code without adding any n8n runtime dependency.

## Extracted workflow logic

1. **Trigger logic**: a scheduled post is created through `POST /api/posts`; Vercel Cron calls `GET /api/cron/publish-due` every five minutes.
2. **Input payload fields**: `title`, `message`, `location`, `timezone`, `scheduledAt`, `selectedPlatforms`, optional `mediaAssetId`, optional `campaignId`, and optional legacy `dispatchWebhook` (stored only for migration auditing).
3. **Scheduling logic**: posts remain `scheduled` until `scheduled_at <= now()`. Failed posts become `retrying` with `next_retry_at`.
4. **API calls**: publishing goes through platform adapters only. Facebook uses the official Meta Graph API; other adapters remain mock implementations until official provider integrations are configured.
5. **Retry rules**: maximum three publish attempts with exponential backoff of 60, 120, then 240 seconds.
6. **Error handling**: each attempt writes `publish_attempts`, per-platform rows in `platform_results`, `last_error`, and an audit-style `webhook_events` row for cron or notification failures.
7. **Database updates**: scheduled posts transition through `scheduled` → `publishing` → `published`, `retrying`, or `failed`.
8. **Notification steps**: production-ready schema includes `notification_events`; the current implementation records failure notifications as audit events so Slack/email/pager providers can be attached without secrets in source code.

## Generated implementation

- Supabase schema: `supabase/migrations/20260525_initial_schema.sql`
- Next.js API routes: `app/api/posts/route.ts`, `app/api/posts/[id]/publish/route.ts`
- Vercel Cron endpoint: `app/api/cron/publish-due/route.ts`
- Platform adapter interfaces: `lib/platforms/types.ts`
- Mock publisher implementation: `lib/platforms/mock.ts`
- Shared publisher: `lib/publisher/scheduled-posts.ts`
- Vercel schedule: `vercel.json`

## Migration steps

1. Export n8n workflow JSON and compare each node to the extraction checklist above.
2. Apply the Supabase migration and verify `next_retry_at` and `notification_events` exist.
3. Set `CRON_SECRET`, `CRON_PUBLISH_BATCH_SIZE`, Supabase server variables, and official provider API credentials in Vercel.
4. Deploy to Vercel; confirm `vercel.json` registers `/api/cron/publish-due`.
5. Create a canary scheduled post with mock adapters enabled for non-Meta platforms.
6. Validate `publish_attempts`, `platform_results`, `webhook_events`, and `notification_events` rows.
7. Disable the n8n scheduled-post webhook after cron publishing is verified.
8. Replace each mock adapter with the corresponding official provider API implementation.
