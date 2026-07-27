import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWebhookDto } from "./dto/create-webhook.dto";
import { createHmac, randomBytes } from "crypto";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(WebhooksService.name) private readonly log: PinoLogger,
  ) {}

  async create(dto: CreateWebhookDto, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped creation
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required to create a webhook",
      );
    }
    const secret = randomBytes(24).toString("hex");
    return this.prisma.webhook.create({
      data: {
        url: dto.url,
        secret,
        description: dto.description,
        events: dto.events ?? [],
        organizationId: orgId,
      },
      select: {
        id: true,
        url: true,
        secret: true,
        events: true,
        status: true,
        description: true,
        createdAt: true,
      },
    });
  }

  async list(orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      return [];
    }
    return this.prisma.webhook.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
        description: true,
        createdAt: true,
      },
    });
  }

  async toggle(id: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new NotFoundException("Webhook not found");
    }
    const wh = await this.prisma.webhook.findUnique({
      where: { id, organizationId: orgId },
    });
    if (!wh) throw new NotFoundException("Webhook not found");
    const next = wh.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    return this.prisma.webhook.update({
      where: { id, organizationId: orgId },
      data: { status: next },
    });
  }

  async remove(id: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new NotFoundException("Webhook not found");
    }
    // Verify ownership before delete
    const wh = await this.prisma.webhook.findUnique({
      where: { id, organizationId: orgId },
    });
    if (!wh) throw new NotFoundException("Webhook not found");
    await this.prisma.webhook.delete({ where: { id } });
    return { deleted: true };
  }

  async listDeliveries(webhookId: string, limit = 50, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      throw new NotFoundException("Webhook not found");
    }
    // Verify webhook belongs to org before listing deliveries
    const wh = await this.prisma.webhook.findUnique({
      where: { id: webhookId, organizationId: orgId },
    });
    if (!wh) throw new NotFoundException("Webhook not found");

    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { attemptedAt: "desc" },
      take: Math.min(limit, 200),
    });
  }

  /**
   * Dispatch an event to all matching active webhooks.
   * Fire-and-forget — never throws.
   */
  async dispatch(
    event: string,
    payload: Record<string, unknown>,
    orgId?: string,
  ): Promise<void> {
    try {
      const hooks = await this.prisma.webhook.findMany({
        where: {
          status: "ACTIVE",
          ...(orgId ? { organizationId: orgId } : {}),
          OR: [
            { events: { isEmpty: true } }, // subscribed to all events
            { events: { has: event } },
          ],
        },
      });

      await Promise.allSettled(
        hooks.map((hook) =>
          this.deliver(hook, event, payload, hook.organizationId ?? undefined),
        ),
      );
    } catch (err) {
      this.log.warn({ err }, "webhook dispatch failed");
    }
  }

  private async deliver(
    hook: {
      id: string;
      url: string;
      secret: string;
      organizationId: string | null;
    },
    event: string,
    payload: Record<string, unknown>,
    orgId?: string,
  ) {
    const body = JSON.stringify({
      event,
      payload,
      timestamp: new Date().toISOString(),
    });
    const sig = createHmac("sha256", hook.secret)
      .update(body)
      .digest("hex");

    let responseStatus: number | undefined;
    let responseBody: string | undefined;
    let success = false;

    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trackfluence-Signature": `sha256=${sig}`,
          "X-Trackfluence-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      responseStatus = res.status;
      responseBody = (await res.text()).slice(0, 500);
      success = res.ok;
    } catch (err) {
      responseBody = err instanceof Error ? err.message : String(err);
    }

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId: hook.id,
        event,
        payload: payload as object,
        responseStatus,
        responseBody,
        success,
      },
    });
  }

  /**
   * Retry a failed delivery using its original payload and the parent webhook's
   * current secret. Records a fresh WebhookDelivery row.
   */
  async retryDelivery(
    deliveryId: string,
    orgId?: string,
  ): Promise<{ success: boolean }> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });
    if (!delivery) throw new NotFoundException("Delivery not found");
    // Verify the parent webhook belongs to the org
    if (orgId && delivery.webhook.organizationId !== orgId) {
      throw new NotFoundException("Delivery not found");
    }
    if (delivery.success) return { success: true }; // already succeeded, nothing to do

    await this.deliver(
      {
        id: delivery.webhook.id,
        url: delivery.webhook.url,
        secret: delivery.webhook.secret,
        organizationId: delivery.webhook.organizationId,
      },
      delivery.event,
      delivery.payload as Record<string, unknown>,
      delivery.webhook.organizationId ?? undefined,
    );
    return { success: true };
  }
}
