export interface NotificationPayload {
  level: "info" | "warning" | "critical";
  message: string;
  details?: unknown;
}

export class Notifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.webhookUrl) {
      console.error("[Notifier] No webhook URL configured, skipping notification");
      return false;
    }

    const slackPayload = this.formatSlackMessage(payload);

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload),
      });

      return response.ok;
    } catch (error) {
      console.error("[Notifier] Failed to send notification:", error);
      return false;
    }
  }

  private formatSlackMessage(payload: NotificationPayload): Record<string, unknown> {
    const emoji = {
      info: ":information_source:",
      warning: ":warning:",
      critical: ":rotating_light:",
    };

    return {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji[payload.level]} Deploy Guardian Alert`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: payload.message,
          },
        },
        ...(payload.details
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `\`\`\`${JSON.stringify(payload.details, null, 2)}\`\`\``,
                },
              },
            ]
          : []),
      ],
    };
  }
}
