# Production checklist

## Security
- [ ] Enable Supabase Auth and configure email/OTP providers.
- [ ] Review RLS policies in `supabase/migrations/20260525_initial_schema.sql`.
- [ ] Store only encrypted provider tokens in Supabase.
- [ ] Validate n8n webhook signatures and rate limit requests.
- [ ] Rotate `N8N_WEBHOOK_SECRET` and Supabase keys regularly.

## Operations
- [ ] Configure environment variables in Vercel and Supabase.
- [ ] Set up GitHub Actions secrets for deployment.
- [ ] Add observability for webhook failures and publish attempt errors.
- [ ] Implement alerting for repeated failed publish attempts.

## Deployment
- [ ] Test production build with `npm run build`.
- [ ] Confirm `NEXT_PUBLIC_APP_URL` matches production HTTPS domain.
- [ ] Configure storage buckets and upload policies.
- [ ] Prepare a rollback plan for n8n workflow changes.
