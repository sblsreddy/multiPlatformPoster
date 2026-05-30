# n8n workflow guide

This repository includes stubbed workflow hooks for a phased rollout.

## Phase 1 workflow map

1. Receive scheduled post webhook from the Next.js app.
2. Validate the payload and ensure the post is still in a schedulable state.
3. Wait until the published `scheduled_at` timestamp.
4. Publish to each selected platform using official provider APIs. Facebook Page feed publishing can also be exercised with the scheduled post form's **Publish now** action or by calling the app route `POST /api/posts/{id}/publish`, which records `platform_results`.
5. Update Supabase with `publishing`, `published`, or `failed` state.
6. Retry with exponential backoff for failed posts.
7. Send failure notifications to the configured Slack, email, or pager target.

## Suggested webhook payload

```json
{
  "scheduledPostId": "uuid",
  "campaignId": "uuid",
  "organizationId": "uuid",
  "trigger": "scheduled-post-ready"
}
```

## Minimal n8n node flow

```json
[
  {
    "name": "Webhook",
    "type": "n8n-nodes-base.webhook",
    "parameters": {
      "path": "scheduled-post",
      "httpMethod": "POST",
      "responseMode": "onReceived"
    }
  },
  {
    "name": "Validate payload",
    "type": "n8n-nodes-base.function",
    "parameters": {
      "functionCode": "if (!($json.scheduledPostId || $json.organizationId)) { throw new Error('Missing required payload'); }"
    }
  },
  {
    "name": "Wait until schedule",
    "type": "n8n-nodes-base.wait",
    "parameters": {
      "amount": 0,
      "unit": "seconds"
    }
  },
  {
    "name": "Publish to platforms",
    "type": "n8n-nodes-base.function",
    "parameters": {
      "functionCode": "return [{ json: { status: 'mock-published', scheduledPostId: $json.scheduledPostId } }];"
    }
  },
  {
    "name": "Update Supabase",
    "type": "n8n-nodes-base.supabase",
    "parameters": {
      "operation": "update"
    }
  }
]
```

## Security notes

- Keep all provider tokens in n8n credential storage when n8n owns publishing. For direct server-side Facebook testing, keep `FACEBOOK_PAGE_ACCESS_TOKEN` only in server environment variables.
- A failed or unavailable n8n webhook should not block local direct publishing tests. The app records webhook dispatch failures while keeping the scheduled post available for the direct publisher route.
- Validate signatures in the webhook receiver.
- Use least-privilege Supabase role access and RLS.
- Record every publish attempt and error in `publish_attempts` and `platform_results`.
