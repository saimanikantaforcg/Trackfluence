import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { WebhooksService } from "../webhooks/webhooks.service";

export type AttributionModelType =
  | "FIRST_TOUCH"
  | "LAST_TOUCH"
  | "LINEAR"
  | "TIME_DECAY";

export const VALID_ATTRIBUTION_MODELS: AttributionModelType[] = [
  "FIRST_TOUCH",
  "LAST_TOUCH",
  "LINEAR",
  "TIME_DECAY",
];

export function resolveModel(raw?: string): AttributionModelType {
  const upper = (raw ?? "").toUpperCase() as AttributionModelType;
  return VALID_ATTRIBUTION_MODELS.includes(upper) ? upper : "FIRST_TOUCH";
}

@Injectable()
export class RevenueAttributionService {
  private readonly logger = new Logger(RevenueAttributionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
  ) {}

  async calculateAttribution(
    orderId: string,
    rawModel?: string,
    orgId?: string,
  ) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new NotFoundException("Order not found");
    }
    const model = resolveModel(rawModel);

    // Scope order lookup through Customer.organizationId since Order lacks direct orgId
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: {
            touchpoints: {
              orderBy: { timestamp: "asc" },
              include: { creator: true },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException("Order not found");

    // Enforce tenant ownership: verify the order's customer belongs to the current org
    if (order.customer.organizationId !== orgId) {
      throw new NotFoundException("Order not found");
    }

    const touchpoints = order.customer.touchpoints;
    if (touchpoints.length === 0) {
      return { orderId, attributions: [], message: "No touchpoints found" };
    }

    const totalRevenue = Number(order.totalAmount);
    let attributions: {
      touchpointId: string;
      creatorId: string;
      weight: number;
      revenue: number;
    }[];

    switch (model) {
      case "LAST_TOUCH":
        attributions = [
          {
            touchpointId: touchpoints[touchpoints.length - 1].id,
            creatorId: touchpoints[touchpoints.length - 1].creatorId,
            weight: 1.0,
            revenue: totalRevenue,
          },
        ];
        break;

      case "LINEAR": {
        const weight = 1.0 / touchpoints.length;
        attributions = touchpoints.map((tp) => ({
          touchpointId: tp.id,
          creatorId: tp.creatorId,
          weight,
          revenue: totalRevenue * weight,
        }));
        break;
      }

      case "TIME_DECAY": {
        // Assign exponentially decaying weights — more recent touchpoints get more credit.
        // weight[i] ∝ 2^(i / half_life) where half_life = touchpoints.length / 2
        const halfLife = Math.max(touchpoints.length / 2, 1);
        const rawWeights = touchpoints.map((_, i) => Math.pow(2, i / halfLife));
        const total = rawWeights.reduce((s, w) => s + w, 0);
        attributions = touchpoints.map((tp, i) => {
          const w = rawWeights[i] / total;
          return {
            touchpointId: tp.id,
            creatorId: tp.creatorId,
            weight: w,
            revenue: totalRevenue * w,
          };
        });
        break;
      }

      case "FIRST_TOUCH":
      default:
        attributions = [
          {
            touchpointId: touchpoints[0].id,
            creatorId: touchpoints[0].creatorId,
            weight: 1.0,
            revenue: totalRevenue,
          },
        ];
        break;
    }

    // Persist attribution results
    // Note: Attribution model lacks organizationId; tenant ownership is enforced
    // through the order -> customer relationship verified above.
    // TODO (Phase 2): Add organizationId to Attribution model for direct scoping.
    const results = await Promise.all(
      attributions.map((a) =>
        this.prisma.attribution.create({
          data: {
            orderId: order.id,
            customerId: order.customerId,
            creatorId: a.creatorId,
            touchpointId: a.touchpointId,
            model: model as
              | "FIRST_TOUCH"
              | "LAST_TOUCH"
              | "LINEAR"
              | "TIME_DECAY",
            attributedRevenue: a.revenue,
            attributionWeight: a.weight,
          },
        }),
      ),
    );

    void this.webhooks.dispatch(
      "attribution.created",
      {
        orderId,
        model,
        count: results.length,
        totalRevenue,
      },
      orgId,
    );

    return { orderId, model, attributions: results };
  }

  async getOrderAttribution(orderId: string, orgId: string) {
    // Fail closed: require orgId
    if (!orgId) {
      throw new NotFoundException("Attribution not found");
    }

    // Scope through Order -> Customer.organizationId since Attribution lacks direct orgId
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { organizationId: true } } },
    });

    if (!order) throw new NotFoundException("Attribution not found");
    if (order.customer.organizationId !== orgId) {
      throw new NotFoundException("Attribution not found");
    }

    return this.prisma.attribution.findMany({
      where: { orderId },
      include: {
        creator: { select: { id: true, name: true } },
        touchpoint: true,
      },
    });
  }

  async getCreatorAttribution(
    creatorId: string,
    orgId: string,
    dateRange: { from?: Date; to?: Date },
    rawModel?: string,
  ) {
    // Fail closed: require orgId
    if (!orgId) {
      throw new NotFoundException("Creator not found");
    }

    // Enforce tenant ownership: verify the creator belongs to the current org
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { organizationId: true },
    });

    if (!creator) throw new NotFoundException("Creator not found");
    if (creator.organizationId !== orgId) {
      throw new NotFoundException("Creator not found");
    }

    const model = rawModel ? resolveModel(rawModel) : undefined;
    const where: Record<string, unknown> = {
      creatorId,
    };
    if (model) where["model"] = model;
    if (dateRange.from || dateRange.to) {
      where["calculatedAt"] = {
        ...(dateRange.from && { gte: dateRange.from }),
        ...(dateRange.to && { lte: dateRange.to }),
      };
    }

    const attributions = await this.prisma.attribution.findMany({
      where: where as {
        creatorId: string;
        model?: "FIRST_TOUCH" | "LAST_TOUCH" | "LINEAR" | "TIME_DECAY";
        calculatedAt?: { gte?: Date; lte?: Date };
      },
      include: { order: true },
    });

    const totalRevenue = attributions.reduce(
      (sum, a) => sum + Number(a.attributedRevenue),
      0,
    );

    return {
      creatorId,
      totalAttributedRevenue: totalRevenue,
      orderCount: new Set(attributions.map((a) => a.orderId)).size,
      attributions,
    };
  }

  async calculateAttributionAsync(orderId: string, rawModel?: string) {
    // DISABLED for Phase 1A: Async attribution queue path lacks tenant scoping.
    // The synchronous calculateAttribution() handles all current attribution needs
    // with full orgId validation and tenant ownership verification.
    // Re-enable in Phase 2 with orgId parameter and tenant-scoped job processing.
    throw new BadRequestException(
      "Async attribution is disabled pending Phase 2 tenant-scope hardening. Use calculateAttribution() synchronously instead.",
    );
  }
}
