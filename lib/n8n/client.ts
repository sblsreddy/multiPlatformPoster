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

const DEFAULT_WEBHOOK_TIMEOUT_MS = 1500;

function getWebhookTimeoutMs() {
  const configuredTimeout = Number(process.env.WEBHOOK_DISPATCH_TIMEOUT_MS);

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return configuredTimeout;
  }

  return DEFAULT_WEBHOOK_TIMEOUT_MS;
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

  const controller = new AbortController();
  const timeoutMs = getWebhookTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
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
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `Webhook timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "Unknown webhook dispatch error";

    return {
      accepted: false,
      message,
      webhookUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}
