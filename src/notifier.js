import { log } from "./logger.js";

const STATE_META = {
  healthy: {
    color: 0x2ecc71,
    title: "RECOVERED",
  },
  down: {
    color: 0xe74c3c,
    title: "DOWN",
  },
};

export class DiscordWebhookNotifier {
  constructor(config) {
    this.config = config;
  }

  async sendAlert({ appName, nextState, result }) {
    const meta = STATE_META[nextState];
    const webhookUrl = new URL(this.config.url);
    webhookUrl.searchParams.set("wait", "true");

    const body = {
      username: this.config.username,
      content: nextState === "down" ? this.config.roleMention || undefined : undefined,
      allowed_mentions: this.config.roleMention ? { parse: ["roles"] } : { parse: [] },
      embeds: [
        {
          title: `${appName} ${meta.title}`,
          color: meta.color,
          fields: [
            {
              name: "URL",
              value: result.url,
            },
            {
              name: "Latency",
              value: `${result.latencyMs}ms`,
              inline: true,
            },
            {
              name: "Details",
              value: result.summary,
            },
          ],
          timestamp: new Date(result.checkedAt).toISOString(),
        },
      ],
    };

    if (this.config.dryRun) {
      log("Dry-run Discord webhook payload", { nextState, body });
      return;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Discord webhook failed with ${response.status}: ${responseBody}`);
    }
  }
}
