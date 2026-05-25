# Future roadmap

## Phase 1
- Wire Supabase Auth login flow.
- Connect the Next.js app to the Supabase schema and n8n webhook endpoints.
- Add audit logging and failure telemetry.

## Phase 2
- Build production-grade campaign, post, and settings pages.
- Add real image/video upload flows with signed storage URLs.
- Add webhook signature verification and rate limiting.

## Phase 3
- Replace critical n8n workflows with serverless code.
- Extract provider-specific behavior behind adapter interfaces.
- Move retry orchestration into a durable queue or background worker.
