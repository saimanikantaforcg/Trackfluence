import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePayoutDto } from "./dto/create-payout.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { WebhooksService } from "../webhooks/webhooks.service";
import { EmailService } from "../email/email.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePayoutDto, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped creation
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required to create a payout",
      );
    }
    return this.prisma.payout.create({
      data: {
        creatorId: dto.creatorId,
        campaignId: dto.campaignId,
        amount: dto.amount,
        currency: dto.currency ?? "USD",
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        notes: dto.notes,
        organizationId: orgId,
      },
      include: { creator: { select: { id: true, name: true, handle: true } } },
    });
  }

  async findAll(
    filters: {
      creatorId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
    orgId?: string,
  ) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      return {
        items: [],
        total: 0,
        page: filters.page ?? 1,
        totalPages: 0,
      };
    }
    const { creatorId, status, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;
    const where = {
      organizationId: orgId,
      ...(creatorId && { creatorId }),
      ...(status && { status: status as any }),
    };
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: Math.min(limit, 200),
        include: {
          creator: {
            select: { id: true, name: true, handle: true, avatarUrl: true },
          },
          campaign: { select: { id: true, name: true } },
        },
      }),
      this.prisma.payout.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async approve(id: string, actorId: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new Error("Organization context required");
    }
    const payout = await this.prisma.payout.findUnique({
      where: { id, organizationId: orgId },
    });
    if (!payout) throw new NotFoundException("Payout not found");
    if (payout.status !== "PENDING")
      throw new ForbiddenException("Only PENDING payouts can be approved");
    const updated = await this.prisma.payout.update({
      where: { id, organizationId: orgId },
      data: { status: "APPROVED", approvedBy: actorId, approvedAt: new Date() },
      include: { creator: { select: { id: true, name: true } } },
    });
    void this.notifications.notify({
      userId: actorId,
      type: "payout.approved",
      title: "Payout Approved",
      body: `Payout of ${updated.currency} ${updated.amount} for ${updated.creator.name} was approved.`,
      link: "/payouts",
    });
    void this.webhooks.dispatch(
      "payout.approved",
      {
        id: updated.id,
        creatorId: updated.creatorId,
        amount: String(updated.amount),
        currency: updated.currency,
      },
      orgId,
    );
    // Email the creator if they have an address
    void this.prisma.creator
      .findUnique({ where: { id: updated.creatorId }, select: { email: true } })
      .then((c) => {
        if (c?.email) {
          const portalUrl =
            this.config.get<string>("APP_URL", "http://localhost:3000") +
            "/portal";
          void this.email.sendPayoutApproved(
            c.email,
            updated.creator.name,
            String(updated.amount),
            updated.currency,
            portalUrl,
          );
        }
      });
    return updated;
  }

  async markPaid(id: string, actorId: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new Error("Organization context required");
    }
    const payout = await this.prisma.payout.findUnique({
      where: { id, organizationId: orgId },
    });
    if (!payout) throw new NotFoundException("Payout not found");
    if (payout.status !== "APPROVED")
      throw new ForbiddenException(
        "Only APPROVED payouts can be marked as paid",
      );
    const paid = await this.prisma.payout.update({
      where: { id, organizationId: orgId },
      data: { status: "PAID", paidAt: new Date() },
      include: { creator: { select: { id: true, name: true } } },
    });
    void this.notifications.notify({
      userId: actorId,
      type: "payout.paid",
      title: "Payout Sent",
      body: `${paid.currency} ${paid.amount} marked as paid to ${paid.creator.name}.`,
      link: "/payouts",
    });
    void this.webhooks.dispatch(
      "payout.paid",
      {
        id: paid.id,
        creatorId: paid.creatorId,
        amount: String(paid.amount),
        currency: paid.currency,
      },
      orgId,
    );
    // Email the creator if they have an address
    void this.prisma.creator
      .findUnique({ where: { id: paid.creatorId }, select: { email: true } })
      .then((c) => {
        if (c?.email) {
          const portalUrl =
            this.config.get<string>("APP_URL", "http://localhost:3000") +
            "/portal";
          void this.email.sendPayoutPaid(
            c.email,
            paid.creator.name,
            String(paid.amount),
            paid.currency,
            portalUrl,
          );
        }
      });
    return paid;
  }

  async cancel(id: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new Error("Organization context required");
    }
    const payout = await this.prisma.payout.findUnique({
      where: { id, organizationId: orgId },
    });
    if (!payout) throw new NotFoundException("Payout not found");
    if (payout.status === "PAID")
      throw new ForbiddenException("Cannot cancel a paid payout");
    return this.prisma.payout.update({
      where: { id, organizationId: orgId },
      data: { status: "CANCELLED" },
    });
  }

  /** Bulk approve a list of PENDING payout IDs (skips non-PENDING silently) */
  async bulkApprove(
    ids: string[],
    actorId: string,
    orgId?: string,
  ): Promise<{ approved: number; skipped: number }> {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      return { approved: 0, skipped: ids.length };
    }
    const payouts = await this.prisma.payout.findMany({
      where: {
        id: { in: ids },
        status: "PENDING",
        organizationId: orgId,
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    const approvedAt = new Date();
    await this.prisma.payout.updateMany({
      where: { id: { in: payouts.map((p) => p.id) } },
      data: { status: "APPROVED", approvedBy: actorId, approvedAt },
    });

    // Fire webhooks + notifications async, don't block response
    for (const p of payouts) {
      void this.webhooks.dispatch(
        "payout.approved",
        {
          id: p.id,
          creatorId: p.creatorId,
          amount: String(p.amount),
          currency: p.currency,
        },
        orgId,
      );
    }

    return { approved: payouts.length, skipped: ids.length - payouts.length };
  }

  /** Calculate estimated commission based on attributed revenue × creator commissionRate */
  async calculateForCreator(
    creatorId: string,
    periodStart: Date,
    periodEnd: Date,
    orgId?: string,
  ) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new Error("Organization context required");
    }
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId, organizationId: orgId },
    });
    if (!creator) throw new NotFoundException("Creator not found");

    const attributions = await this.prisma.attribution.findMany({
      where: {
        creatorId,
        organizationId: orgId,
        calculatedAt: { gte: periodStart, lte: periodEnd },
        attributedRevenue: { not: undefined },
      },
    });

    const totalRevenue = attributions.reduce(
      (sum, a) => sum + Number(a.attributedRevenue ?? 0),
      0,
    );
    const rate = Number(creator.commissionRate ?? 0);
    const commission = totalRevenue * rate;

    return {
      creatorId,
      creatorName: creator.name,
      periodStart,
      periodEnd,
      totalRevenue,
      commissionRate: rate,
      estimatedCommission: commission,
      attributionCount: attributions.length,
    };
  }
}
