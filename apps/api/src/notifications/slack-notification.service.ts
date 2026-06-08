import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: Array<{ type: string; text: string }>;
}

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a notification to an org's configured Slack and/or Discord webhooks.
   * Fire-and-forget safe — all errors are swallowed.
   */
  async notify(orgId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { slackWebhookUrl: true, discordWebhookUrl: true, name: true },
      });
      if (!org) return;

      const promises: Promise<void>[] = [];
      if (org.slackWebhookUrl) promises.push(this.sendSlack(org.slackWebhookUrl, event, payload, org.name));
      if (org.discordWebhookUrl) promises.push(this.sendDiscord(org.discordWebhookUrl, event, payload, org.name));
      await Promise.allSettled(promises);
    } catch (err) {
      this.logger.warn(`Failed to send org notification for ${orgId}: ${String(err)}`);
    }
  }

  private async sendSlack(
    webhookUrl: string,
    event: string,
    payload: Record<string, unknown>,
    orgName: string,
  ): Promise<void> {
    const fields = Object.entries(payload)
      .slice(0, 8)
      .map(([k, v]) => ({ type: 'mrkdwn', text: `*${k}*\n${String(v)}` }));

    const blocks: SlackBlock[] = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*[${orgName}]* 🔔 \`${event}\`` },
      },
      ...(fields.length
        ? [{ type: 'section', fields }]
        : []),
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `_Sent by Trackfluence at ${new Date().toUTCString()}_` },
      },
    ];

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    if (!res.ok) this.logger.warn(`Slack webhook returned ${res.status}`);
  }

  private async sendDiscord(
    webhookUrl: string,
    event: string,
    payload: Record<string, unknown>,
    orgName: string,
  ): Promise<void> {
    const description = Object.entries(payload)
      .slice(0, 8)
      .map(([k, v]) => `**${k}**: ${String(v)}`)
      .join('\n');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `[${orgName}] ${event}`,
            description: description || '*(no payload)*',
            color: 0x6366f1, // indigo
            footer: { text: `Trackfluence • ${new Date().toUTCString()}` },
          },
        ],
      }),
    });
    if (!res.ok) this.logger.warn(`Discord webhook returned ${res.status}`);
  }
}
