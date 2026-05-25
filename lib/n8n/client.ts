export interface N8nWebhookPayload {
  scheduledPostId: string;
  campaignId?: string;
  organizationId?: string;
  trigger: "scheduled-post-ready";
}

export interface N8nWebhookResponse {
  accepted: boolean;
  message: string;
  webhookUrl?: string;
}

export async function triggerScheduledWebhook(payload: N8nWebhookPayload): Promise<N8nWebhookResponse> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      accepted: false,
      message: "N8N_WEBHOOK_URL is not configured. Configure the webhook URL to enable dispatch.",
      webhookUrl,
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        accepted: false,
        message: `Webhook returned HTTP ${response.status}`,
        webhookUrl,
      };
    }

    return {
      accepted: true,
      message: "Webhook dispatch succeeded.",
      webhookUrl,
    };
  } catch (error) {
    return {
      accepted: false,
      message: error instanceof Error ? error.message : "Unknown webhook dispatch error",
      webhookUrl,
    };
  }
}
